from lib import *
from lin import blob, ink
from people import person
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish, slogan, lesson

META = dict(
    id=182, slug='textbook-labour', title='劳动课', lines=['打球之前，', '先把场地弄干净。'],
    style=['课本插画', '年代感', '勾线平涂', '南伴绿'], tone='浅色', demo=False,
    concept='六七十年代课本插画的画法：泛黄的纸、黑线勾边、平涂少色；同一块南伴绿的水泥球场上上劳动课——有人扫落叶、两个人推着石头压路滚、有人提着石灰桶画白线、两个人抬着一筐球；墙上还是那八个字；底下课文框「第十三课　劳动课」',
    use='年代感 / 社群里一起搭把手；回忆共鸣',
)


def svg():
    r = random.Random(182)
    p = [f'<defs>{DEFS}</defs>', f'<rect width="1080" height="1350" fill="{PAPER}"/>']
    p.append('<rect x="0" y="120" width="1080" height="300" fill="#E8D8B0"/><rect x="0" y="360" width="1080" height="60" fill="#9A4A34"/>')
    p.append(f'<rect x="0" y="120" width="1080" height="300" fill="none" stroke="{INK}" stroke-width="3"/>')
    slogan(p, '好好打球', 98, 190, 96, 12)
    slogan(p, '天天向上', 560, 190, 96, 12)
    p.append(f'<path d="M0 420 L1080 420 L1080 1110 L0 1110Z" fill="{GREEN}"/>')
    p.append(f'<path d="M0 420 L1080 420 L1080 1110 L0 1110Z" fill="url(#dots_t)" opacity=".18"/>')
    p.append('<path d="M120 1110 L250 460 L830 460 L960 1110 M540 460 L540 1110" stroke="#F4EED8" stroke-width="6" fill="none"/>')
    p.append('<path d="M190 780 L620 780" stroke="#F4EED8" stroke-width="6"/>')                                    # 画了一半的线
    p.append('<path d="M620 780 L890 780" stroke="#F4EED8" stroke-width="3" stroke-dasharray="6 14" opacity=".6"/>')
    for _ in range(40):                                                                                         # 落叶
        p.append(f'<ellipse cx="{r.uniform(60, 1020):.0f}" cy="{r.uniform(900, 1090):.0f}" rx="8" ry="4" transform="rotate({r.uniform(0, 180):.0f})" fill="{r.choice(["#D8A040", "#B8742A", "#E8C060"])}"/>')
    # 扫地的
    p.append(outlined(person(180, 1060, .95, 'teach', 1, 0, 1, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle='pony')))
    p.append(outlined(f'<line x1="250" y1="840" x2="300" y2="1050" stroke="#8A6A3A" stroke-width="6"/><path d="M280 1040 L330 1060 L320 1080 L270 1066Z" fill="#D8B060"/>'))
    # 推压路滚的两个人
    p.append(outlined('<rect x="430" y="606" width="120" height="70" rx="35" fill="#9A9A90"/><line x1="490" y1="640" x2="560" y2="560" stroke="#6A4A30" stroke-width="7"/>'))
    p.append(outlined(person(600, 680, .8, 'grip', -1, 2, 0, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle='short')))
    # 提着石灰桶画线的
    p.append(outlined(person(660, 800, .8, 'walk', 1, 1, 2, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle='bob')))
    p.append(outlined(f'<path d="M700 700 L736 700 L732 740 L704 740Z" fill="#E8E8E0"/><path d="M702 700 C708 684 728 684 734 700" stroke="{INK}" stroke-width="2" fill="none"/>'))
    p.append(f'<text x="718" y="728" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="12" fill="{INK}">石灰</text>')
    # 抬着球筐的两个人
    p.append(outlined(person(780, 1070, .95, 'hold', 1, 0, 0, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle='short')))
    p.append(outlined(person(990, 1070, .95, 'hold', -1, 3, 3, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle='pony')))
    p.append(outlined('<line x1="820" y1="830" x2="950" y2="830" stroke="#8A6A3A" stroke-width="8"/><path d="M850 834 L920 834 L910 900 L860 900Z" fill="#C8A060"/>'))
    for i in range(7):
        p.append(f'<circle cx="{862 + (i % 4) * 14}" cy="{846 - (i // 4) * 12}" r="8" fill="#C6EA3D" stroke="{INK}" stroke-width="1.6"/>')
    p.append(f'<text x="540" y="86" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="30" letter-spacing="12" fill="{INK}">劳 动 课</text>')
    lesson(p, '十三', '劳动课', ['打球之前，先把场地弄干净。', '扫落叶，压场地，画白线，把球捡回筐里。'])
    finish(p)
    return page(''.join(p))
