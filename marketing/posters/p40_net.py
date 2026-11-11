from lib import *

META = dict(
    id=40, slug='net', title='隔着一张网', lines=['隔着一张网，', '才有来有回。'],
    style=['信息图', '极简', '排版'], tone='浅色', demo=False,
    concept='侧视物理图：球网只是一根细线，球的抛物线频闪越过它，从「你」到「TA」；有边界才有回合',
    use='品牌理念：来回的关系；约球的本质',
)


def svg():
    random.seed(40)
    ink, gy = '#0B3B2A', 1050
    x0, x1, ytop = 190, 890, 620
    pts = []
    for i in range(9):
        t = i / 8
        pts.append((x0 + (x1 - x0) * t, 1000 - 4 * (1000 - ytop) * t * (1 - t)))
    path = 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in [(x0 + (x1 - x0) * k / 60, 1000 - 4 * (1000 - ytop) * (k / 60) * (1 - k / 60)) for k in range(61)])
    balls = ''.join(f'<g opacity="{.1 + .9 * (i / 8) ** 1.6:.2f}">{seamdisc(x, y, 30, -22 + i * 20, ink, C["lime"], f"g{i}")}</g>' for i, (x, y) in enumerate(pts))
    mesh = ''.join(f'<path d="M{540-14} {gy-10-j*12} H{540+18}"/>' for j in range(12))
    body = f'''
<rect width="{W}" height="{H}" fill="#F3E6CC"/>
{tag('A NET', color=ink, rule='#E8643C', op=.85, weight=700)}
{headline(META['lines'], y=330, size=96, colors=(ink, '#E8643C'), ls=3)}
<path d="{path}" fill="none" stroke="{ink}" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round" opacity=".55"/>
<path d="M540 {gy} V{gy-150}" stroke="{ink}" stroke-width="6" stroke-linecap="round"/><path d="M522 {gy-150} H558" stroke="#E8643C" stroke-width="7" stroke-linecap="round"/>
<g stroke="{ink}" stroke-width="2" opacity=".6">{mesh}</g>
<path d="M120 {gy} H960" stroke="{ink}" stroke-width="3"/>
<g stroke="{ink}" stroke-width="2" opacity=".5">{''.join(f'<path d="M{x} {gy} l-12 18"/>' for x in range(150, 960, 30))}</g>
{balls}
<text x="{x0}" y="1118" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="38" fill="{ink}">你</text>
<text x="{x1}" y="1116" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="30" letter-spacing="4" fill="{ink}">TA</text>
{wordmark(1268, ink, sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
