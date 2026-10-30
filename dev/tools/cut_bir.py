"""Cutout with BiRefNet (rembg): mask computed at <=1600 px, applied at full resolution.
Usage: cut_bir.py SRC_DIR OUT_DIR [OUT_SIZE]"""
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage
from rembg import remove, new_session
src, dst = sys.argv[1], sys.argv[2]; N = int(sys.argv[3]) if len(sys.argv) > 3 else 2400
os.makedirs(dst, exist_ok=True); sess = new_session('birefnet-general-lite')
for n in sorted(os.listdir(src)):
    im = Image.open(os.path.join(src, n)).convert('RGB'); sm = im.copy(); sm.thumbnail((1600, 1600))
    m = remove(sm, session=sess, only_mask=True).convert('L').resize(im.size, Image.LANCZOS)
    a = np.asarray(m); lab, k = ndimage.label(a > 60)
    if k > 1:
        sizes = ndimage.sum(np.ones_like(a), lab, range(1, k + 1)); keep = ndimage.binary_dilation(lab == np.argmax(sizes) + 1, iterations=4)
        m = Image.fromarray((a * keep).astype('uint8'))
    im.putalpha(m); im = im.crop(im.getbbox())
    side = int(max(im.size) * 1.06); c = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    c.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    c.resize((N, N), Image.LANCZOS).save(os.path.join(dst, os.path.splitext(n)[0] + '.png'), optimize=True); print('ok', n, im.size)
