let wasmModule;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const startBtn = document.getElementById('startBtn');
const appDiv = document.getElementById('app');
const logDiv = document.getElementById('log');

const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
};

startBtn.addEventListener('click', async () => {
    startBtn.innerText = "読み込み中...";
    try {
        wasmModule = await createModule();
        await startCamera();
        startBtn.style.display = 'none';
        appDiv.style.display = 'block';
    } catch (err) {
        alert("初期化エラー: " + err.message);
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

        // 描画ドロップを防ぐため、直接 imageData.data を上書きする
        const resultPixels = new Uint8ClampedArray(wasmModule.HEAPU8.buffer, bufferPtr, numBytes);
        imageData.data.set(resultPixels);
        ctx.putImageData(imageData, 0, 0);

        wasmModule._free(bufferPtr);
        
        // 正常に処理できたらエラーログを消去
        logDiv.innerText = "";
    } catch (err) {
        logDiv.innerText = "Wasmエラー: " + err.message;
        console.error(err);
        return;
    }

    requestAnimationFrame(render);
}