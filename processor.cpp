#include <emscripten.h>
#include <cmath>

extern "C" {
    // JSから呼び出すメイン関数
    EMSCRIPTEN_KEEPALIVE
    void processImage(unsigned char* data, int width, int height, 
                      int targetR, int targetG, int targetB, 
                      int replaceR, int replaceG, int replaceB, 
                      int tolerance) {
        
        int size = width * height * 4; // RGBAなので4倍

        for (int i = 0; i < size; i += 4) {
            int r = data[i];
            int g = data[i + 1];
            int b = data[i + 2];

            // 指定色との距離を計算（単純な絶対値差）
            if (std::abs(r - targetR) < tolerance && 
                std::abs(g - targetG) < tolerance && 
                std::abs(b - targetB) < tolerance) {
                
                // 色を置換
                data[i]     = (unsigned char)replaceR;
                data[i + 1] = (unsigned char)replaceG;
                data[i + 2] = (unsigned char)replaceB;
            }
        }
    }
}