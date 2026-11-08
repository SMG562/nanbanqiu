from lib import *
from lin import blob
from people import person, front
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish

META = dict(
    id=191, slug='story-ask', title='可以一起打吗', lines=['可以一起打吗？'],
    style=['课本插画', '过肩', '故事', '明亮'], tone='亮色', demo=False,
    concept='换一个机位讲故事：镜头站在一个孩子身后，越过他的肩膀看——他背着拍子站在铁丝网外，网里几个人正在打球，网上挂着「好好打球　天天向上」；我们看不到他的脸，只看到他攥紧的手，一眼看懂：他想问一句「可以一起打吗？」',
    use='找球友 / 第一次加入（南伴球最核心的那一刻）；动人、一眼看懂',
)


def svg():
    r = random.Random(191)
    p = [f'<defs>{DEFS}<linearGradient id="sk191" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8CC4E6"/><stop offset="1" stop-color="#E8EED8"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sk191)"/>']
    trees = ''.join(f'<rect x="{x - 3}" y="470" width="6" height="90" fill="#6A4A30"/>' + ''.join(blob(r, x + r.uniform(-8, 8), 440 + r.uniform(-40, 30), 14, 34, r.choice(['#3E7A44', '#4E8A4E', '#5E9A56']), 1) for _ in range(3)) for x in range(20, 1080, 60))
    p.append(outlined(trees))
    p.append(f'<rect y="560" width="1080" height="790" fill="{GREEN}"/><path d="M80 1350 L300 600 L780 600 L1000 1350 M150 900 L930 900" stroke="#F4EED8" stroke-width="6" fill="none"/>')
    p.append(outlined('<rect x="120" y="720" width="840" height="8" fill="#F4EED8"/><rect x="116" y="690" width="8" height="60" fill="#4A4A4A"/><rect x="956" y="690" width="8" height="60" fill="#4A4A4A"/>'))
    p.append(outlined(person(880, 690, .62, 'five', -1, 1, 0, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle='pony', racket_hand='fh')))
    p.append(outlined(person(640, 860, .8, 'hold', 1, 0, 1, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle='short', racket_hand='fh')))
    p.append(f'<circle cx="790" cy="540" r="10" fill="#C6EA3D" stroke="{INK}" stroke-width="2"/>')
    # 铁丝网 + 八块红牌子（在网外看的人眼前）
    p.append('<rect y="300" width="1080" height="830" fill="url(#mesh_t)" opacity=".7"/>')
    p.append(''.join(f'<rect x="{x - 5}" y="290" width="10" height="840" fill="#2E5A44"/>' for x in (40, 380, 720, 1060)))
    p.append('<rect y="284" width="1080" height="10" fill="#2E5A44"/>')
    for i, ch in enumerate('好好打球天天向上'):
        x = 52 + i * 122 + (20 if i >= 4 else 0)
        p.append(f'<rect x="{x}" y="320" width="96" height="104" fill="{RED}" stroke="#7A2418" stroke-width="2"/><text x="{x + 48}" y="400" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="74" fill="#F7E9C8">{ch}</text>')
    # 网外的孩子：背影，背着拍，手攥着网
    bx = 300
    bk = front(bx, 1460, 3.4, 0, 0, '#F2C8C0', BLUE, hairstyle='short', bag=None)
    bk += f'<ellipse cx="{bx}" cy="{1460 - 328 * 3.4:.0f}" rx="{20 * 3.4:.0f}" ry="{24 * 3.4:.0f}" fill="#2A1E18"/>'                    # 后脑勺
    bk += f'<g transform="rotate(-18 {bx + 40} 700)"><rect x="{bx + 20}" y="480" width="44" height="300" rx="20" fill="#176B4D"/><ellipse cx="{bx + 42}" cy="460" rx="46" ry="58" fill="#176B4D"/></g>'   # 背上的拍包
    p.append(outlined(bk))
    p.append(f'<text x="600" y="190" font-family="{SERIF}" font-weight="900" font-size="64" letter-spacing="4" fill="{INK}">可以一起打吗？</text>')
    p.append(f'<text x="604" y="240" font-family="{SERIF}" font-weight="500" font-size="24" letter-spacing="3" fill="{INK}">那年夏天，这一句想了一下午。</text>')
    p.append(f'<circle cx="902" cy="1286" r="8" fill="#C6EA3D" stroke="{INK}" stroke-width="2"/><circle cx="916" cy="1296" r="5" fill="#C6EA3D" stroke="{INK}" stroke-width="1.6"/><text x="1000" y="1302" text-anchor="end" font-family="{SERIF}" font-weight="900" font-size="24" letter-spacing="4" fill="#F7E9C8">南伴球</text>')
    finish(p)
    return page(''.join(p))
