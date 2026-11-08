from lib import *
from lin import blob
from people import person
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish

META = dict(
    id=189, slug='story-first-serve', title='第一次发过网', lines=['第一次，', '发球过网了。'],
    style=['课本插画', '仰拍', '故事', '明亮'], tone='亮色', demo=False,
    concept='换一个机位讲故事：从地面往上仰拍，一个孩子高高举着拍子，刚把球发出去，球飞进一大片蓝天；他身后低低的围网上挂着「好好打球　天天向上」；画面只有天、人、球和一排红字，一眼看懂：第一次发球过网的那一刻',
    use='新手 / 第一次；明亮、开心、一眼看懂',
)


def svg():
    r = random.Random(189)
    p = [f'<defs>{DEFS}<linearGradient id="sk189" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5EAEE0"/><stop offset="1" stop-color="#CDE8F2"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sk189)"/>']
    for cx, cy, s in [(220, 520, 1), (860, 380, .8), (700, 760, .6)]:                                              # 平涂的白云
        p.append(outlined(f'<path d="M{cx - 120*s:.0f} {cy:.0f} C{cx - 120*s:.0f} {cy - 40*s:.0f} {cx - 70*s:.0f} {cy - 60*s:.0f} {cx - 40*s:.0f} {cy - 40*s:.0f} C{cx - 20*s:.0f} {cy - 90*s:.0f} {cx + 60*s:.0f} {cy - 90*s:.0f} {cx + 70*s:.0f} {cy - 40*s:.0f} C{cx + 110*s:.0f} {cy - 50*s:.0f} {cx + 130*s:.0f} {cy - 20*s:.0f} {cx + 120*s:.0f} {cy:.0f}Z" fill="#FFFFFF"/>'))
    # 低低的围网 + 八块红牌子（仰拍，所以围网在画面下方）
    p.append(f'<rect y="1000" width="1080" height="150" fill="url(#mesh_t)" opacity=".8"/>')
    p.append(''.join(f'<rect x="{x - 4}" y="990" width="8" height="160" fill="#2E5A44"/>' for x in range(20, 1080, 130)))
    p.append('<rect y="986" width="1080" height="8" fill="#2E5A44"/>')
    for i, ch in enumerate('好好打球天天向上'):
        x = 40 + i * 126 + (24 if i >= 4 else 0)
        p.append(f'<rect x="{x}" y="1010" width="96" height="104" fill="{RED}" stroke="#7A2418" stroke-width="2"/><text x="{x + 48}" y="1090" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="74" fill="#F7E9C8">{ch}</text>')
    p.append(f'<rect y="1150" width="1080" height="200" fill="{GREEN}"/><line x1="0" y1="1190" x2="1080" y2="1190" stroke="#F4EED8" stroke-width="8"/>')
    # 孩子：仰拍的大人物，举拍刚发出球
    p.append(outlined(person(560, 1300, 2.7, 'five', 1, 0, 0, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle='short', racket_hand='fh')))
    p.append('<path d="M760 320 Q800 220 860 150" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="4 14" fill="none" stroke-linecap="round"/>')
    p.append(f'<circle cx="880" cy="130" r="30" fill="#C6EA3D" stroke="{INK}" stroke-width="3"/><path d="M864 114 C874 124 874 136 864 146" stroke="#F6F8E0" stroke-width="4" fill="none"/>')
    p.append(f'<text x="80" y="230" font-family="{SERIF}" font-weight="900" font-size="72" letter-spacing="4" fill="{INK}">第一次，</text>')
    p.append(f'<text x="80" y="320" font-family="{SERIF}" font-weight="900" font-size="72" letter-spacing="4" fill="{RED}">发球过网了。</text>')
    p.append(f'<text x="84" y="372" font-family="{SERIF}" font-weight="500" font-size="26" letter-spacing="3" fill="{INK}">那天回家，一路都在笑。</text>')
    p.append(f'<circle cx="902" cy="1286" r="8" fill="#C6EA3D" stroke="{INK}" stroke-width="2"/><circle cx="916" cy="1296" r="5" fill="#C6EA3D" stroke="{INK}" stroke-width="1.6"/><text x="1000" y="1302" text-anchor="end" font-family="{SERIF}" font-weight="900" font-size="24" letter-spacing="4" fill="#F7E9C8">南伴球</text>')
    finish(p)
    return page(''.join(p))
