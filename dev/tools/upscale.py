"""x4 upscale with Real-ESRGAN x4plus (ONNX), tiled. Usage: upscale.py MODEL IN OUT [tile]"""
import sys, time, numpy as np, onnxruntime as ort
from PIL import Image
model, src, dst = sys.argv[1:4]; T = int(sys.argv[4]) if len(sys.argv) > 4 else 128; P = 12
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(model, so, providers=['CPUExecutionProvider'])
im = Image.open(src); alpha = im.getchannel('A') if im.mode == 'RGBA' else None
x = np.asarray(im.convert('RGB'), np.float32) / 255.0; H, W, _ = x.shape
out = np.zeros((H*4, W*4, 3), np.float32); t0 = time.time()
for y0 in range(0, H, T):
    for x0 in range(0, W, T):
        y1, x1 = min(y0+T, H), min(x0+T, W)
        ya, xa, yb, xb = max(y0-P, 0), max(x0-P, 0), min(y1+P, H), min(x1+P, W)
        tile = x[ya:yb, xa:xb].transpose(2, 0, 1)[None]
        r = sess.run(None, {'x': tile})[0][0].transpose(1, 2, 0)
        out[y0*4:y1*4, x0*4:x1*4] = r[(y0-ya)*4:(y0-ya)*4+(y1-y0)*4, (x0-xa)*4:(x0-xa)*4+(x1-x0)*4]
res = Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8))
if alpha is not None: res.putalpha(alpha.resize(res.size, Image.LANCZOS))
res.save(dst); print('ok', src.split('/')[-1], (W, H), '->', res.size, f'{time.time()-t0:.0f}s')
