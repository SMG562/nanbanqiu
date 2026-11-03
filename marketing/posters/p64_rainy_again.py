from lib import *

META = dict(
    id=64, slug='rainy-again', title='约球，总在下雨天', lines=['约球，', '总在下雨天。'],
    style=['写实光影', '雨窗', '幽默'], tone='深色', demo=False,
    concept='雨痕满布的窗玻璃，窗外模糊的球场与荧光球色散成光斑；窗台上一颗球望着外面，玻璃上贴着便签“本周第 3 次改期”',
    use='下雨改期的无奈；约球最常见的挫败',
)


def svg():
    random.seed(64)
    r = random.Random(64)
    bokeh = ''.join(f'<circle cx="{r.uniform(0,1080):.0f}" cy="{r.uniform(600,900):.0f}" r="{r.uniform(14,46):.0f}" fill="{r.choice(["#C6EA3D","#7DD08A","#F7EBD6"])}" opacity="{r.uniform(.12,.4):.2f}" filter="url(#bl14)"/>' for _ in range(26))
    drops = ''
    for _ in range(120):
        x, y, rr = r.uniform(20, 1060), r.uniform(450, 1000), r.uniform(4, 14)
        drops += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rr:.1f}" ry="{rr*1.3:.1f}" fill="#fff" opacity=".12"/><ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rr:.1f}" ry="{rr*1.3:.1f}" fill="none" stroke="#fff" stroke-width="1.6" opacity=".4"/><circle cx="{x-rr*.3:.0f}" cy="{y-rr*.5:.0f}" r="{rr*.28:.1f}" fill="#fff" opacity=".8"/>'
    runs = ''.join(f'<path d="M{(x:=r.uniform(40,1040)):.0f} {(y:=r.uniform(450,700)):.0f} q{r.uniform(-14,14):.0f} {r.uniform(60,140):.0f} {r.uniform(-10,10):.0f} {r.uniform(200,320):.0f}" fill="none" stroke="#fff" stroke-width="{r.uniform(2,4):.1f}" stroke-linecap="round" opacity=".28"/>' for _ in range(16))
    body = f'''
<defs><linearGradient id="bg64" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6F8499"/><stop offset="1" stop-color="#2C3C4E"/></linearGradient>
<linearGradient id="sl64" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9E4D6"/><stop offset="1" stop-color="#9C9886"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg64)"/>
<rect y="560" width="{W}" height="360" fill="#2E7A52" opacity=".8" filter="url(#bl28)"/>
<rect y="700" width="{W}" height="6" fill="#F7EBD6" opacity=".4" filter="url(#bl6)"/>
{bokeh}
{runs}{drops}
<rect x="0" y="1010" width="{W}" height="70" fill="url(#sl64)"/><rect y="1080" width="{W}" height="270" fill="#1D2A38"/>
<rect x="0" y="1008" width="{W}" height="6" fill="#fff" opacity=".6"/>
<ellipse cx="292" cy="1012" rx="64" ry="9" fill="#000" opacity=".35" filter="url(#bl6)"/>
{ball('r', 292, 956, 56, rot=-30)}
<g transform="translate(760 760) rotate(-5)"><rect width="250" height="150" rx="6" fill="#000" opacity=".25" filter="url(#bl14)" transform="translate(6 10)"/><rect width="250" height="150" rx="6" fill="#F6E58E"/>
<text x="125" y="62" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="34" fill="#4A3B12">本周第 3 次</text><text x="125" y="108" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="46" fill="#B8441E">改期</text></g>
{tag('RAIN CHECK', color='#EAF1F7', rule='#C6EA3D')}
{headline(META['lines'], y=290, size=64, colors='#F7EBD6', ls=3, lh=82)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
