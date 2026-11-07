from lib import *
from gf import *

META = dict(
    id=95, slug='eave', title='此球一去', lines=['此球一去，', '不复返。'],
    style=['古风', '写实光影'], tone='亮色', demo=False,
    concept='仰头看：钴蓝晴空下的飞檐翘角，彩画梁枋、瓦当一排；一条白纱从檐角随风飘下；檐角上卡着一颗球。化用「黄鹤一去不复返」',
    use='古风系列：打上屋顶的球，再也没下来',
)


def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return tuple(u**3 * a + 3 * u*u*t * b + 3 * u*t*t * c + t**3 * d for a, b, c, d in zip(p0, p1, p2, p3))


def svg():
    rnd = random.Random(95)
    T = (430, 360)                                   # 檐角（翘起）
    EA = [T, (520, 470), (800, 600), (1180, 650)]    # 右边檐口：先陡后平，角上翘
    EB = [T, (470, 250), (560, 60), (600, -80)]      # 上边檐口
    N = 100
    def curve(P):
        return [bez(*P, i / N) for i in range(N + 1)]
    def nrm(C, i, side):
        x0, y0 = C[max(0, i - 1)]; x1, y1 = C[min(N, i + 1)]
        d = math.hypot(x1 - x0, y1 - y0)
        return side * -(y1 - y0) / d, side * (x1 - x0) / d
    def band(C, side, d0, d1, fill, op=1):
        a = [(x + nx * d0, y + ny * d0) for (x, y), (nx, ny) in ((C[i], nrm(C, i, side)) for i in range(N + 1))]
        b = [(x + nx * d1, y + ny * d1) for (x, y), (nx, ny) in ((C[i], nrm(C, i, side)) for i in range(N + 1))]
        d = 'M' + ' L'.join(f'{p:.1f} {q:.1f}' for p, q in a) + ' L' + ' L'.join(f'{p:.1f} {q:.1f}' for p, q in reversed(b)) + 'Z'
        return f'<path d="{d}" fill="{fill}" opacity="{op}"/>'
    def along(C, side, step, fn):
        out, acc = '', step * .6
        for i in range(1, N + 1):
            acc += math.hypot(C[i][0] - C[i-1][0], C[i][1] - C[i-1][1])
            if acc >= step:
                acc = 0
                out += fn(C[i], nrm(C, i, side), i)
        return out
    A, B = curve(EA), curve(EB)
    sA, sB = -1, 1            # 法线指向两条檐口之间（屋檐底面）
    # 屋檐底面：两条檐口夹住的楔形
    under = 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in A) + ' L1180 -80 L' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in reversed(B)) + 'Z'
    # 角梁处放射的椽子
    rays = ''
    for k in range(26):
        ang = math.radians(-58 + k * 3.1)
        L = 1300
        c = '#2E8F8A' if k % 2 else '#2C5FA8'
        rays += f'<path d="M{T[0]+30} {T[1]-10} L{T[0]+30+L*math.cos(ang):.0f} {T[1]-10+L*math.sin(ang):.0f}" stroke="{c}" stroke-width="13" opacity=".9"/>'
        rays += f'<path d="M{T[0]+30} {T[1]-10} L{T[0]+30+L*math.cos(ang):.0f} {T[1]-10+L*math.sin(ang):.0f}" stroke="#F3EBDD" stroke-width="1.2" opacity=".35" transform="translate(5 0)"/>'
    parts = ''
    for C, sd in [(A, sA), (B, sB)]:
        parts += band(C, sd, 120, 170, '#A3342A') + band(C, sd, 166, 172, '#D9A441')
        parts += band(C, sd, 62, 120, 'url(#cai95)') + band(C, sd, 62, 66, '#D9A441') + band(C, sd, 116, 120, '#D9A441')
        parts += along(C, sd, 64, lambda p, n, i: f'<circle cx="{p[0] + n[0]*91:.1f}" cy="{p[1] + n[1]*91:.1f}" r="10" fill="none" stroke="#F4F1E6" stroke-width="2.4"/><circle cx="{p[0] + n[0]*91:.1f}" cy="{p[1] + n[1]*91:.1f}" r="3.5" fill="#D9A441"/>')
        parts += band(C, sd, 30, 62, '#24384E')
        parts += along(C, sd, 26, lambda p, n, i: f'<circle cx="{p[0] + n[0]*46:.1f}" cy="{p[1] + n[1]*46:.1f}" r="9" fill="{"#2E9C9A" if i % 2 else "#2B5FAE"}" stroke="#F4F1E6" stroke-width="1.6"/>')
        parts += band(C, sd, -4, 30, '#46556A')
        parts += along(C, sd, 26, lambda p, n, i: f'<circle cx="{p[0] + n[0]*8:.1f}" cy="{p[1] + n[1]*8:.1f}" r="11" fill="#56667C" stroke="#A3B0C0" stroke-width="2"/>')
    # 翘角：一道向上卷的脊
    curl = f'<path d="M{T[0]+10} {T[1]+10} Q{T[0]-40} {T[1]-10} {T[0]-50} {T[1]-80} Q{T[0]-48} {T[1]-118} {T[0]-20} {T[1]-120}" stroke="#46556A" stroke-width="26" fill="none" stroke-linecap="round"/><path d="M{T[0]-48} {T[1]-80} Q{T[0]-46} {T[1]-112} {T[0]-22} {T[1]-116}" stroke="#A3B0C0" stroke-width="3" fill="none"/>'
    bx, by, br = T[0] - 4, T[1] - 64, 30
    rib = silk(wave(T[0] + 20, T[1] + 40, 900, 1230, 90, 1.6, ph=.3), 150, twist=1.4, op=.72, id='a95')
    rib2 = silk(wave(T[0] + 60, T[1] + 70, 1100, 1060, 60, 1.4, ph=1.8), 80, twist=1.1, op=.55, id='b95')
    clouds = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#fff" opacity=".6" filter="url(#bl28)"/>' for x, y, rx, ry in [(200, 1120, 300, 55), (820, 1230, 340, 50)])
    body = f'''
<defs>
<linearGradient id="sky95" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#A8D2F8"/><stop offset=".55" stop-color="#3C86E8"/><stop offset="1" stop-color="#1550C8"/></linearGradient>
<linearGradient id="cai95" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2E9C9A"/><stop offset=".5" stop-color="#2B5FAE"/><stop offset="1" stop-color="#2E9C9A"/></linearGradient>
<clipPath id="uc95"><path d="{under}"/></clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky95)"/>
<circle cx="160" cy="900" r="300" fill="#FFFFFF" opacity=".25" filter="url(#bl60)"/>
{clouds}
<path d="{under}" fill="#7A2A20"/>
<g clip-path="url(#uc95)">{rays}<rect width="{W}" height="{H}" fill="#2A120E" opacity=".18"/>{parts}</g>
{curl}
<ellipse cx="{bx + 8}" cy="{by + br - 2}" rx="{br}" ry="6" fill="#1D2530" opacity=".4" filter="url(#bl6)"/>
{ball('b95', bx, by, br, rot=-30)}
{rib2}{rib}
{vcol('此球一去', 210, 620, 78, '#FFFFFF')}
{vcol('不复返', 110, 620, 78, '#C6EA3D')}
{seal(78, 900, 68)}
{wordmark(1268, '#fff', sub=False)}
{grain(.05, light=True)}'''
    return page(body)
