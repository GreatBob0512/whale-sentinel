"""Bundle tight, high-resolution buddy frames as WebP so they stay sharp when scaled.

The concept art's character is ~46% of the panel width; at this frame's 2.06 h/w that
means ~78% of the panel height, which is what the CSS now uses.
"""
from pathlib import Path
from hashlib import sha256
import json, base64, re
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
FRAMES = WORKSPACE / 'outputs' / 'whale-buddy' / 'frames'
ASSETS = ROOT / 'assets'
PHASES = ['idle', 'running', 'waiting', 'done', 'error']


def digest(p): return sha256(p.read_bytes()).hexdigest()


def main():
    manifest = json.loads((ASSETS / 'artwork.json').read_text(encoding='utf8'))
    manifest['buddy'] = {
        'pose': 'standing, gripping the panel edge and pointing at it',
        'sheet': 'outputs/whale-buddy/buddy-five-white.png',
        'sheetSha256': digest(WORKSPACE / 'outputs' / 'whale-buddy' / 'buddy-five-white.png'),
        'format': 'webp',
        'crop': 'tight bounds, no transparent padding',
        'states': {},
    }
    inline = {}
    for phase in PHASES:
        src = Image.open(FRAMES / f'{phase}-tight.png').convert('RGBA')
        scale = 462 / src.height
        src = src.resize((max(1, round(src.width * scale)), 462), Image.Resampling.LANCZOS)
        out = ASSETS / f'buddy-{phase}.webp'
        src.save(out, format='WEBP', quality=58, method=4)
        saved = Image.open(out)
        assert saved.size == src.size, phase
        assert out.read_bytes()[:4] == b'RIFF' and out.read_bytes()[8:12] == b'WEBP', phase
        manifest['buddy']['states'][phase] = {
            'source': f'outputs/whale-buddy/frames/{phase}-tight.png',
            'sha256': digest(out),
            'bytes': out.stat().st_size,
            'size': list(src.size),
        }
        inline[phase] = base64.b64encode(out.read_bytes()).decode('ascii')

    # drop the old PNG buddy assets so nothing stale ships
    for phase in PHASES:
        old = ASSETS / f'buddy-{phase}.png'
        if old.exists():
            old.unlink()
    (ASSETS / 'artwork.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

    client = ROOT / 'client.js'
    text = client.read_text(encoding='utf8')
    block = ('    const BUDDY = {\n'
             + ''.join("      " + p + ": 'data:image/webp;base64," + inline[p] + "',\n" for p in PHASES)
             + '    };\n')
    text = re.sub(r'    const BUDDY = \{[\s\S]*?\n    \};\n', block, text, count=1)
    client.write_text(text, encoding='utf8')
    print(json.dumps({
        'buddyBytes': sum(s['bytes'] for s in manifest['buddy']['states'].values()),
        'clientBytes': client.stat().st_size,
        'sizes': [manifest['buddy']['states'][p]['size'] for p in PHASES][:1],
    }, ensure_ascii=False))


if __name__ == '__main__':
    main()
