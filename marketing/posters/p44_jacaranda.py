from lib import *

META = dict(
    id=44, slug='jacaranda', title='蓝花楹', lines=['蓝花楹落满了球场。'],
    style=['写实光影', '风景'], tone='深色', demo=False,
    concept='头顶是淡紫的蓝花楹树冠，球场铺满落花，一颗球躺在白线边；墨尔本十一月的颜色',
    use='春末夏初的约球季；地域感（墨尔本蓝花楹）',
)


def svg():
    random.seed(44)
    r = random.Random(44)
    cols = ['#B79CE8', '#9C7FD6', '#D5C2F5', '#8A6BC8', '#C7B0F0', '#E6DAFA']
    canopy = ''
    def edge(x):
        return 300 + 110 * math.sin(x / 150 + 1) + 70 * math.sin(x / 60) + 40 * math.sin(x / 27 + 2)
    layers = []
    for lay, (n, rr, bl) in enumerate([(70, (14, 30), 'bl14'), (110, (7, 18), 'bl6'), (160, (4, 11), None)]):
        g = ''
        for _ in range(n):
            cx = r.uniform(-30, 1110); cy = r.uniform(-30, edge(cx))
            for _ in range(r.randint(10, 22)):
                x, y = cx + r.gauss(0, 34), cy + r.gauss(0, 26)
                if y > edge(x) + 40: continue
                g += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r.uniform(*rr):.1f}" fill="{r.choice(cols)}" opacity="{r.uniform(.7,1):.2f}"/>'
        canopy += f'<g filter="url(#{bl})">{g}</g>' if bl else f'<g>{g}</g>'
    branches = f'<path d="M-20 90 C180 140 320 100 470 190 M1100 40 C900 110 790 70 640 170 M300 -20 C330 90 420 150 440 240" stroke="#3B2A3A" stroke-width="10" fill="none" stroke-linecap="round" opacity=".75"/>'
    dapple = ''.join(f'<ellipse cx="{r.uniform(80,1000):.0f}" cy="{r.uniform(620,1100):.0f}" rx="{r.uniform(24,60):.0f}" ry="{r.uniform(12,26):.0f}" fill="#FFF6D8" opacity="{r.uniform(.05,.14):.2f}" filter="url(#bl14)"/>' for _ in range(16))
    petals = ''
    for _ in range(420):
        y = 560 + (r.random() ** .8) * 700
        x = r.uniform(-20, 1100)
        s = .6 + (y - 560) / 700 * 1.5
        petals += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{4.5*s:.1f}" ry="{2.2*s:.1f}" transform="rotate({r.uniform(0,180):.0f} {x:.0f} {y:.0f})" fill="{r.choice(cols)}" opacity="{r.uniform(.55,.95):.2f}"/>'
    body = f'''
<defs><linearGradient id="sky44" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CFE3F2"/><stop offset="1" stop-color="#F6FAFC"/></linearGradient><linearGradient id="gd44" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F7F57"/><stop offset=".5" stop-color="#1E6B4A"/><stop offset="1" stop-color="#0B3B2A"/></linearGradient>
<radialGradient id="vg44" cx="50%" cy="60%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#021008" stop-opacity=".7"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#sky44)"/>
<rect y="540" width="{W}" height="{H-540}" fill="url(#gd44)"/>
<path d="M0 540 Q270 505 540 535 T1080 520 V580 H0Z" fill="#134A33"/>
<g stroke="#F7F3E6" stroke-width="4" fill="none" opacity=".85" stroke-linecap="round">
  <path d="M-40 1030 L1120 1030"/><path d="M80 760 L-60 1030 M1000 760 L1140 1030"/><path d="M110 760 H970" stroke-width="3" opacity=".8"/><path d="M540 760 V1030" stroke-width="3"/>
</g>
{dapple}
<g>{canopy}</g>
{petals}
<ellipse cx="420" cy="1062" rx="46" ry="9" fill="#000" opacity=".5" filter="url(#bl6)"/>
{ball('b', 420, 1030, 40, rot=15)}
{''.join(f'<ellipse cx="{x}" cy="{y}" rx="9" ry="4.4" transform="rotate({a} {x} {y})" fill="#C7B0F0"/>' for x, y, a in [(380, 1050, 20), (462, 1044, 150), (440, 1070, 60), (396, 1064, 110)])}
<rect width="{W}" height="{H}" fill="url(#vg44)"/>
{headline(['蓝花楹落满了球场。'], y=1170, size=54, colors='#F7EBD6', ls=3)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.16)}'''
    return page(body)
