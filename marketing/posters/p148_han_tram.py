from lib import *
from han import MARBLE, marble_bg, relief, figure, cloud_scroll

META = dict(
    id=148, slug='han-tram', title='坐到终点', lines=['电车坐到终点，', '就是球场。'],
    style=['汉风', '画像石', '现代日常', '幽默'], tone='浅色', demo=False,
    concept='汉画像石的刻法刻一辆墨尔本电车：长长的车身、受电弓、头顶的电线，车窗里一排汉代小人，每人肩上冒出一个拍头；车头的路牌上刻着「球场」两个字，一个乘客手里攥着一颗荧光球',
    use='墨尔本日常 / 坐电车去打球；古今混搭、看一会儿才笑',
)


def svg():
    r = random.Random(148)
    p = [f'<defs>{MARBLE}</defs>', marble_bg(W, H, '#ECE6DA')]
    p.append('<rect x="50" y="440" width="980" height="640" fill="#DCD4C4"/><rect x="50" y="440" width="980" height="640" fill="none" stroke="#A89E8A" stroke-width="4"/>')
    p.append('<rect x="50" y="440" width="980" height="12" fill="#8E8470" opacity=".3"/>')
    for x in range(70, 1020, 28):
        p.append(f'<path d="M{x} 468 l14 -10 l14 10 l-14 10Z" fill="none" stroke="#A89E8A" stroke-width="1.6"/>')
    c = ''
    c += '<rect x="70" y="560" width="940" height="5" fill="FILL"/>'                                              # 电线
    c += '<path d="M520 702 L560 640 L600 702 M540 670 L580 670 L560 562" stroke="FILL" stroke-width="5" fill="none"/>'   # 受电弓
    c += '<path d="M120 960 L120 740 C120 716 140 702 164 702 L900 702 C940 702 968 722 978 760 L990 960Z" fill="FILL"/>'   # 车身
    c += '<rect x="90" y="1002" width="900" height="8" fill="FILL"/>'                                              # 轨道
    for x in (210, 330, 720, 840):
        c += f'<circle cx="{x}" cy="980" r="24" fill="FILL"/>'
    for x, y, s_, f in [(100, 520, .5, 1), (760, 520, .5, -1)]:
        c += cloud_scroll(x, y, s_, f, 6)
    p.append(relief(c, face='#F6F2EA', shadow='#6E665A', d=5))
    # 车窗（凹进去）+ 窗里的人
    for i, x in enumerate(range(170, 830, 110)):
        p.append(f'<rect x="{x}" y="740" width="88" height="110" rx="6" fill="#CFC6B4"/><rect x="{x}" y="740" width="88" height="10" fill="#9A907C" opacity=".5"/>')
        ppl = f'<circle cx="{x + 44}" cy="800" r="16" fill="FILL"/><circle cx="{x + 38}" cy="782" r="7" fill="FILL"/>'
        ppl += f'<path d="M{x + 14} 850 C{x + 18} 826 {x + 30} 816 {x + 44} 816 C{x + 58} 816 {x + 70} 826 {x + 74} 850Z" fill="FILL"/>'
        if i % 2 == 0:
            ppl += f'<line x1="{x + 66}" y1="830" x2="{x + 76}" y2="776" stroke="FILL" stroke-width="4"/><ellipse cx="{x + 78}" cy="764" rx="9" ry="13" fill="none" stroke="FILL" stroke-width="4"/>'
        p.append(relief(ppl, face='#F6F2EA', shadow='#6E665A', d=3))
    p.append('<circle cx="566" cy="832" r="8" fill="#C6EA3D"/>')
    p.append('<rect x="890" y="730" width="70" height="44" fill="#CFC6B4"/>')                                    # 车头路牌
    p.append(f'<text x="925" y="764" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="28" fill="#9E2A2B">球场</text>')
    p.append(tag('HAN · MELBOURNE TRAM', color='#4A463E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=272, size=50, colors=('#3A362E', '#9E2A2B'), lh=72, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
