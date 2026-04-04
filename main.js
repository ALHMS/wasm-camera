let wasmModule;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startBtn = document.getElementById('startBtn');
const appDiv = document.getElementById('app');

const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
};

// ボタンを押したときに処理を開始
startBtn.addEventListener('click', async () => {
    startBtn.innerText = "読み込み中...";
    try {
        // 1. Wasmの初期化を待つ
        wasmModule = await createModule();
        // 2. カメラを起動
        await startCamera();
        
        // 成功したらボタンを消してアプリ画面を出す
        startBtn.style.display = 'none';
        appDiv.style.display = 'block';
    } catch (err) {
        // エラーが起きたらスマホ画面に表示！
        alert("エラーが発生しました: " + err.message);
    }
});

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = stream;
    
    video.onloadedmetadata = () => {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        render();
    };
}

function render() {
    // 映像が停止中の場合はスキップ（これが固まるのを防ぐ）
    if (video.paused || video.ended) {
        requestAnimationFrame(render);
        return;
    }

    try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        const numBytes = pixels.length;
        const bufferPtr = wasmModule._malloc(numBytes);
        wasmModule.HEAPU8.set(pixels, bufferPtr);

        const target = hexToRgb(document.getElementById('targetColor').value);
        const replace = hexToRgb(document.getElementById('replaceColor').value);
        const tolerance = parseInt(document.getElementById('tolerance').value);

        // 4. C++関数を実行
        wasmModule._processImage(
            bufferPtr, canvas.width, canvas.height,
            target.r, target.g, target.b,
            replace.r, replace.g, replace.b,
            tolerance
        );

        // --- ここから下を変更 ---

        // 5. 処理後のデータをWasmのメモリから取得
        const resultPixels = new Uint8ClampedArray(wasmModule.HEAPU8.buffer, bufferPtr, numBytes);
        
        // 6. 既存の imageData（ステップ2で取得したもの）の中身を、Wasmの結果で直接上書きする！
        imageData.data.set(resultPixels);
        
        // 7. 画面に描画
        ctx.putImageData(imageData, 0, 0);

        // 8. メモリ解放（描画用データにコピーし終わったので、Wasm側のメモリを安全に消せる）
        wasmModule._free(bufferPtr);
    } catch (err) {
        // 画面の赤い文字エリアにエラーを表示する
        document.getElementById('log').innerText = "Wasmエラー: " + err.message;
        console.error(err);
        return; // エラーが起きたらループを止める
    }

    requestAnimationFrame(render);
}