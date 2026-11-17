"""Build reproducible full-body runtime assets from the user-named soft miniature.
Only trims transparent margins, resizes and palette-quantizes. Never crops anatomy or
composites new character content. Source masters stay outside the published bundle.
"""
from pathlib import Path
from hashlib import sha256
import json,base64,re
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
WORKSPACE=ROOT.parent
RAW=WORKSPACE/'outputs'/'whale-soft-child-v2'
APPROVED=WORKSPACE/'outputs'/'whale-relock'/'mini-three-views.png'
ASSETS=ROOT/'assets'
PHASES=['idle','running','waiting','done','error']
ID='whale-child-soft-v2'

def digest(path):return sha256(path.read_bytes()).hexdigest()

def clean(im):
    im=im.convert('RGBA')
    # Gateway can leave RGB data behind alpha=0 and tiny-alpha matte noise.
    # Clear only invisible fringe; preserve meaningful semitransparent chiffon.
    alpha=im.getchannel('A').point(lambda a:0 if a<=16 else (255 if a>=246 else a))
    im.putalpha(alpha)
    return im

def palette(im,colors=192):return im.quantize(colors=colors,method=Image.Quantize.FASTOCTREE)

def write_asset(im,path):
    palette(im).save(path,optimize=True)
    saved=Image.open(path).convert('RGBA')
    assert saved.getpixel((0,0))[3]==0,path
    assert saved.getpixel((saved.width-1,saved.height-1))[3]==0,path
    return {'sha256':digest(path),'bytes':path.stat().st_size,'size':list(saved.size)}

def main():
    masters={}
    for phase in PHASES:
        p=RAW/(phase+'.png');im=clean(Image.open(p))
        assert im.size==(1024,1536),(phase,im.size)
        bounds=im.getchannel('A').getbbox();assert bounds,phase
        assert bounds[1]>0 and bounds[3]<1536,'source clips head or shoes: '+phase
        masters[phase]=im
    boxes=[im.getchannel('A').getbbox() for im in masters.values()]
    common=(min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
    scale=min(368/(common[2]-common[0]),560/(common[3]-common[1]))
    content_size=(round((common[2]-common[0])*scale),round((common[3]-common[1])*scale))
    offset=((384-content_size[0])//2,576-content_size[1]-8)
    manifest={'id':ID,'approvedSource':'outputs/whale-relock/mini-three-views.png','forms':['child'],'frontReference':'outputs/whale-soft-child-v2/idle-exact-front.png','preparedBy':'scripts/prepare-soft-artwork.py','approvedSha256':digest(APPROVED),'model':'gpt-image-2.6-sunburst','canvas':[384,576],'sourceCommonBounds':list(common),'states':{}}
    sprites={};icons={}
    for phase,im in masters.items():
        figure=im.crop(common).resize(content_size,Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(384,576));canvas.alpha_composite(figure,offset)
        out=ASSETS/f'fish-{phase}.png'
        files={'sprite':write_asset(canvas,out)}
        sprites[phase]=base64.b64encode(out.read_bytes()).decode('ascii')
        for suffix,sz,fit in [('-icon',(128,128),(116,116)),('-side',(160,192),(144,176))]:
            # Contain the same complete character: icons cannot become head crops.
            small=canvas.copy();small.thumbnail(fit,Image.Resampling.LANCZOS)
            square=Image.new('RGBA',sz)
            square.alpha_composite(small,((sz[0]-small.width)//2,(sz[1]-small.height)//2))
            target=ASSETS/f'fish-{phase}{suffix}.png'
            files[suffix]=write_asset(square,target)
            if suffix=='-icon':icons[phase]=base64.b64encode(target.read_bytes()).decode('ascii')
        manifest['states'][phase]={'source':'outputs/whale-soft-child-v2/'+phase+'.png','sourceSha256':digest(RAW/(phase+'.png')),'normalizedBounds':list(canvas.getchannel('A').getbbox()),'files':files}
    # A transparent full-body plugin icon; icon.svg is a pixel-identical PNG wrapper.
    icon=Image.new('RGBA',(256,256))
    icon_figure=Image.open(ASSETS/'fish-idle.png').convert('RGBA')
    icon_figure.thumbnail((232,232),Image.Resampling.LANCZOS)
    icon.alpha_composite(icon_figure,((256-icon_figure.width)//2,(256-icon_figure.height)//2))
    icon.save(ROOT/'icon.png',optimize=True)
    encoded=base64.b64encode((ROOT/'icon.png').read_bytes()).decode('ascii')
    (ROOT/'icon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="鲸哨"><image width="256" height="256" href="data:image/png;base64,'+encoded+'"/></svg>\n',encoding='utf8')
    (ASSETS/'artwork.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    client=ROOT/'client.js';text=client.read_text(encoding='utf8')
    for name,values in [('SPRITES',sprites),('NOTIFY_FACES',icons)]:
        pattern=r'    const '+name+r' = \{[\s\S]*?\n    \};'
        content='    const '+name+' = {\n'+''.join("      "+phase+": 'data:image/png;base64,"+values[phase]+"',\n" for phase in PHASES)+'    };'
        text,count=re.subn(pattern,lambda m:content,text,count=1);assert count==1,name
    client.write_text(text,encoding='utf8')
    print(json.dumps({'artwork':ID,'sourceSize':[1024,1536],'common':common,'runtimeContent':content_size,'clientBytes':client.stat().st_size,'iconBytes':(ROOT/'icon.png').stat().st_size,'runtimeAssetsBytes':sum(f['bytes'] for s in manifest['states'].values() for f in s['files'].values())},ensure_ascii=False))

if __name__=='__main__':main()
