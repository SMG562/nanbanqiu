from lib import *

META = dict(
    id=32, slug='constellation', title='星座连球', lines=['把星星，', '连成一局。'],
    style=['插画', '意境', '极简'], tone='深色', demo=False,
    concept='深空里用细线把星点连成一颗网球的星座：外圈是奶油色星点，球缝是荧光黄绿星点',
    use='品牌调性：浪漫、安静；头像 / 封面',
)


def bez(p0, p1, p2, p3, n):
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(tuple((1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t**2*c + t**3*d for a, b, c, d in zip(p0, p1, p2, p3)))
    return out


def svg():
    random.seed(32)
    cx, cy, R, rot = 540, 760, 270, math.radians(-22)
    k = R / 100
    tf = lambda p: (cx + k * (p[0] * math.cos(rot) - p[1] * math.sin(rot)), cy + k * (p[0] * math.sin(rot) + p[1] * math.cos(rot)))
    ring = [(cx + R * math.cos(a), cy + R * math.sin(a)) for a in [i / 26 * 2 * math.pi + .1 for i in range(26)]]
    s1 = [tf(p) for p in bez((-67, -74), (-30, -34), (-30, 34), (-67, 74), 7)]
    s2 = [tf(p) for p in bez((67, -74), (30, -34), (30, 34), (67, 74), 7)]
    poly = lambda pts, close=False: 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in pts) + ('Z' if close else '')
    star = lambda p, r, col, g: f'<circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{r*3.2:.1f}" fill="{col}" opacity=".18" filter="url(#bl6)"/><circle cx="{p[0]:.0f}" cy="{p[1]:.0f}" r="{r}" fill="{g}"/>'
    nodes = ''.join(star(p, random.choice([3, 4, 5]), '#F7EBD6', '#FFFDF2') for p in ring)
    nodes += ''.join(star(p, random.choice([4, 5, 6]), '#C6EA3D', '#E4F76A') for p in s1 + s2)
    body = f'''
{space(32, avoid=[(cx, cy, R + 30)], ymax=1100)}
<circle cx="{cx}" cy="{cy}" r="{R*1.5:.0f}" fill="#C6EA3D" opacity=".07" filter="url(#bl60)"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
  <path d="{poly(ring, True)}" stroke="#F7EBD6" stroke-width="1.8" opacity=".55"/>
  <path d="{poly(s1)}" stroke="#C6EA3D" stroke-width="2.2" opacity=".8"/><path d="{poly(s2)}" stroke="#C6EA3D" stroke-width="2.2" opacity=".8"/>
</g>
{nodes}
{tag('CONSTELLATION')}
{headline(META['lines'], y=330, size=100, colors=(C['cream'], C['lime']), ls=4)}
{sub('南伴球座 · 每晚都亮着', 540, 1128, 24, C['cream'], .7, 8, 'middle')}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.16)}'''
    return page(body)
