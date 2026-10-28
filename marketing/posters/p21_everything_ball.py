from lib import *

META = dict(
    id=21, slug='everything-ball', title='万物皆球', lines=['圆的，', '都想打。'],
    style=['插画', '双关', '手作'], tone='亮色', demo=False,
    concept='月亮、荷包蛋、汤圆都被画上球缝，最后一个才是真球；圆的东西都想拍一拍',
    use='品牌调性 / 朋友圈：轻松幽默，打球上瘾的梗',
)


def svg():
    random.seed(21)
    pts = []
    for i in range(72):
        a = i / 72 * 2 * math.pi
        r = 150 * (1 + .09 * math.sin(3 * a + 1) + .05 * math.sin(5 * a + 2))
        pts.append(f'{790 + r * math.cos(a):.1f},{650 + r * .92 * math.sin(a):.1f}')
    egg = 'M' + ' L'.join(pts) + 'Z'
    craters = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#D9B02E" opacity=".55"/>' for x, y, r in
                      [(255, 650, 24), (345, 730, 16), (240, 745, 12), (330, 625, 11)])
    label = lambda t, x, y: f'<text x="{x}" y="{y}" text-anchor="middle" font-family="{SANS}" font-size="24" font-weight="700" letter-spacing="8" fill="#0B3B2A" opacity=".75">{t}</text>'
    body = f'''
<rect width="{W}" height="{H}" fill="#F3E6CC"/>
<circle cx="930" cy="150" r="190" fill="#E8643C" filter="url(#rough)"/>
{tag('EVERYTHING IS A BALL', color='#0B3B2A', rule='#E8643C', op=.8, weight=700)}
{headline(META['lines'], y=330, size=112, colors=('#0B3B2A', '#E8643C'))}
<g filter="url(#rough)">
  <ellipse cx="300" cy="850" rx="110" ry="14" fill="#0B3B2A" opacity=".18"/>
  {seamdisc(300, 685, 150, -22, '#F2D45C', '#F7EBD6', 'm')}{craters}
  <path d="{egg}" fill="#FFFDF5" stroke="#0B3B2A" stroke-width="5"/>
  {seamdisc(800, 650, 72, 30, '#F2A71B', '#FFF3C4', 'e')}
  <g transform="translate(0 45)">{seamdisc(238, 962, 56, -20, '#FFFDF5', '#C6EA3D', 't1')}{seamdisc(300, 945, 58, 15, '#FFFDF5', '#C6EA3D', 't2')}{seamdisc(364, 962, 56, 40, '#FFFDF5', '#C6EA3D', 't3')}
  <path d="M165 975 H435 A135 135 0 0 1 165 975 Z" fill="#176B4D" stroke="#0B3B2A" stroke-width="5"/>
  <path d="M200 1015 H400" stroke="#C6EA3D" stroke-width="7" stroke-linecap="round" opacity=".8"/></g>
  <ellipse cx="790" cy="1152" rx="130" ry="15" fill="#0B3B2A" opacity=".25"/>
  {ball('r', 790, 1010, 138)}
</g>
{label('月亮', 300, 895)}{label('荷包蛋', 790, 838)}{label('汤圆', 300, 1200)}
<text x="790" y="1200" text-anchor="middle" font-family="{SANS}" font-size="24" font-weight="900" letter-spacing="8" fill="#E8643C">这个才是</text>
{wordmark(1268, '#0B3B2A', sub=False)}
{grain(.22, True)}'''
    return page(body)
