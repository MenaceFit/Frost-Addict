"""Remove the background from YOUR OWN product photos and centre them on a transparent canvas.

Usage: python3 dev/tools/remove_bg.py input_dir output_dir [--size 1600]
Outputs square transparent PNGs, trimmed and padded, ready for the
"Photo produit détourée" settings (hero 3D, category cards) or product media.
"""
import argparse, os
from PIL import Image
from rembg import remove, new_session

p = argparse.ArgumentParser()
p.add_argument("src"); p.add_argument("dst"); p.add_argument("--size", type=int, default=1600)
p.add_argument("--model", default="isnet-general-use")
a = p.parse_args()
os.makedirs(a.dst, exist_ok=True)
session = new_session(a.model)
for name in sorted(os.listdir(a.src)):
    if not name.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        continue
    img = Image.open(os.path.join(a.src, name)).convert("RGB")
    cut = remove(img, session=session, post_process_mask=True)
    box = cut.getbbox()
    if box:
        cut = cut.crop(box)
    side = int(max(cut.size) * 1.12)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cut, ((side - cut.width) // 2, (side - cut.height) // 2), cut)
    canvas = canvas.resize((a.size, a.size), Image.LANCZOS)
    out = os.path.join(a.dst, os.path.splitext(name)[0] + ".png")
    canvas.save(out, optimize=True)
    print("ok", out)
