from lib import *
from han import MARBLE, marble_bg, relief, figure, cloud_scroll

META = dict(
    id=147, slug='han-brick', title='上半场打下半场捡', lines=['上半场打，', '下半场捡。'],
    style=['汉风', '画像砖', '叙事', '幽默'], tone='浅色', demo=False,
    concept='借汉画像砖「上下两栏」的叙事：上栏是一场打得热火朝天的球，人腾空、跨步，球在空中飞，云气和飞鸟；下栏是同一群人弯着腰满场捡球、往筐里扔——汉砖的庄重格式，讲一句打球人的大实话',
    use='练球 / 一起打球的真实日常；看一会儿才笑',
)


def svg():
    r = random.Random(147)
    p = [f'<defs>{MARBLE}</defs>', marble_bg(W, H, '#ECE6DA')]
    for y0 in (420, 780):                                                                                       # 两栏
        p.append(f'<rect x="60" y="{y0}" width="960" height="330" fill="#DCD4C4"/>')
        p.append(f'<rect x="60" y="{y0}" width="960" height="330" fill="none" stroke="#A89E8A" stroke-width="4"/>')
        p.append(f'<rect x="60" y="{y0}" width="960" height="12" fill="#8E8470" opacity=".3"/>')
    up = ''
    up += figure(200, 720, .95, 'serve', 1) + figure(420, 720, .95, 'leap', -1) + figure(640, 720, .95, 'lunge', -1) + figure(860, 720, .95, 'lunge', 1)
    up += '<rect x="530" y="660" width="8" height="60" fill="FILL"/>' + '<rect x="80" y="722" width="920" height="6" fill="FILL"/>'
    for x, y, s, f in [(120, 480, .6, 1), (700, 470, .55, -1), (840, 500, .5, 1)]:
        up += cloud_scroll(x, y, s, f, 6)
    for x, y in [(330, 470), (370, 456), (560, 480)]:
        up += f'<path d="M{x-14} {y} Q{x-6} {y-11} {x} {y} Q{x+6} {y-11} {x+14} {y} Q{x} {y+5} {x-14} {y}Z" fill="FILL"/>'
    p.append(relief(up, face='#F6F2EA', shadow='#6E665A', d=4))
    for x, y in [(300, 520), (510, 470)]:
        p.append(f'<circle cx="{x}" cy="{y}" r="9" fill="#C6EA3D"/>')
    dn = ''
    dn += figure(190, 1080, .95, 'pick', 1) + figure(420, 1080, .95, 'pick', -1) + figure(640, 1080, .95, 'pick', 1) + figure(900, 1080, .95, 'pick', -1)
    dn += '<rect x="80" y="1082" width="920" height="6" fill="FILL"/>'
    dn += '<path d="M740 1080 L800 1080 L810 1020 L730 1020Z" fill="FILL"/>'                                       # 球筐
    p.append(relief(dn, face='#F6F2EA', shadow='#6E665A', d=4))
    for _ in range(22):
        p.append(f'<circle cx="{r.uniform(100, 1000):.0f}" cy="{r.uniform(1050, 1076):.0f}" r="7" fill="#C6EA3D"/>')
    for x in (750, 770, 790):
        p.append(f'<circle cx="{x}" cy="1016" r="7" fill="#C6EA3D"/>')
    p.append(tag('HAN · BRICK', color='#4A463E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=272, size=50, colors=('#3A362E', '#9E2A2B'), lh=72, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
