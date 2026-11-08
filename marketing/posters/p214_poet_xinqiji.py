from lib import *
from poet import scholar, vtext, seal, footer

META = dict(
    id=214, slug='poet-xinqiji', title='灯火阑珊处', lines=['蓦然回首', '灯火阑珊处'],
    style=['古风', '诗人', '夜', '现代版式'], tone='亮色', demo=False,
    concept='辛弃疾《青玉案·元夕》：众里寻他千百度，蓦然回首，那人却在灯火阑珊处。上半截是元夕满天的灯笼，一串串圆灯排成现代的点阵；中间人山人海，是上百个小小的人影；右下角人群散尽的地方，一盏球场灯照着一小块南伴绿球场，那个人提着拍，回头在等。',
    use='诗人打球系列 · 辛弃疾；终于找到合适的球搭子主题',
)


def lantern(x, y, rr, c='#E8503A'):
    return (f'<circle cx="{x}" cy="{y}" r="{rr * 2.2:.0f}" fill="#FFB25A" opacity=".18" filter="url(#gl214)"/>'
            f'<path d="M{x} {y - rr * 1.6:.0f} V{y - rr:.0f}" stroke="#F2C94C" stroke-width="1.5"/>'
            f'<ellipse cx="{x}" cy="{y}" rx="{rr}" ry="{rr * .9:.1f}" fill="{c}"/><ellipse cx="{x - rr * .25:.1f}" cy="{y - rr * .2:.1f}" rx="{rr * .45:.1f}" ry="{rr * .5:.1f}" fill="#FFB25A" opacity=".45"/>'
            f'<rect x="{x - rr * .4:.1f}" y="{y - rr * .98:.1f}" width="{rr * .8:.1f}" height="{rr * .2:.1f}" fill="#F2C94C"/><rect x="{x - rr * .4:.1f}" y="{y + rr * .78:.1f}" width="{rr * .8:.1f}" height="{rr * .2:.1f}" fill="#F2C94C"/>'
            f'<path d="M{x} {y + rr * .98:.1f} v{rr * .7:.1f}" stroke="#F2C94C" stroke-width="2"/>')


def mini(x, y, s, c, head='#E9D2B4'):
    """人群里的小人：头 + 一截圆角身子。"""
    return f'<rect x="{x - 7 * s:.1f}" y="{y - 30 * s:.1f}" width="{14 * s:.1f}" height="{30 * s:.1f}" rx="{6 * s:.1f}" fill="{c}"/><circle cx="{x:.1f}" cy="{y - 36 * s:.1f}" r="{5.5 * s:.1f}" fill="{head}"/><circle cx="{x:.1f}" cy="{y - 38 * s:.1f}" r="{5 * s:.1f}" fill="#1E1E1E" opacity=".85"/>'


def svg():
    r = random.Random(214)
    p = ['<defs><linearGradient id="sky214" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14243C"/><stop offset="1" stop-color="#26405E"/></linearGradient>'
         '<filter id="gl214" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="10"/></filter>'
         '<linearGradient id="cone214" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF1C8" stop-opacity=".75"/><stop offset="1" stop-color="#FFF1C8" stop-opacity=".08"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sky214)"/>']
    # 灯笼：四串
    for k, (y0, sag, n, rr) in enumerate([(70, 40, 9, 16), (170, 60, 8, 20), (290, 70, 7, 24), (430, 80, 6, 28)]):
        xs0, xs1 = 330 - k * 20, 1100
        p.append(f'<path d="M{xs0} {y0} Q{(xs0 + xs1) / 2:.0f} {y0 + sag * 2} {xs1} {y0}" stroke="#7A6A5A" stroke-width="1.5" fill="none" opacity=".7"/>')
        for i in range(n):
            t = (i + .5) / n
            x = xs0 + (xs1 - xs0) * t
            y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * (y0 + sag * 2) + t * t * y0
            p.append(lantern(round(x), round(y + rr * 1.6), rr, r.choice(['#E8503A', '#E8503A', '#F07A3A', '#D8403A'])))
    # 人群（避开字和右下球场）
    cols = ['#3E5A78', '#5A4E78', '#7A5A6A', '#2E6A6A', '#4A6A8A', '#6A5A8A', '#8A4A5A']
    crowd = []
    while len(crowd) < 230:
        x, y = r.uniform(-10, 1090), r.uniform(630, 1190)
        if x < 320 and y < 780: continue
        if x > 560 and y > 820: continue
        if x < 340 and y < 860: continue
        if x > 620 and y > 760 and x < 1080: continue
        crowd.append((x, y))
    for x, y in sorted(crowd, key=lambda t: t[1]):
        s = .7 + (y - 630) / 560 * .9
        p.append(mini(x, y, s, r.choice(cols)))
    # 灯火阑珊处：一盏球场灯 + 一小块场
    p.append('<path d="M1000 1200 V760" stroke="#5A6A7A" stroke-width="8"/><rect x="964" y="744" width="72" height="22" rx="4" fill="#C9D2DA"/>')
    p.append('<path d="M970 766 L1030 766 L1100 1210 L640 1210Z" fill="url(#cone214)"/>')
    p.append('<path d="M700 1060 L1060 1060 L1100 1210 L640 1210Z" fill="#2F8A6E"/><path d="M712 1068 L1050 1068 L1086 1202 L656 1202Z M871 1068 V1202 M690 1130 H1066" stroke="#F4EED8" stroke-width="3" fill="none" opacity=".9"/>')
    p.append(scholar(860, 1150, 1.2, robe='#F3EEE0', sash='#C23A2B', flip=-1, arm='down', wind=.3, woman=True))
    p.append('<path d="M0 1210 H1080 V1350 H0Z" fill="#0F1C2E"/>')
    # 字
    p.append(vtext('灯火阑珊处', 150, 190, 104, '#FFE6B0', 1.12, 700))
    p.append(vtext('众里寻他千百度', 300, 206, 30, '#C9D2DA', 1.5, 500))
    p.append(vtext('蓦然回首', 256, 206, 30, '#F2A65A', 1.5, 600))
    p.append(seal(236, 520, 40, '南伴'))
    footer(p, '找了很久的球搭子，原来在这儿', '诗人打球 · 捌 / 辛弃疾《青玉案·元夕》', 'THERE YOU ARE, WHERE THE LIGHTS GROW DIM', c2='#C9D2DA', c3='#8A9AAA')
    return page(''.join(p))
