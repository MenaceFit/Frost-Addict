"""Product on the ice podium (portrait background), 1600 x 2000.
Usage: podium_visual.py BG CUT_DIR OUT_DIR [sneaker,keys] [only,these,keys]"""
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
bg_path, cut_dir, out_dir = sys.argv[1:4]
SNEAK = set(sys.argv[4].split(',')) if len(sys.argv) > 4 and sys.argv[4] else set()
ONLY = set(sys.argv[5].split(',')) if len(sys.argv) > 5 else None
os.makedirs(out_dir, exist_ok=True)
bg = Image.open(bg_path).convert('RGB')               # 2:3, podium top ~62.8 %, centre x ~51.4 %
W, H = 1600, 2000
s = W / bg.width; bgs = bg.resize((W, round(bg.height * s)), Image.LANCZOS)
y0 = round(bgs.height * 0.628 - H * 0.64)             # put the podium top at 64 % of the frame
y0 = max(0, min(y0, bgs.height - H)); base = bgs.crop((0, y0, W, y0 + H))
top_y = round(bgs.height * 0.628) - y0; cx = round(W * 0.514)
for f in sorted(os.listdir(cut_dir)):
    k = f[:-4]
    if ONLY and k not in ONLY: continue
    cut = Image.open(os.path.join(cut_dir, f)).convert('RGBA'); cut = cut.crop(cut.getbbox())
    snk = k in SNEAK
    maxw, maxh = (W * 0.62, H * 0.36) if snk else (W * 0.50, H * 0.50)
    sc = min(maxw / cut.width, maxh / cut.height); c = cut.resize((round(cut.width * sc), round(cut.height * sc)), Image.LANCZOS)
    # soft cool tint so the piece sits in the same light as the scene
    rgb = ImageEnhance.Color(c.convert('RGB')).enhance(0.97); c = Image.merge('RGBA', (*rgb.split(), c.getchannel('A')))
    im = base.copy(); x = cx - c.width // 2; foot = top_y + (14 if snk else 8); y = foot - c.height
    sh = Image.new('L', (W, H), 0); d = ImageDraw.Draw(sh)
    d.ellipse((x + c.width * .08, foot - 22, x + c.width * .92, foot + 26), fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(20)); im.paste(Image.new('RGB', (W, H), (40, 70, 100)), (0, 0), sh)
    tight = Image.new('L', (W, H), 0); ImageDraw.Draw(tight).ellipse((x + c.width * .2, foot - 8, x + c.width * .8, foot + 10), fill=120)
    im.paste(Image.new('RGB', (W, H), (20, 40, 60)), (0, 0), tight.filter(ImageFilter.GaussianBlur(7)))
    im.paste(c, (x, y), c)
    im.save(os.path.join(out_dir, f'{k}-1-podium.jpg'), quality=88, optimize=True, progressive=True)
    print('ok', k)
