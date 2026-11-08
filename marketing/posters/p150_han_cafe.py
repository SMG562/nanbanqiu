from lib import *
from han import MARBLE, marble_bg, relief, figure, cloud_scroll

META = dict(
    id=150, slug='han-cafe', title='先来杯咖啡', lines=['打完球，', '先来杯咖啡。'],
    style=['汉风', '画像石', '现代日常', '墨尔本'], tone='浅色', demo=False,
    concept='汉画像石的宴饮图换成墨尔本街角咖啡馆：一张小圆桌，两个汉代小人对坐，一个举杯、一个说话，杯口冒出的热气刻成汉代云气纹；两支球拍靠在桌边，桌上一罐球，头顶一条遮阳篷',
    use='墨尔本咖啡文化 / 打完球的社交；古今相通',
)


def svg():
    p = [f'<defs>{MARBLE}</defs>', marble_bg(W, H, '#ECE6DA')]
    p.append('<rect x="50" y="440" width="980" height="640" fill="#DCD4C4"/><rect x="50" y="440" width="980" height="640" fill="none" stroke="#A89E8A" stroke-width="4"/>')
    p.append('<rect x="50" y="440" width="980" height="12" fill="#8E8470" opacity=".3"/>')
    c = '<rect x="80" y="1040" width="920" height="6" fill="FILL"/>'
    awn = '<path d="M90 470 L990 470 L990 540 ' + ' '.join(f'Q{990 - i*75 - 37:.0f} 580 {990 - (i+1)*75:.0f} 540' for i in range(12)) + 'Z" fill="FILL"/>'   # 遮阳篷
    c += awn
    c += '<line x1="470" y1="560" x2="470" y2="600" stroke="FILL" stroke-width="4"/><line x1="610" y1="560" x2="610" y2="600" stroke="FILL" stroke-width="4"/><rect x="440" y="600" width="200" height="84" rx="6" fill="FILL"/>'   # 吊牌
    c += '<ellipse cx="540" cy="860" rx="170" ry="16" fill="FILL"/><rect x="532" y="870" width="16" height="160" fill="FILL"/><rect x="480" y="1026" width="120" height="14" rx="6" fill="FILL"/>'   # 圆桌
    c += '<rect x="474" y="814" width="40" height="40" rx="6" fill="FILL"/><rect x="580" y="822" width="34" height="32" rx="4" fill="FILL"/>'   # 两只杯
    c += '<rect x="520" y="800" width="36" height="54" rx="6" fill="FILL"/>'                                   # 球罐
    c += figure(330, 1040, 1.3, 'sip', 1, sash=False) + figure(750, 1040, 1.3, 'sit', -1, sash=False)
    c += '<rect x="250" y="960" width="110" height="12" fill="FILL"/><rect x="720" y="960" width="110" height="12" fill="FILL"/>'
    c += '<line x1="700" y1="1036" x2="680" y2="900" stroke="FILL" stroke-width="5"/><ellipse cx="676" cy="878" rx="15" ry="23" transform="rotate(-8 676 878)" fill="none" stroke="FILL" stroke-width="5"/>'
    c += '<line x1="390" y1="1036" x2="410" y2="900" stroke="FILL" stroke-width="5"/><ellipse cx="414" cy="878" rx="15" ry="23" transform="rotate(8 414 878)" fill="none" stroke="FILL" stroke-width="5"/>'
    for x, y in [(486, 780), (590, 790)]:                                                                     # 热气 = 云气纹
        c += f'<g transform="translate({x} {y}) rotate(-80) scale(.42)">' + cloud_scroll(0, 0, 1, 1, 12) + '</g>'
    p.append(relief(c, face='#F6F2EA', shadow='#6E665A', d=5))
    p.append('<circle cx="538" cy="798" r="9" fill="#C6EA3D"/>')
    p.append(f'<text x="540" y="660" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="46" letter-spacing="10" fill="#9E2A2B">咖啡</text>')
    p.append(tag('HAN · MELBOURNE · FLAT WHITE', color='#4A463E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=272, size=50, colors=('#3A362E', '#9E2A2B'), lh=72, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
