from lib import *

META = dict(
    id=46, slug='turf', title='假草', lines=['回家倒鞋，', '倒出半个球场。'],
    style=['写实光影', '俯视', '质感'], tone='深色', demo=False,
    concept='假草的微距俯视：成千上万根草丝、撒落的细沙，白线被草丝盖住一半，一颗球陷在草里',
    use='假草场约球；一句大实话',
)


def blades(r, n, x0, x1, y0, y1, lo=26, hi=62):
    cols = ['#2F8F55', '#3EA866', '#1F6F42', '#58BE7C', '#18583A', '#2A7E4C']
    out = ''
    for _ in range(n):
        x, y = r.uniform(x0, x1), r.uniform(y0, y1)
        a = math.radians(-90 + r.gauss(0, 30)); l = r.uniform(lo, hi)
        out += f'<path d="M{x:.0f} {y:.0f} Q{x + math.cos(a) * l * .5 + r.uniform(-6, 6):.0f} {y + math.sin(a) * l * .5:.0f} {x + math.cos(a) * l:.0f} {y + math.sin(a) * l:.0f}" stroke="{r.choice(cols)}" stroke-width="{r.uniform(1.3, 2.6):.1f}" fill="none" stroke-linecap="round" opacity="{r.uniform(.6, .98):.2f}"/>'
    return out


def sand(r, n, x0, x1, y0, y1):
    return ''.join(f'<circle cx="{r.uniform(x0,x1):.0f}" cy="{r.uniform(y0,y1):.0f}" r="{r.uniform(.8,2.4):.1f}" fill="{r.choice(["#E6D3A0", "#CDB57C", "#F1E4BE"])}" opacity="{r.uniform(.6,.95):.2f}"/>' for _ in range(n))


def svg():
    random.seed(46)
    r = random.Random(46)
    bx, by, br = 620, 760, 74
    body = f'''
<defs><linearGradient id="bg46" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B3B2A"/><stop offset="1" stop-color="#1E7A4C"/></linearGradient>
<linearGradient id="top46" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120B" stop-opacity=".85"/><stop offset="1" stop-color="#03120B" stop-opacity="0"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg46)"/>
{blades(r, 2400, -20, 1100, -20, 1370)}
<rect y="990" width="{W}" height="36" fill="#F4F1E6" opacity=".92"/>
{blades(r, 420, -20, 1100, 960, 1060, 20, 54)}
{sand(r, 900, -10, 1090, 380, 1360)}
<ellipse cx="{bx+16}" cy="{by+br*.55:.0f}" rx="{br*1.1:.0f}" ry="{br*.4:.0f}" fill="#02100A" opacity=".55" filter="url(#bl14)"/>
{ball('t', bx, by, br, rot=-18)}
{blades(r, 260, bx - 90, bx + 90, by + 28, by + 88, 22, 60)}
{sand(r, 70, bx - 70, bx + 70, by - 40, by + 60)}
<rect width="{W}" height="520" fill="url(#top46)"/>
{tag('TURF', color='#F7EBD6')}
{headline(META['lines'], y=290, size=60, colors=C['cream'], ls=3, lh=76)}
{wordmark(1268, '#fff', sub=False, op=.95)}
{grain(.16)}'''
    return page(body)
