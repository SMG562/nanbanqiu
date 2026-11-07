from lib import *
from gf import *

META = dict(
    id=97, slug='almanac', title='今日宜约球', lines=['今日宜，', '约球。'],
    style=['古风', '写实光影'], tone='亮色', demo=False,
    concept='晴光里一丛红白山茶，花间挂着一块木牌「三号场」；一缕白纱从花前掠过；花叶间藏着一颗球。文案借老黄历：今日宜约球，忌爽约',
    use='古风系列：黄历口吻，轻松约球',
)


def svg():
    rnd = random.Random(97)
    # 花丛：先叶后花，铺满下半部
    bush = '<rect x="-20" y="700" width="1120" height="700" fill="#22552E"/>' + ''.join(f'<circle cx="{x}" cy="{700 + rnd.uniform(-30, 20):.0f}" r="{rnd.uniform(70, 110):.0f}" fill="{rnd.choice(["#2A6537", "#22552E", "#2F6E3C"])}"/>' for x in range(-40, 1140, 90))
    leaves = ''
    for _ in range(260):
        x, y = rnd.uniform(-40, 1120), rnd.uniform(620, 1360)
        leaves += leaf(x, y, rnd.uniform(46, 86), rnd.uniform(0, 360), rnd.choice(['#245E33', '#2C6B3A', '#1F5230']), rnd.choice(['#3F8A4E', '#4C9A58']))
    flowers = ''
    spots = []
    for _ in range(40):
        x, y = rnd.uniform(-20, 1100), rnd.uniform(600, 1320)
        if (abs(x - 540) < 170 and y > 1180) or (abs(x - 560) < 70 and abs(y - 900) < 70):
            continue
        spots.append((x, y))
    for i, (x, y) in enumerate(sorted(spots, key=lambda p: p[1])):
        r = rnd.uniform(40, 66) * (0.8 + (y - 600) / 1800)
        flowers += camellia(f'{i}', round(x), round(y), round(r), 'white' if rnd.random() < .35 else 'red', rnd.uniform(0, 72), seed=i)
    # 花丛上沿：一层更远、更淡的花叶
    far = ''.join(f'<circle cx="{rnd.uniform(-20, 1100):.0f}" cy="{rnd.uniform(620, 700):.0f}" r="{rnd.uniform(30, 60):.0f}" fill="{rnd.choice(["#4F8F5A", "#5E9E66", "#E87A5A", "#F4EDE6"])}" opacity=".7"/>' for _ in range(40))
    # 木牌：挂在左边
    plank = f'''<g transform="rotate(-4 170 760)">
<path d="M170 560 L130 640 M170 560 L210 640" stroke="#6B5038" stroke-width="3"/>
<rect x="110" y="640" width="120" height="330" rx="8" fill="url(#wood97)"/>
<rect x="110" y="640" width="120" height="330" rx="8" fill="none" stroke="#7A5634" stroke-width="3"/>
{''.join(f'<path d="M{x} 650 Q{x+4} 800 {x-2} 960" stroke="#9C7652" stroke-width="1.2" fill="none" opacity=".5"/>' for x in (128, 150, 196, 214))}
{vcol('三号场', 170, 730, 70, '#3A2414', weight=700)}
</g>'''
    rib = silk(wave(-40, 560, 1120, 590, 50, 2.0, ph=.8), 110, twist=1.6, op=.6, id='a97')
    bx, by, br = 560, 900, 36
    body = f'''
<defs>
<linearGradient id="sky97" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F64D8"/><stop offset=".55" stop-color="#7FB4F0"/><stop offset=".8" stop-color="#DCEBFB"/></linearGradient>
<linearGradient id="wood97" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D9B184"/><stop offset=".5" stop-color="#E8C79C"/><stop offset="1" stop-color="#C99D6E"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky97)"/>
<circle cx="900" cy="160" r="220" fill="#FFFFFF" opacity=".35" filter="url(#bl60)"/>
<g filter="url(#bl6)">{far}</g>
{bush}{leaves}
<ellipse cx="{bx + 10}" cy="{by + 30}" rx="{br}" ry="10" fill="#0E2A16" opacity=".4" filter="url(#bl6)"/>
{ball('b97', bx, by, br, rot=-30)}
{leaf(bx - 20, by + 30, 70, 160)}{leaf(bx + 10, by + 34, 64, 20)}
{flowers}
{rib}
{plank}
<rect y="1210" width="{W}" height="140" fill="#0B3B2A" opacity=".0"/>
{vcol('今日宜', 960, 200, 80, '#FFFFFF')}
{vcol('约球', 860, 200, 80, '#C6EA3D')}
{vcol('忌', 770, 214, 30, '#FFFFFF', op=.85, weight=700)}
{vcol('爽约', 770, 262, 30, '#FFFFFF', op=.85, weight=700)}
{seal(928, 410, 64)}
{wordmark(1268, '#fff', sub=False)}
{grain(.05, light=True)}'''
    return page(body)
