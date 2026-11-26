import numpy as np
from PIL import Image, ImageFilter, ImageChops, ImageDraw, ImageFont
im=Image.open('../../images/4.png').convert('RGB')
a=np.asarray(im).astype(float)
protos={'mag':(255,20,147),'grn':(30,255,30),'cya':(0,230,255),'red':(255,30,30),'org':(255,170,0),'wht':(255,255,255),'blu':(0,110,255)}
names=list(protos)
D=np.stack([np.linalg.norm(a-np.array(protos[k]),axis=2) for k in names]+[np.linalg.norm(a-0,axis=2)],axis=2)
lab=D.argmin(axis=2)
S=5; H,W=a.shape[:2]
def up(k,blur=0.5,th=100):
    m=(lab==names.index(k)).astype(np.uint8)*255
    m=Image.fromarray(m).resize((W*S,H*S),Image.BICUBIC).filter(ImageFilter.GaussianBlur(S*blur))
    return m.point(lambda v:255 if v>th else 0)
def close(m,k): return m.filter(ImageFilter.MaxFilter(k)).filter(ImageFilter.MinFilter(k))
mag=up('mag',0.6,70); grn=up('grn',0.6,70); cya=up('cya',0.6,70); org=up('org',0.5,90); red=up('red',0.5,90); wht=up('wht',0.4,110); blu=up('blu',0.5,90)
# block silhouettes: lines merged into solid areas
res_blk=close(ImageChops.lighter(mag,grn),23)
res_blk=res_blk.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
srv_blk=close(cya,13)
grn_blk=close(grn,9)
BG=(238,240,243)
cut=Image.new('L',res_blk.size,255); cd=ImageDraw.Draw(cut)
cd.polygon([(2508+70,0),(3460,0),(3460,1940),(3443+70,1940)],fill=0)
res_blk=ImageChops.multiply(res_blk,cut)
mag=ImageChops.multiply(mag,cut)
out=Image.new('RGB',(W*S,H*S),BG)
def fill(m,col): out.paste(Image.new('RGB',out.size,col),(0,0),m)
fill(res_blk,(250,214,160))
fill(mag.filter(ImageFilter.MinFilter(3)),(214,140,70))          # plot lines
fill(srv_blk,(150,200,240)); fill(cya,(40,100,170))
fill(grn_blk,(140,205,115)); fill(grn,(70,140,55))
fill(red,(205,70,70)); fill(org,(235,150,30)); fill(blu,(30,110,230))
d=ImageDraw.Draw(out)
d.rectangle([1790,1250,1960,1360],fill=BG)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
d.text((1875,1305),'29',fill=(20,60,120),font=ImageFont.truetype(FONT,90),anchor='mm')
wht2=wht.crop((0,0,W*S,H*S)); 

LH=260
fin=Image.new('RGB',(out.width,out.height+LH),(250,250,250)); fin.paste(out,(0,0)); dd=ImageDraw.Draw(fin)
F=lambda n: ImageFont.truetype(FONT,n)
items=[((250,214,160),(214,140,70),'Plots'),((150,200,240),(40,100,170),'Services'),((140,205,115),(70,140,55),'Parks'),((238,240,243),(205,70,70),'Roads')]
for i,(c,o,t) in enumerate(items):
    x=80+i*520; y=out.height+60
    dd.rectangle([x,y,x+90,y+60],fill=c,outline=o,width=6); dd.text((x+115,y+30),t,fill=(30,30,30),font=F(46),anchor='lm')
dd.text((out.width-80,out.height+70),'1 Line Solutions',fill=(20,60,120),font=F(70),anchor='rm')
dd.text((out.width-80,out.height+170),'Detailed site plan - Plot 29 area',fill=(70,70,70),font=F(46),anchor='rm')
out=fin
out.save('clean2.png'); print(out.size)
