import math, random
from PIL import Image, ImageDraw, ImageFont
random.seed(5)
S=8; GW,GH=469,247; W,H=GW*S,GH*S
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def F(sz): return ImageFont.truetype(FONT,int(sz*S))
def P(p): return [(x*S,y*S) for x,y in p]
BG=(236,238,240); ROAD=(255,255,255); EDGE=(120,128,138)
RES=(244,196,130); RESO=(185,115,45); GRN=(150,205,120); GRNO=(70,140,55); SRV=(120,180,230); SRVO=(40,100,170)
img=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(img)
def mk(poly):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).polygon(P(poly),fill=255); return m
def inside(m,x,y):
    xi,yi=int(x*S),int(y*S)
    return 0<=xi<W and 0<=yi<H and m.getpixel((xi,yi))>0
def rrect(cx,cy,w,h,a):
    r=math.radians(a); return [(cx+dx*math.cos(r)-dy*math.sin(r),cy+dx*math.sin(r)+dy*math.cos(r)) for dx,dy in [(-w/2,-h/2),(w/2,-h/2),(w/2,h/2),(-w/2,h/2)]]
counter=[0]
def plots(region,angle,bw,bh,street,cw,ch,cx,cy,fill,outline,exclude=(),number=True,prefix=''):
    m=mk(region)
    for e in exclude:
        m=Image.composite(Image.new('L',(W,H),0),m,mk(e))
    r=math.radians(angle); c,s=math.cos(r),math.sin(r)
    R=330; y=-R
    while y<R:
        x=-R
        while x<R:
            n=int(bw/cw); k=int(bh/ch)
            for j in range(k):
                for i in range(n):
                    u=x+i*cw+cw/2; v=y+j*ch+ch/2
                    px=cx+u*c-v*s; py=cy+u*s+v*c
                    # plot corners must be inside
                    pts=rrect(px,py,cw-0.7,ch-0.7,angle)
                    if all(inside(m,qx,qy) for qx,qy in pts):
                        d.polygon(P(pts),fill=fill,outline=outline)
                        counter[0]+=1
                        if number:
                            d.text((px*S,py*S),str(counter[0]),fill=(90,45,10),font=F(2.6),anchor='mm')
            x+=bw+street
        y+=bh+street

# background parcel area
outer=[(0,0),(318,0),(440,247),(0,247)]
d.polygon(P([(0,0),(318,0),(445,247),(0,247)]),fill=ROAD)

cyanR=[(0,0),(104,0),(150,90),(0,184)]
neR=[(0,190),(150,95),(105,0),(300,0),(305,122),(240,138),(200,152),(172,152),(130,170),(110,172),(35,206),(0,215)]
seR=[(300,0),(316,0),(436,247),(212,247),(200,205),(252,188),(240,140),(306,124)]
lowR=[(40,214),(205,214),(205,247),(40,247)]
colR1=[(116,152),(136,152),(136,214),(116,214)]
colR2=[(141,166),(164,166),(164,214),(141,214)]
tri=[(168,163),(201,150),(224,190),(170,194)]
pill=rrect(262,140,48,22,-25)
blackrect=[(110,168),(36,205),(41,213),(110,213)]
redpark=[(62,78),(106,70),(108,128),(60,126)]
greenpark=[(110,60),(148,62),(148,116),(112,114)]
ex=[tri,pill,blackrect]

plots(cyanR,-33,30,18,3,6,9,50,60,SRV,SRVO,exclude=[redpark,greenpark],number=True)
plots(neR,-33,60,20,3,6,10,200,60,RES,RESO,exclude=ex)
plots(seR,62,60,20,3,6,10,330,120,RES,RESO,exclude=ex)
plots(lowR,0,34,24,4,6,10,60,230,RES,RESO)
plots(colR1,0,20,60,3,6,10,120,170,RES,RESO)
plots(colR2,0,23,50,3,6,10,145,175,RES,RESO)
d=ImageDraw.Draw(img)
# parks
def park(poly,fill=GRN,out=GRNO):
    d.polygon(P(poly),fill=fill,outline=out)
d.polygon(P(redpark),fill=(206,238,180),outline=GRNO)
for _ in range(14):
    x=64+random.random()*40; y=76+random.random()*50
    d.ellipse([(x-3)*S,(y-3)*S,(x+3)*S,(y+3)*S],fill=(100,170,80))
d.polygon(P(greenpark),fill=(190,230,165),outline=GRNO)
for (x,y) in [(122,74),(136,78),(124,98),(138,100),(130,110)]:
    d.ellipse([(x-4)*S,(y-4)*S,(x+4)*S,(y+4)*S],fill=(100,170,80))
# black/green plazas
for poly,lab in [(tri,'29'),(blackrect,None),(pill,None)]:
    d.polygon(P(poly),fill=(206,238,180),outline=GRNO,width=S//2)
d.text((196*S,172*S),'29',fill=(20,70,20),font=F(9),anchor='mm')
# green strips (small gardens) along bands
for _ in range(36):
    pass
# roads: main diagonal avenue + right avenue
def road(pts,w=4):
    d.line(P(pts),fill=EDGE,width=int((w+1)*S),joint='curve'); d.line(P(pts),fill=ROAD,width=int(w*S),joint='curve')
road([(0,190),(150,95),(318,-3)],4)
road([(318,-3),(380,120),(442,250)],5)
d.line(P([(325,-3),(398,160),(448,247)]),fill=EDGE,width=S)
# boundary (white double) and outside
d.polygon(P([(326,0),(469,0),(469,247),(449,247),(400,161)]),fill=(18,20,24))
d.line(P([(325,0),(400,160),(469,128)]),fill=(255,255,255),width=S)
# labels
def txt(x,y,t,sz,col,rot=0):
    tmp=Image.new('RGBA',(200*S,40*S),(0,0,0,0)); ImageDraw.Draw(tmp).text((100*S,20*S),t,fill=col,font=F(sz),anchor='mm',direction='rtl',language='ar')
    if rot: tmp=tmp.rotate(rot,expand=True,resample=Image.BICUBIC)
    img.paste(tmp,(int(x*S-tmp.width/2),int(y*S-tmp.height/2)),tmp)
txt(85,100,'حديقة',5,(30,90,30)); txt(128,88,'حديقة',5,(30,90,30)); txt(260,141,'حديقة',4,(30,90,30),-25)
txt(250,36,'الطريق الرئيسي',3.2,(80,80,80),30)
txt(72,208,'ساحة',5,(30,90,30),30)
txt(430,40,'خارج حدود المشروع',5,(150,150,150))
# legend
LH=48*S
out=Image.new('RGB',(W,H+LH),(250,250,250)); out.paste(img,(0,0)); dd=ImageDraw.Draw(out)
items=[(RES,RESO,'قطع أراضي سكنية'),(SRV,SRVO,'منطقة خدمية'),((206,238,180),GRNO,'حدائق وساحات'),(ROAD,EDGE,'طرق')]
for i,(c,o,t) in enumerate(items):
    x=(10+i*70)*S; y=H+10*S
    dd.rectangle([x,y,x+12*S,y+8*S],fill=c,outline=o,width=S//2)
    dd.text((x+16*S,y+4*S),t,fill=(30,30,30),font=F(4.2),anchor='lm',language='ar')
dd.text((W-10*S,H+14*S),'مخطط تفصيلي للموقع',fill=(20,60,120),font=F(8),anchor='rm',direction='rtl',language='ar')
dd.text((W-10*S,H+32*S),'1 Line Solutions',fill=(60,60,60),font=F(5.5),anchor='rm')
dd.polygon([(30*S,H+18*S),(34*S,H+34*S),(30*S,H+31*S),(26*S,H+34*S)],fill=(40,40,40))
out.save('detail.png'); print(out.size, counter[0])
