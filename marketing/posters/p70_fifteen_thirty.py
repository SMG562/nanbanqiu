from lib import *
import math

META = dict(
    id=70, slug='fifteen-thirty', title='15、30、40', lines=['15、30、40，', '没人问为什么。'],
    style=['形似双关', '冷知识', '细节'], tone='深色', demo=False,
    concept='一颗网球当钟面：15 在三点、30 在六点，本该是 45 的位置被划掉、写成 40；指针停在 40；相传网球计分来自钟面',
    use='计分冷知识；打过球的人都习惯了的怪事',
)


def svg():
    random.seed(70)
    cx, cy, R = 540, 800, 330
    def pos(m, rad):
        a = math.radians(m * 6)
        return cx + rad * math.sin(a), cy - rad * math.cos(a)
    ticks = ''
    for m in range(0, 60, 5):
        if m in (15, 30, 40, 45): continue
        x0, y0 = pos(m, R - 10); x1, y1 = pos(m, R - 40)
        ticks += f'<path d="M{x0:.0f} {y0:.0f} L{x1:.0f} {y1:.0f}" stroke="#F7EBD6" stroke-width="5" stroke-linecap="round" opacity=".85"/>'
    nx = lambda m, rad: pos(m, rad)
    p15, p30, p45, p40 = nx(15, 262), nx(30, 262), nx(45, 262), nx(40, 262)
    hx, hy = pos(40, 215)
    body = f'''
<defs><radialGradient id="bg70" cx="50%" cy="50%" r="75%"><stop offset="0" stop-color="#1D6A4A"/><stop offset="1" stop-color="#06231A"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg70)"/>
<ellipse cx="{cx+8}" cy="{cy+R-6}" rx="{R*.85:.0f}" ry="30" fill="#000" opacity=".4" filter="url(#bl28)"/>
{ball('k', cx, cy, R, rot=-22)}
<circle cx="{cx}" cy="{cy}" r="{R-4}" fill="#08281C" opacity=".52"/>
<circle cx="{cx}" cy="{cy}" r="{R-4}" fill="none" stroke="#F7EBD6" stroke-width="3" opacity=".6"/>
{ticks}
<g font-family="{SERIF}" font-weight="900" fill="#F7EBD6" text-anchor="middle">
 <text x="{p15[0]:.0f}" y="{p15[1]+22:.0f}" font-size="66">15</text>
 <text x="{p30[0]:.0f}" y="{p30[1]+22:.0f}" font-size="66">30</text>
 <text x="{p45[0]+8:.0f}" y="{p45[1]+22:.0f}" font-size="66" opacity=".35">45</text>
 <text x="{p40[0]:.0f}" y="{p40[1]+22:.0f}" font-size="66" fill="{C['lime']}">40</text>
</g>
<path d="M{p45[0]-52:.0f} {p45[1]+32:.0f} L{p45[0]+66:.0f} {p45[1]-28:.0f}" stroke="#E8472C" stroke-width="7" stroke-linecap="round"/>
<path d="M{cx} {cy} L{hx:.0f} {hy:.0f}" stroke="{C['lime']}" stroke-width="12" stroke-linecap="round"/>
<circle cx="{cx}" cy="{cy}" r="20" fill="{C['lime']}"/><circle cx="{cx}" cy="{cy}" r="8" fill="#08281C"/>
<text x="540" y="1205" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="22" letter-spacing="5" fill="#F7EBD6" opacity=".6">相传，计分来自钟面。</text>
{tag('THE SCORE')}
{headline(META['lines'], y=290, size=60, colors=C['cream'], ls=3, lh=78)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
