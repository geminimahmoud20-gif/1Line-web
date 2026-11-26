import math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter
random.seed(11)
S=4; W,H=529*S,502*S
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def F(sz): return ImageFont.truetype(FONT,int(sz*S))
def P(p): return [(x*S,y*S) for x,y in p]
BG=(236,238,240); ROAD=(255,255,255); EDGE=(120,128,138)
RES=(244,196,130); RESO=(190,120,50); GRN=(150,205,120); GRNO=(80,150,60); SRV=(120,180,230); SRVO=(40,100,170); PARK=(176,222,150)

img=Image.new('RGB',(W,H),BG)
d=ImageDraw.Draw(img)
# boundary polygon (traced from satellite image)
bound=[(0,176),(298,1),(318,60),(352,150),(402,250),(452,352),(492,458),(512,494),(100,494),(100,340),(52,250)]
def mask(poly):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(P(poly),fill=255); return m
def ell_poly(cx,cy,rx,ry,a,n=80):
    r=math.radians(a); out=[]
    for k in range(n):
        t=2*math.pi*k/n; x=rx*math.cos(t); y=ry*math.sin(t)
        out.append((cx+x*math.cos(r)-y*math.sin(r),cy+x*math.sin(r)+y*math.cos(r)))
    return out
oval=ell_poly(222,218,56,74,-8)

d.polygon(P(bound),fill=ROAD)

def grid_layer(angle,bw,bh,street,cw,ch,cx,cy,fill,outline,jitter=0.0):
    big=int(math.hypot(W,H))+40
    L=Image.new('RGBA',(big,big),(0,0,0,0)); g=ImageDraw.Draw(L)
    R=big/S/2; o=big/2
    y=-R
    while y<R:
        x=-R
        while x<R:
            n=int(bw/cw); m=int(bh/ch)
            for j in range(m):
                for i in range(n):
                    if random.random()<jitter: continue
                    px=x+i*cw; py=y+j*ch
                    g.rectangle([(px+0.5)*S+o,(py+0.5)*S+o,(px+cw-0.5)*S+o,(py+ch-0.5)*S+o],fill=fill,outline=outline)
            x+=bw+street
        y+=bh+street
    L=L.rotate(-angle,resample=Image.BICUBIC,center=(o,o))
    out=Image.new('RGBA',(W,H),(0,0,0,0)); out.paste(L,(int(cx*S-o),int(cy*S-o)))
    return out
def apply(layer,poly,exclude=None):
    global img
    m=mask(poly)
    if exclude:
        for e in exclude:
            m=Image.composite(Image.new('L',(W,H),0),m,mask(e))
    a=layer.split()[3]
    a=Image.composite(a,Image.new('L',(W,H),0),m)
    img.paste(layer.convert('RGB'),(0,0),a)

upper=[(0,176),(298,1),(318,60),(352,150),(402,250),(452,352),(492,458),(512,494),(100,494),(100,400),(500,400)]
upper=[(0,176),(298,1),(318,60),(352,150),(402,250),(452,352),(468,398),(100,398),(100,340),(52,250)]
lower=[(100,402),(471,402),(492,458),(512,494),(100,494)]
shrink=lambda poly: poly
cluster=[(235,262),(330,262),(335,355),(240,350)]
# residential grid, aligned to the NE diagonal road (-30deg)
apply(grid_layer(-30,30,20,3.5,5,10,240,220,RES,RESO),upper,exclude=[oval,cluster])
apply(grid_layer(0,36,20,3.5,6,10,300,440,RES,RESO),lower)
# services cluster
d.polygon(P(cluster),fill=(214,232,248))
apply(grid_layer(-30,34,22,4,8,11,285,305,SRV,SRVO),cluster)
d=ImageDraw.Draw(img)
# plots near boundary: cleaner road border
d.line(P(bound+[bound[0]]),fill=EDGE,width=int(1.6*S))
# central oval park
d.polygon(P(ell_poly(222,218,62,80,-8)),fill=ROAD,outline=EDGE)
d.polygon(P(oval),fill=PARK)
d.polygon(P(ell_poly(222,218,44,60,-8)),outline=GRNO,fill=(190,230,165),width=S//2)
d.polygon(P(ell_poly(222,218,26,38,-8)),outline=GRNO,fill=(205,238,180),width=S//2)
for _ in range(220):
    a=random.random()*2*math.pi; r=random.random()**0.5
    x=222+r*50*math.cos(a)-0; y=218+r*68*math.sin(a)
    if ((x-222)/50)**2+((y-218)/68)**2<1:
        rr=1.3+random.random()*1.2
        d.ellipse([(x-rr)*S,(y-rr)*S,(x+rr)*S,(y+rr)*S],fill=(100,170,80))
# green pockets
for (cx,cy,w,h,a) in [(90,215,14,18,-30),(140,330,16,12,-30),(330,150,14,12,-30),(380,320,16,14,-25),(180,110,14,12,-30),(420,360,12,10,-25),(155,430,14,12,0),(400,436,16,12,0),(270,436,14,12,0)]:
    r=math.radians(a); pts=[]
    for dx,dy in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]:
        pts.append((cx+dx*math.cos(r)-dy*math.sin(r),cy+dx*math.sin(r)+dy*math.cos(r)))
    d.polygon(P(pts),fill=GRN,outline=GRNO)
# main boulevards (white thick + gray edges)
def road(pts,w=4):
    d.line(P(pts),fill=EDGE,width=int((w+1.2)*S),joint='curve'); d.line(P(pts),fill=ROAD,width=int(w*S),joint='curve')
road([(100,398),(468,398)],5)
road([(300,12),(290,120),(300,262)],4)
road([(150,150),(160,260),(150,340),(180,398)],4)
road([(52,250),(130,160),(190,100),(260,40)],3.5)
# labels
def txt(x,y,t,sz,col,rot=0,bg=None):
    tmp=Image.new('RGBA',(260*S,50*S),(0,0,0,0)); tt=ImageDraw.Draw(tmp)
    tt.text((130*S,25*S),t,fill=col,font=F(sz),anchor='mm',direction='rtl',language='ar')
    if rot: tmp=tmp.rotate(rot,expand=True,resample=Image.BICUBIC)
    img.paste(tmp,(int(x*S-tmp.width/2),int(y*S-tmp.height/2)),tmp)
txt(222,218,'الحديقة المركزية',7,(40,100,40),rot=-8)
txt(285,306,'المنطقة الخدمية',5.5,(10,50,110),rot=-30)
txt(285,415,'الطريق الرئيسي',5,(70,70,70))
txt(400,455,'المرحلة الأولى',6,(120,70,20))
txt(130,100,'الطريق الدائري',5,(70,70,70),rot=33)
d=ImageDraw.Draw(img)
# legend + title
LH=75*S
out=Image.new('RGB',(W,H+LH),(250,250,250)); out.paste(img,(0,0)); dd=ImageDraw.Draw(out)
items=[(RES,RESO,'قطع أراضي سكنية'),(SRV,SRVO,'منطقة خدمية وتجارية'),(PARK,GRNO,'حدائق ومناطق خضراء'),(ROAD,EDGE,'طرق وممرات')]
for i,(c,o,t) in enumerate(items):
    x=(14+(i%2)*170)*S; y=H+(12+(i//2)*26)*S
    dd.rectangle([x,y,x+18*S,y+12*S],fill=c,outline=o,width=S//2)
    dd.text((x+24*S,y+6*S),t,fill=(30,30,30),font=F(6),anchor='lm',language='ar')
dd.text((W-14*S,H+24*S),'مخطط الموقع العام',fill=(20,60,120),font=F(10),anchor='rm',direction='rtl',language='ar')
dd.text((W-14*S,H+50*S),'1 Line Solutions',fill=(60,60,60),font=F(7),anchor='rm')
# north arrow
dd.polygon([(30*S,14*S),(38*S,38*S),(30*S,33*S),(22*S,38*S)],fill=(40,40,40)); dd.text((30*S,8*S),'N',fill=(40,40,40),font=F(8),anchor='mm')
out.save('site_plan.png'); print(out.size)
