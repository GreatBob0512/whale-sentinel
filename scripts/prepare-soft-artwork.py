"""Prepare colour-faithful soft miniature masters. No character repainting or
compositing: idle is the exact supplied front view; other states are isolated
connected components of the derivative sheet (error has its own complete master).
"""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
import json
R=Path(__file__).resolve().parents[1].parent/'outputs'/'whale-soft-child-v2'

def clean(im):
 im=im.convert('RGBA');a=im.getchannel('A').point(lambda x:0 if x<=16 else 255 if x>=246 else x);im.putalpha(a);return im

def normalize(im,name):
 im=clean(im);box=im.getchannel('A').getbbox();assert box,name
 fig=im.crop(box)
 scale=min(928/fig.width,1400/fig.height)
 fig=fig.resize((round(fig.width*scale),round(fig.height*scale)),Image.Resampling.LANCZOS)
 out=Image.new('RGBA',(1024,1536));out.alpha_composite(fig,((1024-fig.width)//2,1480-fig.height));out.save(R/(name+'.png'),optimize=True)
 print(name,'complete body',box,'normalized',fig.size)

source=Image.open(R/'reference-front-white.png').convert('RGBA')
rgb=np.asarray(source)[...,:3];candidate=((rgb.min(axis=2)>232)&((rgb.max(axis=2)-rgb.min(axis=2))<24))
mask=Image.fromarray((candidate*255).astype('uint8'),'L').copy()
for seed in [(0,0),(source.width-1,0),(0,source.height-1),(source.width-1,source.height-1)]:
 if mask.getpixel(seed)==255:ImageDraw.floodfill(mask,seed,128)
a=np.where(np.asarray(mask)==128,0,255).astype('uint8');source.putalpha(Image.fromarray(a,'L'))
source.save(R/'idle-exact-front.png',optimize=True);normalize(source,'idle')
sheet=clean(Image.open(R/'four-states-sheet.png'));labels=sheet.getchannel('A').point(lambda x:255 if x>16 else 0)
for i,x in enumerate([190,570,950,1340],1):
 assert labels.getpixel((x,300))==255,'state components unexpectedly connected'
 ImageDraw.floodfill(labels,(x,300),i)
lab=np.asarray(labels);alpha=np.asarray(sheet.getchannel('A'))
for i,name in enumerate(['running','waiting','done'],1):
 assert int((lab==i).sum())>100000,name
 im=sheet.copy();im.putalpha(Image.fromarray(np.where(lab==i,alpha,0).astype('uint8'),'L'));box=im.getchannel('A').getbbox()
 assert box[0]>0 and box[2]<sheet.width,'state clips at image edge: '+name
 normalize(im,name)
normalize(Image.open(R/'error-master.png'),'error')
print('All five masters prepared without boosting saturation or highlights')
