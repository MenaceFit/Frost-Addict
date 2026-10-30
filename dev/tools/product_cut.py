"""Cut out product photos (rembg) and keep only the main object.

Usage: python3 dev/tools/product_cut.py SRC_DIR OUT_DIR [UPSCALE]
UPSCALE (default 1) enlarges small crops before segmentation (3 for thumbnails).
With UPSCALE != 1, near-white scraps touching the bottom edge (neighbouring items in a
grid photo) are removed. Output: 1600 x 1600 transparent PNGs, object centred.
"""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
from rembg import remove, new_session
src, dst = sys.argv[1], sys.argv[2]
up = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
os.makedirs(dst, exist_ok=True)
sess = new_session('isnet-general-use')
for n in sorted(os.listdir(src)):
    img = Image.open(os.path.join(src, n)).convert('RGB')
    if up != 1: img = img.resize((int(img.width*up), int(img.height*up)), Image.LANCZOS)
    cut = remove(img, session=sess, post_process_mask=True)
    a = np.asarray(cut.split()[3])
    lab, k = ndimage.label(a > 40)
    if k > 1:
        sizes = ndimage.sum(np.ones_like(a), lab, range(1, k+1))
        keep = lab == (np.argmax(sizes)+1)
        keep = ndimage.binary_dilation(keep, iterations=3)
        cut.putalpha(Image.fromarray((a*keep).astype('uint8')))
    if up != 1:
        rgb = np.asarray(cut.convert('RGB')).astype(int); al = np.asarray(cut.split()[3]).copy()
        wh = (rgb.min(axis=2) > 200) & (al > 0)
        lab2, k2 = ndimage.label(ndimage.binary_dilation(wh, iterations=2))
        ys = np.where(al.max(axis=1) > 40)[0]; band = ys.max() - (ys.max()-ys.min())*0.1
        for i, sl in enumerate(ndimage.find_objects(lab2)):
            if sl[0].stop > band: al[(lab2 == i+1)] = 0
        cut.putalpha(Image.fromarray(al))
    cut = cut.crop(cut.getbbox())
    side = int(max(cut.size)*1.1)
    c = Image.new('RGBA', (side, side), (0,0,0,0)); c.paste(cut, ((side-cut.width)//2, (side-cut.height)//2), cut)
    c = c.resize((1600,1600), Image.LANCZOS)
    c.save(os.path.join(dst, os.path.splitext(n)[0]+'.png'), optimize=True); print('ok', n, cut.size)
