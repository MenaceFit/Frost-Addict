"""Build the two product visuals from a cutout: a studio shot (light grey, contact shadow)
and the FROST box in the winter sky (renders from dev/renders, sky set).

Usage: python3 dev/tools/product_visuals.py WORK_DIR [sneaker-key,sneaker-key,...]
WORK_DIR/cut/*.png (from product_cut.py) -> WORK_DIR/out/<key>-1-studio.jpg, <key>-2-frost.jpg
Keys listed as sneakers use the wide framing and the sneaker box scene.
"""
import os, sys
from PIL import Image, ImageFilter, ImageDraw
P = sys.argv[1]
R = os.path.join(os.path.dirname(__file__), '..', 'renders', 'out', 'final4')
os.makedirs(P + '/out', exist_ok=True)
SNEAK = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else set()
for f in sorted(os.listdir(P+'/cut')):
    k=f[:-4]; cut=Image.open(P+'/cut/'+f); cut=cut.crop(cut.getbbox())
    sneaker=k in SNEAK
    # 1) studio: 1600x2000 (4:5), soft grey gradient, contact shadow
    W,H=1600,2000
    bg=Image.new('RGB',(W,H),'#F2F4F6'); g=Image.linear_gradient('L').resize((W,H))
    bg=Image.composite(Image.new('RGB',(W,H),'#E4E8EC'),bg,g.point(lambda v:int(v*0.6)))
    maxw, maxh = (1300, 1050) if sneaker else (1080, 1450)
    sc=min(maxw/cut.width, maxh/cut.height); c=cut.resize((int(cut.width*sc),int(cut.height*sc)),Image.LANCZOS)
    x=(W-c.width)//2; base=int(H*0.80) if sneaker else int(H*0.88); y=base-c.height
    sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).ellipse((x+c.width*0.08,base-26,x+c.width*0.92,base+26),fill=120)
    sh=sh.filter(ImageFilter.GaussianBlur(26)); bg.paste(Image.new('RGB',(W,H),'#5d6670'),(0,0),sh)
    bg.paste(c,(x,y),c); bg.save(f'{P}/out/{k}-1-studio.jpg',quality=88,optimize=True,progressive=True)
    # 2) FROST sky box, 1600x2000
    sky=Image.open(f'{R}/fd3d-s-cat-{"sneakers" if sneaker else "doudounes"}.jpg').convert('RGB').resize((W,H),Image.LANCZOS)
    top=int(686*1.6); cx=int(517*1.6)
    maxw,maxh=(900,560) if sneaker else (700,860)
    sc=min(maxw/cut.width,maxh/cut.height); c=cut.resize((int(cut.width*sc),int(cut.height*sc)),Image.LANCZOS)
    x=cx-c.width//2; y=top-c.height+(10 if sneaker else 6)
    sh=Image.new('L',(W,H),0); ImageDraw.Draw(sh).ellipse((x+c.width*0.1,top-16,x+c.width*0.9,top+18),fill=150)
    sh=sh.filter(ImageFilter.GaussianBlur(14)); sky.paste(Image.new('RGB',(W,H),'#1b2a3a'),(0,0),sh)
    sky.paste(c,(x,y),c); sky.save(f'{P}/out/{k}-2-frost.jpg',quality=86,optimize=True,progressive=True)
    print('ok',k)
