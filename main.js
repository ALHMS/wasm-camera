let wasmModule;
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

// 色（#ffffff形式）をRGB数値に変換するヘルパー
const hexToRgb = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
};

// Wasmの起動とカメラ開始
createModule().then(Module => {
    wasmModule = Module;
    startCamera();
});

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        render();
    };
}

function render() {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Canvasからピクセルデータを取得
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data; // Uint8ClampedArray

    // --- Wasm処理の核心部 ---
    // 1. Wasm側のメモリに領域を確保
    const numBytes = pixels.length;
    const bufferPtr = wasmModule._malloc(numBytes);

    // 2. JSのデータをWasmメモリにコピー
    wasmModule.HEAPU8.set(pixels, bufferPtr);

    // 3. UIから現在の設定値を取得
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

    // 5. 処理後のデータをWasmメモリからJS側に戻す
    const resultPixels = new Uint8ClampedArray(wasmModule.HEAPU8.buffer, bufferPtr, numBytes);
    
    // 6. 画面に描画
    const resultImageData = new ImageData(resultPixels, canvas.width, canvas.height);
    ctx.putImageData(resultImageData, 0, 0);

    // 7. メモリ解放（忘れるとブラウザが落ちます）
    wasmModule._free(bufferPtr);

    requestAnimationFrame(render);
}