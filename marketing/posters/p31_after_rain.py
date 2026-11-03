from lib import *

META = dict(
    id=31, slug='after-rain', title='雨停之后', lines=['雨停之后，', '我们接着打。'],
    style=['插画', '意境'], tone='深色', demo=False,
    concept='雨夜里，一颗球躲在插在地上的荧光小伞下，地面积水倒映着它；等雨停',
    use='下雨改期、雨天等待的场景；温柔的延期',
)


def svg():
    random.seed(31)
    rain = ''.join(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x-14:.0f}" y2="{y+46:.0f}"/>'
                   for x, y in [(random.uniform(0, 1160), random.uniform(-40, 1100)) for _ in range(150)])
    gy = 1130
    body = f'''
<defs>
 <linearGradient id="bg31" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04180F"/><stop offset="1" stop-color="#0E5139"/></linearGradient>
 <linearGradient id="um31" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4F76A"/><stop offset="1" stop-color="#9FC72A"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg31)"/>
<g stroke="#DDEBFF" stroke-width="2" opacity=".2" stroke-linecap="round">{rain}</g>
{tag('AFTER THE RAIN')}
{headline(META['lines'], y=330, size=100, colors=(C['cream'], C['lime']), ls=4)}
<path d="M0 {gy} H1080 V1350 H0 Z" fill="#06241A"/>
<path d="M0 {gy} H1080" stroke="#BFD9CF" stroke-width="2" opacity=".35"/>
<g opacity=".5" filter="url(#bl6)"><g transform="translate(480 {gy+40}) scale(1 -.45)">{ball('r', 0, 0, 90)}</g></g>
<ellipse cx="480" cy="{gy+8}" rx="110" ry="12" fill="none" stroke="#DDEBFF" stroke-width="2" opacity=".35"/>
<ellipse cx="480" cy="{gy+14}" rx="170" ry="20" fill="none" stroke="#DDEBFF" stroke-width="2" opacity=".2"/>
<ellipse cx="480" cy="{gy+4}" rx="62" ry="8" fill="#000" opacity=".5" filter="url(#bl6)"/>
{ball('b', 480, 1040, 90)}
<g transform="translate(600 820) rotate(-12)">
  <path d="M0 0 L0 330" stroke="#C9D6CF" stroke-width="7" stroke-linecap="round"/>
  <path d="M-250 20 A250 250 0 0 1 250 20 Q208 -30 166 20 Q125 -30 83 20 Q41 -30 0 20 Q-41 -30 -83 20 Q-125 -30 -166 20 Q-208 -30 -250 20 Z" fill="url(#um31)"/>
  <g stroke="#7FA21C" stroke-width="3" fill="none" opacity=".6"><path d="M0 -230 L0 20"/><path d="M-130 -190 Q-100 -90 -83 20"/><path d="M130 -190 Q100 -90 83 20"/><path d="M-225 -80 Q-190 -30 -166 20"/><path d="M225 -80 Q190 -30 166 20"/></g>
  <path d="M-250 20 A250 250 0 0 1 250 20" fill="none" stroke="#fff" stroke-width="3" opacity=".25"/>
  <circle cx="0" cy="-246" r="10" fill="#7FA21C"/>
</g>
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
