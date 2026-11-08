from lib import *
from lin import blob, ink
from people import person
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish, slogan, lesson

META = dict(
    id=181, slug='textbook-pe', title='体育课', lines=['好好打球，', '天天向上。'],
    style=['课本插画', '年代感', '勾线平涂', '南伴绿'], tone='浅色', demo=False,
    concept='六七十年代课本插画的画法：泛黄的纸、黑线勾边、平涂少色、印刷网点；学校的墙上一排红底大字「好好打球　天天向上」，墙下一块南伴绿的水泥球场，白衬衫蓝裤子的孩子们在上体育课——有人发球、有人在网前、老师吹着哨子，长凳上坐着等着轮换的同学；底下是课文框「第十二课　体育课」',
    use='年代感 / 回忆共鸣；适合节日、开学季、社群活动',
)


def svg():
    r = random.Random(181)
    p = [f'<defs>{DEFS}</defs>', f'<rect width="1080" height="1350" fill="{PAPER}"/>']
    p.append('<rect x="0" y="120" width="1080" height="420" fill="#E8D8B0"/>')                                    # 校舍的墙
    p.append(f'<rect x="0" y="470" width="1080" height="70" fill="#9A4A34"/>')
    for x in range(0, 1080, 60):
        p.append(f'<line x1="{x}" y1="470" x2="{x}" y2="540" stroke="#7A3A28" stroke-width="2"/>')
    p.append(f'<rect x="0" y="120" width="1080" height="420" fill="none" stroke="{INK}" stroke-width="3"/>')
    for x in (60, 960):                                                                                       # 窗
        p.append(f'<rect x="{x}" y="160" width="60" height="80" fill="#9AB8C8" stroke="{INK}" stroke-width="3"/><line x1="{x+30}" y1="160" x2="{x+30}" y2="240" stroke="{INK}" stroke-width="2"/>')
    slogan(p, '好好打球', 98, 290, 96, 12)
    slogan(p, '天天向上', 560, 290, 96, 12)
    p.append(f'<path d="M0 540 L1080 540 L1080 1110 L0 1110Z" fill="{GREEN}"/>')                                  # 南伴绿水泥场
    p.append(f'<path d="M0 540 L1080 540 L1080 1110 L0 1110Z" fill="url(#dots_t)" opacity=".18"/>')
    p.append('<path d="M140 1110 L260 580 L820 580 L940 1110 M200 846 L880 846 M540 580 L540 1110" stroke="#F4EED8" stroke-width="6" fill="none"/>')
    p.append(outlined('<rect x="120" y="830" width="840" height="10" fill="#F4EED8"/><rect x="116" y="800" width="10" height="70" fill="#5A4A3A"/><rect x="954" y="800" width="10" height="70" fill="#5A4A3A"/>'))
    p.append('<g opacity=".7">' + ''.join(f'<line x1="{x}" y1="840" x2="{x}" y2="866" stroke="{INK}" stroke-width="1.4"/>' for x in range(130, 955, 16)) + '</g>')
    trees = ''.join(ink([(x, 540), (x + 2, 380)], 14, '#6A4A30', 1, (0, 0)) + ''.join(blob(r, x + r.uniform(-24, 24), 330 + r.uniform(-60, 40), 30, 46, r.choice(['#4E8A4E', '#3E7A44']), 1) for _ in range(5)) for x in (30, 1050))
    p.append(outlined(trees))
    kids = [(330, 1080, 1.0, 'five', 1, 0, 0, '#FFFFFF', BLUE, 'short', 'fh'),
            (660, 800, .78, 'hold', -1, 1, 0, '#FFFFFF', BLUE, 'pony', 'fh'),
            (820, 820, .78, 'teach', -1, 0, 1, '#FFFFFF', BLUE, 'short', None)]
    for x, y, s_, pose, f, sk, hr, top, bot, hs, rk in kids:
        p.append(outlined(person(x, y, s_, pose, f, sk, hr, top, bot, shoe='#FFFFFF', sleeve='short', hairstyle=hs, racket_hand=rk)))
    p.append(outlined(person(1010, 1090, 1.0, 'hold', -1, 0, 0, '#F2EADA', '#6A6A6A', shoe='#2A2622', sleeve='long', hairstyle='short')))   # 老师
    p.append(f'<circle cx="964" cy="830" r="6" fill="#C8C8C8" stroke="{INK}" stroke-width="2"/><line x1="964" y1="830" x2="1000" y2="800" stroke="{INK}" stroke-width="1.5"/>')   # 哨子
    p.append(outlined('<rect x="40" y="980" width="200" height="16" fill="#B8864A"/><rect x="52" y="996" width="10" height="40" fill="#8A5A3A"/><rect x="218" y="996" width="10" height="40" fill="#8A5A3A"/>'))
    for i, x in enumerate((80, 130, 180)):
        p.append(outlined(person(x, 1040, .55, 'drink', 1, i % 3, i % 2, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle=['short', 'pony', 'short'][i])))
    p.append(f'<circle cx="420" cy="690" r="13" fill="#C6EA3D" stroke="{INK}" stroke-width="2.5"/><path d="M412 682 C417 687 417 693 412 698" stroke="#F6F8E0" stroke-width="2" fill="none"/>')
    p.append(f'<text x="540" y="86" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="30" letter-spacing="12" fill="{INK}">体 育 课</text>')
    lesson(p, '十二', '体育课', ['下午第三节是体育课。老师说：今天打网球。', '小林发球，小芳在网前，大家轮流上场。'])
    finish(p)
    return page(''.join(p))
