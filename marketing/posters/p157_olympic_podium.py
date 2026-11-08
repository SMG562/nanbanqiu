from lib import *
from picto import picto
from han import POP

META = dict(
    id=157, slug='olympic-podium', title='订到场的那个', lines=['真正的冠军，', '是订到场的那个。'],
    style=['运动会风', '领奖台', '图标', '幽默'], tone='亮色', demo=False,
    concept='一座三层领奖台，大色块、粗数字：最高一层站着一个举着双手的几何小人，台子上写的不是名次而是「订场」，两边是「带球」「准时」；身后放射状的彩色光带，天上飘着彩纸',
    use='订场的人最辛苦；约球局里的分工，好笑又暖',
)


def svg():
    r = random.Random(157)
    C = POP
    p = [f'<rect width="{W}" height="{H}" fill="{C["cream"]}"/>']
    cols = [C['coral'], C['butter'], C['mint'], C['cobalt'], C['pink'], C['orange'], C['lilac'], C['sky']]
    for k in range(16):                                                                                         # 放射光带
        a0, a1 = math.radians(180 + k * 11.25), math.radians(180 + (k + 1) * 11.25)
        p.append(f'<path d="M540 1000 L{540 + 1200*math.cos(a0):.0f} {1000 + 1200*math.sin(a0):.0f} L{540 + 1200*math.cos(a1):.0f} {1000 + 1200*math.sin(a1):.0f}Z" fill="{cols[k % 8]}" opacity=".22"/>')
    for _ in range(60):                                                                                         # 彩纸
        x, y = r.uniform(40, 1040), r.uniform(380, 820)
        p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{r.uniform(8, 16):.0f}" height="{r.uniform(4, 8):.0f}" transform="rotate({r.uniform(0, 180):.0f} {x:.0f} {y:.0f})" fill="{r.choice(cols)}"/>')
    steps = [(160, 860, 260, C['cobalt'], '2', '带球'), (420, 760, 240, C['coral'], '1', '订场'), (660, 900, 260, C['mint'], '3', '准时')]
    for x, top, w, c, n, lab in steps:
        p.append(f'<rect x="{x}" y="{top}" width="{w}" height="{1180 - top}" fill="{c}"/>')
        p.append(f'<text x="{x + w/2}" y="{top + 120}" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="110" fill="#FFFFFF">{n}</text>')
        p.append(f'<text x="{x + w/2}" y="{top + 180}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="40" letter-spacing="8" fill="#FFFFFF">{lab}</text>')
    p.append(picto(540, 652, 1.0, 'cheer', C['navy']))
    p.append(picto(290, 754, .9, 'wait', C['navy'], racket=False))
    p.append(picto(790, 794, .9, 'wait', C['navy'], racket=False))
    p.append('<circle cx="318" cy="690" r="11" fill="#C6EA3D"/><circle cx="270" cy="694" r="11" fill="#C6EA3D"/>')   # 带球的人怀里两颗球
    p.append(f'<circle cx="790" cy="670" r="18" fill="none" stroke="{C["navy"]}" stroke-width="4"/><path d="M790 670 l0 -10 M790 670 l8 4" stroke="{C["navy"]}" stroke-width="3"/>')   # 准时：小表
    p.append(tag('PODIUM', color=C['navy'], rule=C['coral'], op=.85))
    p.append(headline(META['lines'], y=272, size=58, colors=(C['navy'], C['coral']), lh=82, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
