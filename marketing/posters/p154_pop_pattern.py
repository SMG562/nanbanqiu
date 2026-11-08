from lib import *
from han import figure, flat, POP

META = dict(
    id=154, slug='pop-pattern', title='都不一样', lines=['每个人打球的样子，', '都不一样。'],
    style=['平面设计', '图案', '汉画像', '多彩'], tone='亮色', demo=False,
    concept='像一块现代印花布：4×4 的彩色方格，每格一个不同颜色、不同姿势的汉画像小人——发球、跨步、腾空、捡球、端着咖啡、坐着歇——颜色和姿势轮换，没有两格一样；每格角上一颗小球',
    use='多元、包容、新手和高手都欢迎；图案感强，适合做周边',
)


def svg():
    C = POP
    pal = [(C['coral'], C['cream']), (C['cobalt'], C['butter']), (C['mint'], C['navy']), (C['butter'], C['coral']),
           (C['pink'], C['cobalt']), (C['navy'], C['mint']), (C['orange'], C['cream']), (C['lilac'], C['navy'])]
    poses = [('serve', 1), ('lunge', -1), ('leap', 1), ('stand', -1), ('sip', 1), ('lunge', 1), ('serve', -1), ('sit', -1)]
    p = [f'<rect width="{W}" height="{H}" fill="{C["cream"]}"/>']
    x0, y0, s = 60, 400, 240
    k = 0
    for row in range(4):
        for col in range(4):
            bg, fg = pal[(row * 3 + col) % 8]
            pose, f = poses[(row * 5 + col * 3) % 8]
            x, y = x0 + col * s, y0 + row * 190
            p.append(f'<rect x="{x}" y="{y}" width="{s}" height="190" fill="{bg}"/>')
            sc = .62 if pose in ('serve', 'leap') else .7
            p.append(flat(figure(x + s / 2 + (10 if f > 0 else -10), y + 176, sc, pose, f, sash=pose not in ('sip', 'sit', 'pick')), fg))
            p.append(f'<circle cx="{x + s - 22}" cy="{y + 22}" r="9" fill="#C6EA3D"/>')
            k += 1
    p.append(tag('EVERYONE PLAYS', y=130, color=C['navy'], rule=C['coral'], op=.85))
    p.append(headline(META['lines'], y=236, size=50, colors=(C['navy'], C['coral']), lh=70, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
