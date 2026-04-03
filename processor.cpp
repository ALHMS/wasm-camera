#include <emscripten.h>

extern "C" {
    EMSCRIPTEN_KEEPALIVE
    void processImage(unsigned char* data, int width, int height, 
                      int targetR, int targetG, int targetB, 
                      int replaceR, int replaceG, int replaceB, 
                      int tolerance) {
        
        int size = width * height * 4;

        for (int i = 0; i < size; i += 4) {
            // ピクセルのX座標（横の位置）を計算
            int x = (i / 4) % width;

            // 画面の左半分 (x < width / 2) なら、強制的に青色にする
            if (x < width / 2) {
                data[i]     = 0;   // R
                data[i + 1] = 0;   // G
                data[i + 2] = 255; // B (真っ青)
            }
        }
    }
}