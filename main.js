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

        wasmModule._processImage(
            bufferPtr, canvas.width, canvas.height,
            target.r, target.g, target.b,
            replace.r, replace.g, replace.b,
            tolerance
        );

        const resultPixels = new Uint8ClampedArray(wasmModule.HEAPU8.buffer, bufferPtr, numBytes);
        const resultImageData = new ImageData(resultPixels, canvas.width, canvas.height);
        ctx.putImageData(resultImageData, 0, 0);

        wasmModule._free(bufferPtr);
    } catch (err) {
        console.error("レンダリング中にエラー:", err);
    }

    requestAnimationFrame(render);
}