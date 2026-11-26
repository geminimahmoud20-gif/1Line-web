import math, random
from PIL import Image, ImageDraw, ImageFont, ImageChops
random.seed(7)
S=4; W,H=548*S,338*S
img=Image.new('RGB',(W,H),(0,0,0))
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def F(sz): return ImageFont.truetype(FONT,int(sz*S))
def P(pts): return [(x*S,y*S) for x,y in pts]

def region_mask(poly):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(P(poly),fill=255); return m

def plot_layer(angle,bw,bh,street,cw,ch,fill,outline,green_p=0.12,gap=0.6,cx=274,cy=169):
    """grid of blocks of plots in a frame rotated by angle (deg) around centre"""
    big=int(math.hypot(W,H))+40
    L=Image.new('RGB',(big,big),(0,0,0)); d=ImageDraw.Draw(L)
    ox=(big-W)//2; oy=(big-H)//2
    R=big/S/2
    u0=-R; 
    y=-R
    while y<R:
        x=-R
        while x<R:
            # one block: rows of plots
            n=int(bw/cw); m=int(bh/ch)
            for j in range(m):
                for i in range(n):
                    px=x+i*cw; py=y+j*ch
                    if random.random()<green_p*0.35 and 0<i<n-1:
                        col=(80,225,60); out=None
                        d.rectangle([(px+gap/2)*S+big/2,(py+gap/2)*S+big/2,(px+cw-gap/2)*S+big/2,(py+ch-gap/2)*S+big/2],fill=col)
                    else:
                        d.rectangle([(px+gap/2)*S+big/2,(py+gap/2)*S+big/2,(px+cw-gap/2)*S+big/2,(py+ch-gap/2)*S+big/2],fill=fill,outline=outline)
            # green strip beside block
            if random.random()<0.7:
                gx=x+bw+street*0.25; gy=y+random.random()*bh*0.6
                d.rectangle([gx*S+big/2,gy*S+big/2,(gx+street*0.5)*S+big/2,(gy+bh*0.25)*S+big/2],fill=(90,230,60))
            x+=bw+street
        y+=bh+street
    L=L.rotate(-angle,resample=Image.BICUBIC,center=(big/2,big/2),fillcolor=(0,0,0))
    # shift so frame centre = (cx,cy)
    out=Image.new('RGB',(W,H),(0,0,0))
    out.paste(L,(int(cx*S-big/2),int(cy*S-big/2)))
    return out

def paste_region(layer,poly):
    global img
    img=Image.composite(layer,img,region_mask(poly))

MAG=(165,25,105); MAGO=(235,95,130); PUR=(120,30,175); PURO=(200,110,230)

# ---- purple district (top-left)
poly_purple=[(0,0),(212,0),(110,57),(0,119)]
paste_region(plot_layer(-29,26,15,2.2,3.2,5.5,PUR,PURO,gap=0.5,cx=100,cy=60),poly_purple)
# ---- main residential
poly_main=[(3,126),(110,60),(213,0),(300,172),(352,338),(84,338),(79,270),(33,188)]
paste_region(plot_layer(60,26,16,2.4,3.2,5.2,MAG,MAGO,cx=190,cy=170),poly_main)
# ---- bottom orthogonal
poly_bot=[(84,255),(300,255),(330,338),(84,338)]
paste_region(plot_layer(0,22,11,3,3,5,MAG,MAGO,cx=200,cy=300),poly_bot)
# ---- left strip
poly_left=[(0,178),(18,190),(47,280),(47,338),(0,338)]
paste_region(plot_layer(62,18,14,3.5,3.2,5.2,MAG,MAGO,cx=20,cy=260),poly_left)

d=ImageDraw.Draw(img)
def line(pts,col,w=1.0): d.line(P(pts),fill=col,width=max(1,int(w*S)),joint='curve')
# boundaries
line([(0,118),(110,58),(80,3)],(235,40,40),1.2)
line([(110,58),(213,0)],(250,170,40),1.1)
line([(213,0),(300,172),(352,338)],(235,130,120),1.0)
# parks (black, numbered)
def park(poly,label=None,lp=None,sz=5):
    d.polygon(P(poly),fill=(0,0,0))
    if label:
        t=label; x,y=lp
        d.text((x*S,y*S),t,fill=(255,255,255),font=F(sz),anchor='mm',direction='rtl',language='ar')
def rect(cx,cy,w,h,a):
    r=math.radians(a); pts=[]
    for dx,dy in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]:
        pts.append((cx+dx*math.cos(r)-dy*math.sin(r),cy+dx*math.sin(r)+dy*math.cos(r)))
    return pts
parks=[(43,27,20,14,-28,'مج ١٢'),(15,84,17,12,-20,None),(13,50,12,9,0,None),(60,43,14,9,-25,None),(160,75,16,10,-25,None),
 (178,40,14,10,-20,None),(185,65,12,9,-25,'مج ١٣'),(210,120,12,8,55,'مج ١٣'),(55,135,12,8,0,None),(88,185,18,12,-20,'مج ١٦'),(115,255,20,15,-5,'مج ١٧'),
 (127,218,17,11,30,None),(235,115,12,9,30,None),(235,185,22,13,-20,'مج ١٥'),(165,257,16,10,30,None),(250,255,16,10,-15,None),(215,252,10,8,0,'مج ١٦'),
 (3,255,10,10,0,None),(13,277,10,10,0,'مج ١٨'),(116,300,15,12,0,'مج ٢٠'),(228,310,15,10,0,'مج ٢١'),(110,315,14,10,0,None),(260,295,14,10,0,None),(148,290,16,9,0,None)]
for cx,cy,w,h,a,lab in parks:
    park(rect(cx,cy,w,h,a),lab,(cx,cy),4.2)
# river label
txt='مجرى مائي'
tmp=Image.new('RGBA',(300*S,60*S),(0,0,0,0)); ImageDraw.Draw(tmp).text((150*S,30*S),'محور الشيخ زايد',fill=(255,255,255,255),font=F(4.4),anchor='mm',direction='rtl',language='ar')
tmp=tmp.rotate(-62,expand=True,resample=Image.BICUBIC)
img.paste(tmp,(int(46*S-tmp.width/2),int(205*S-tmp.height/2)),tmp)
d=ImageDraw.Draw(img)

# ---- central roundabout complex
cx,cy=151,130
d.ellipse([(cx-26)*S,(cy-22)*S,(cx+26)*S,(cy+22)*S],fill=(0,0,0))
d.ellipse([(cx-22)*S,(cy-19)*S,(cx+22)*S,(cy+19)*S],fill=(40,235,50))
d.ellipse([(cx-16)*S,(cy-14)*S,(cx+16)*S,(cy+14)*S],fill=(0,0,0))
for k in range(10):
    a=2*math.pi*k/10
    d.ellipse([(cx+19*math.cos(a)-4)*S,(cy+16*math.sin(a)-3.5)*S,(cx+19*math.cos(a)+4)*S,(cy+16*math.sin(a)+3.5)*S],fill=(0,0,0),outline=(235,170,40))
d.ellipse([(cx-7)*S,(cy-6)*S,(cx+7)*S,(cy+6)*S],fill=(0,0,0),outline=(235,170,40),width=S)
d.ellipse([(cx-16)*S,(cy-14)*S,(cx+16)*S,(cy+14)*S],outline=(235,170,40),width=S)
# gold fan plots south of roundabout
fan=Image.new('RGB',(W,H),(0,0,0)); fd=ImageDraw.Draw(fan)
for r in range(6):
    for k in range(9):
        a=math.radians(55+k*8-r*0); rr=28+r*6
        x=cx+8+rr*math.cos(a)*0.55+ (k-4)*0; 
fan_poly=[(135,146),(185,142),(200,175),(150,185)]
fp=Image.new('RGB',(W,H),(0,0,0)); fpd=ImageDraw.Draw(fp)
for gx in range(135,205,5):
    for gy in range(138,190,4):
        col=(235,170,40) if random.random()<0.8 else (40,235,50)
        fpd.rectangle([gx*S,gy*S,(gx+4)*S,(gy+3)*S],fill=(0,0,0),outline=col)
img=Image.composite(fp,img,region_mask(fan_poly))
d=ImageDraw.Draw(img)
# fan arcs (curved plots north-west)
for r in (30,34,38):
    d.arc([(cx-r)*S,(cy-r*0.9)*S,(cx+r)*S,(cy+r*0.9)*S],200,290,fill=(235,170,40),width=S)
# teal / green cluster
cl=[(168,172),(212,168),(238,235),(190,250)]
tl=Image.new('RGB',(W,H),(0,0,0)); td=ImageDraw.Draw(tl)
for gx in range(165,245,6):
    for gy in range(165,255,5):
        r=random.random()
        if r<0.45: td.rectangle([gx*S,gy*S,(gx+5)*S,(gy+4)*S],fill=(60,210,215),outline=(150,240,240))
        elif r<0.8: td.ellipse([gx*S,gy*S,(gx+6)*S,(gy+5)*S],fill=(40,235,50))
        else: td.rectangle([gx*S,gy*S,(gx+5)*S,(gy+4)*S],fill=(0,0,0))
# rotate cluster slightly
tl=tl.rotate(-8,center=(205*S,210*S),resample=Image.BICUBIC)
img=Image.composite(tl,img,region_mask(cl))
d=ImageDraw.Draw(img)
d.polygon(P([(228,222),(246,215),(240,240),(230,238)]),fill=(180,20,20))
d.polygon(P([(163,184),(176,180),(174,197),(163,196)]),outline=(235,170,40),fill=(0,0,0))
line(cl+[cl[0]],(235,170,40),0.6)

# ---- right zone
zone=[(215,0),(423,0),(513,168),(342,253),(300,172)]
base_before=img.copy()
d.polygon(P(zone),fill=(0,0,0))
ROAD=(235,200,200)
def rd(pts,col=ROAD,w=0.9): 
    line(pts,col,w)
def rot(u,v,a=-21,o=(330,150)):
    r=math.radians(a); return (o[0]+u*math.cos(r)-v*math.sin(r), o[1]+u*math.sin(r)+v*math.cos(r))
# blocks as rounded rectangles in rotated frame (u,v) – hand layout
rows=[(-150,-100,[0,70,150,230,300]),(-97,-50,[0,60,140,210,300]),(-47,0,[0,80,160,260,300]),(3,52,[0,55,125,200,300]),(55,110,[0,70,170,300])]
blocks=[]
for v0,v1,cuts in rows:
    for i in range(len(cuts)-1):
        blocks.append((cuts[i]+8+ -60,v0+1.5,cuts[i+1]-cuts[i]-3,v1-v0-3))
for u,v,w,h in blocks:
    pts=[rot(u,v),rot(u+w,v),rot(u+w,v+h),rot(u,v+h)]
    d.polygon(P(pts),outline=(255,255,255),fill=(0,0,0),width=max(1,int(0.7*S)))
# clip: black outside zone
mask=region_mask(zone); base=img.copy()
# (redraw other areas after) – simplest: overpaint areas outside zone from saved layers
img_zone=img
# green strip
line([(423,0),(513,168)],(40,235,50),3.0)
line([(432,0),(522,168)],(235,150,150),0.8); line([(437,3),(545,140)],(235,150,150),0.8)
# red small boxes
for (u,v,w,h) in [(215,10,22,20),(235,0,22,24),(255,-8,25,30)]:
    pts=[rot(u,v),rot(u+w,v),rot(u+w,v+h),rot(u,v+h)]
    d.polygon(P(pts),outline=(220,40,40),width=int(0.8*S))
# labels (white small)
lab=['محطة','مدرسة','سكني','خدمات','تجاري','ساحة','مسجد','حضانة']
for u,v,w,h in blocks:
    x,y=rot(u+w/2,v+h/2)
    d.text((x*S,y*S),random.choice(lab),fill=(255,255,255),font=F(3.2),anchor='mm',direction='rtl',language='ar')
img=Image.composite(img,base_before,region_mask(zone))
d=ImageDraw.Draw(img)
# top-right yellow label rotated
tmp=Image.new('RGBA',(200*S,40*S),(0,0,0,0)); ImageDraw.Draw(tmp).text((100*S,20*S),'محطة المحولات',fill=(235,190,60,255),font=F(5),anchor='mm',direction='rtl',language='ar')
tmp=tmp.rotate(-62,expand=True,resample=Image.BICUBIC)
img.paste(tmp,(int(468*S-tmp.width/2),int(40*S-tmp.height/2)),tmp)
# blue rectangle & purple edge
d=ImageDraw.Draw(img)
d.polygon(P([(472,0),(548,0),(548,40),(522,47),(498,40)]),fill=(40,40,180))
line([(522,47),(548,95)],(120,40,180),1.0)
# right-edge gold plots
for gy in range(150,205,5):
    for gx in range(531,548,5):
        d.rectangle([gx*S,gy*S,(gx+4)*S,(gy+4)*S],outline=(235,170,40))
# ---- bottom big rectangle + road
d.polygon(P([(342,253),(517,173),(548,190),(548,338),(380,338)]),fill=(0,0,0))
line([(342,253),(517,173)],(235,170,170),1.1)
line([(367,333),(440,325),(548,310)],(235,130,90),1.4); line([(367,338),(440,330),(548,316)],(235,130,90),0.8)
yel=[(433,247),(522,203),(548,247),(462,309)]
line(yel+[yel[0]],(235,190,60),0.7)
grn=[(383,273),(432,248),(455,297),(407,320)]
line(grn+[grn[0]],(40,235,50),1.4)
for i,t in enumerate(['منطقة محطة','معالجة الصرف','الصحي المرحلة','الأولى']):
    d.text((418*S,(268+i*9)*S),t,fill=(235,60,60),font=F(3.6),anchor='mm',direction='rtl',language='ar')
tmp=Image.new('RGBA',(300*S,60*S),(0,0,0,0)); t=ImageDraw.Draw(tmp)
t.text((150*S,20*S),'محطة معالجة الصرف الصحي',fill=(235,190,60,255),font=F(5),anchor='mm',direction='rtl',language='ar')
t.text((150*S,34*S),'للمرحلة الأولى',fill=(235,190,60,255),font=F(5),anchor='mm',direction='rtl',language='ar')
tmp=tmp.rotate(28,expand=True,resample=Image.BICUBIC)
img.paste(tmp,(int(490*S-tmp.width/2),int(262*S-tmp.height/2)),tmp)
img.save('plan_redrawn.png')
print(img.size)
