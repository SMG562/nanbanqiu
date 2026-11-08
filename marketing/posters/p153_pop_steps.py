from lib import *
from han import figure, flat, cloud_scroll, POP

META = dict(
    id=153, slug='pop-steps', title='步数靠这一场', lines=['今天的步数，', '靠这一场了。'],
    style=['平面设计', '色块', '汉画像', '多彩'], tone='亮色', demo=False,
    concept='大块撞色：珊瑚红、粉、奶黄三道斜色带铺满画面，一颗巨大的荧光球从右边切进来；两个汉画像小人一个腾空、一个跨步，剪影一黑一白，脚下是一条白色底线；汉代云气纹变成了几道彩色的线',
    use='运动 / 久坐的上班族；明快、有活力',
)


def svg():
    C = POP
    p = [f'<rect width="{W}" height="{H}" fill="{C["pink"]}"/>',
         f'<path d="M0 520 L1080 340 L1080 760 L0 940Z" fill="{C["coral"]}"/>',
         f'<path d="M0 940 L1080 760 L1080 1350 L0 1350Z" fill="{C["butter"]}"/>']
    p.append('<circle cx="1000" cy="560" r="300" fill="#C6EA3D"/>')
    p.append('<path d="M790 340 C900 470 900 650 790 780" stroke="#F6F8E0" stroke-width="22" fill="none" stroke-linecap="round"/>')
    for x, y, s, f, c in [(80, 470, .9, 1, C['cobalt']), (360, 420, .7, -1, C['navy']), (120, 1040, .8, 1, C['coral'])]:
        p.append(flat(cloud_scroll(x, y, s, f, 7), c))
    p.append(f'<rect x="60" y="1090" width="900" height="8" fill="#FFFFFF"/>')
    p.append(flat(figure(270, 1090, 2.3, 'leap', 1), C['navy']))
    p.append(flat(figure(640, 1090, 2.1, 'lunge', -1), '#FFFFFF'))
    p.append(f'<circle cx="420" cy="500" r="16" fill="#C6EA3D" stroke="{C["navy"]}" stroke-width="3"/>')
    p.append(tag('10,000 STEPS', color=C['navy'], rule=C['cobalt'], op=.85))
    p.append(headline(META['lines'], y=272, size=60, colors=(C['navy'], '#FFFFFF'), lh=84, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
