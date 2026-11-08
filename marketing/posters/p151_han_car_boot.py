from lib import *
from han import MARBLE, marble_bg, relief, figure, cloud_scroll

META = dict(
    id=151, slug='han-car-boot', title='常年放着一支拍', lines=['后备箱里，', '常年放着一支拍。'],
    style=['汉风', '画像石', '现代日常', '幽默'], tone='浅色', demo=False,
    concept='汉画像石里的车马出行换成一辆小汽车：车停着，后备箱掀开，一个汉代小人弯腰往里看——里面是拍、球罐、一双球鞋，挤得满满当当；车头前另一个人等不及，已经在空挥',
    use='随时能打 / 说走就走；古今对照',
)


def svg():
    p = [f'<defs>{MARBLE}</defs>', marble_bg(W, H, '#ECE6DA')]
    p.append('<rect x="50" y="440" width="980" height="640" fill="#DCD4C4"/><rect x="50" y="440" width="980" height="640" fill="none" stroke="#A89E8A" stroke-width="4"/>')
    p.append('<rect x="50" y="440" width="980" height="12" fill="#8E8470" opacity=".3"/>')
    c = '<rect x="80" y="1040" width="920" height="6" fill="FILL"/>'
    c += '<path d="M340 1000 L340 900 C350 860 390 840 430 830 L500 760 C520 744 560 736 600 736 L760 736 C790 736 806 760 814 790 L816 1000Z" fill="FILL"/>'   # 车身（掀背）
    c += '<path d="M814 790 L900 660 L930 676 L846 806Z" fill="FILL"/>'                                       # 掀起的尾门
    for x in (440, 740):
        c += f'<circle cx="{x}" cy="1010" r="36" fill="FILL"/>'
    c += figure(900, 1040, 1.3, 'bend', -1, sash=False)
    c += figure(170, 1040, 1.3, 'serve', 1)                                                                  # 车头前：另一个人等不及，先挥起来了
    for x, y, s_, f in [(140, 520, .6, 1), (620, 520, .55, -1)]:
        c += cloud_scroll(x, y, s_, f, 6)
    p.append(relief(c, face='#F6F2EA', shadow='#6E665A', d=5))
    p.append('<path d="M560 760 L740 760 C760 760 772 776 776 800 L776 840 L560 840Z" fill="#CFC6B4"/>')        # 车窗凹面
    p.append('<rect x="712" y="846" width="100" height="150" fill="#CFC6B4"/>')                                 # 打开的后备箱（凹进去）
    stuff = '<line x1="724" y1="990" x2="760" y2="880" stroke="FILL" stroke-width="5"/><ellipse cx="764" cy="866" rx="13" ry="20" transform="rotate(18 764 866)" fill="none" stroke="FILL" stroke-width="5"/>'
    stuff += '<rect x="772" y="940" width="26" height="52" rx="5" fill="FILL"/><path d="M724 994 C724 976 744 970 760 976 L770 994Z" fill="FILL"/>'
    p.append(relief(stuff, face='#F6F2EA', shadow='#6E665A', d=3))
    p.append('<circle cx="790" cy="930" r="9" fill="#C6EA3D"/>')
    p.append(tag('HAN · CHARIOT, UPDATED', color='#4A463E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=272, size=50, colors=('#3A362E', '#9E2A2B'), lh=72, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
