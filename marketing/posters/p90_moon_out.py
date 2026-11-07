from lib import *

META = dict(
    id=90, slug='moon-out', title='出了大气层', lines=['这一拍，', '出了大气层。'],
    style=['写实光影', '深空'], tone='深色', demo=False,
    concept='月面上，一颗球落在一个小环形坑里，扬起的月尘还没落下，长影子伸向右边；远处的地平线上，地球正在升起',
    use='「打得有点远」系列：最远的一次出界；小标签 384,400 km 是地月平均距离',
)


def svg():
    rnd = random.Random(90)
    ex, ey, er = 760, 560, 150
    hz = 790
    clouds = ''
    for _ in range(18):
        a = rnd.uniform(0, 6.28); d = rnd.uniform(0, er * .95)
        x, y = ex + d * math.cos(a), ey + d * math.sin(a)
        clouds += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rnd.uniform(10, 34):.0f}" ry="{rnd.uniform(4, 10):.0f}" transform="rotate({rnd.uniform(-20, 5):.0f} {x:.0f} {y:.0f})" fill="#fff" opacity="{rnd.uniform(.35, .85):.2f}"/>'
    land = ''.join(f'<ellipse cx="{ex + rnd.uniform(-90, 60):.0f}" cy="{ey + rnd.uniform(-70, 80):.0f}" rx="{rnd.uniform(16, 46):.0f}" ry="{rnd.uniform(10, 30):.0f}" fill="{rnd.choice(["#4F7A4A", "#8A7A52", "#5E8452"])}" opacity=".7"/>' for _ in range(4))
    earth = f'''<defs><radialGradient id="eg90" cx="30%" cy="35%" r="80%"><stop offset="0" stop-color="#4C9AD6"/><stop offset=".6" stop-color="#1F5E9E"/><stop offset="1" stop-color="#0B2A55"/></radialGradient>
<radialGradient id="term90" cx="88%" cy="58%" r="75%"><stop offset=".45" stop-color="#01050C" stop-opacity="0"/><stop offset=".72" stop-color="#01050C" stop-opacity=".85"/><stop offset="1" stop-color="#01050C" stop-opacity=".98"/></radialGradient>
<clipPath id="ec90"><circle cx="{ex}" cy="{ey}" r="{er}"/></clipPath></defs>
<circle cx="{ex}" cy="{ey}" r="{er + 14}" fill="#7CC4FF" opacity=".25" filter="url(#bl14)"/>
<circle cx="{ex}" cy="{ey}" r="{er}" fill="url(#eg90)"/>
<g clip-path="url(#ec90)"><g filter="url(#bl6)">{land}</g><g filter="url(#bl6)" opacity=".6">{clouds}</g>
<circle cx="{ex + er*.75:.0f}" cy="{ey - er*.1:.0f}" r="{er*1.08:.0f}" fill="#01040A" opacity=".93" filter="url(#bl14)"/></g>
'''
    # 月面：远处平缓，近处坑多；光从左边低处照来
    def craters(n, y0, y1, smin, smax):
        out = ''
        for _ in range(n):
            y = rnd.uniform(y0, y1)
            k = (y - hz) / (H - hz)
            rx = rnd.uniform(smin, smax) * (.3 + k)
            x = rnd.uniform(-40, 1120)
            if (abs(x - 380) < 200 and abs(y - 1100) < 110) or (abs(x - 540) < 190 and y > 1170):
                continue
            ry = rx * (.22 + .25 * k)
            out += (f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx*1.12:.0f}" ry="{ry*1.25:.0f}" fill="#A9A59C" opacity=".35"/>'
                    f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rx:.0f}" ry="{ry:.0f}" fill="#4E4C48"/>'
                    f'<ellipse cx="{x + rx*.18:.0f}" cy="{y + ry*.08:.0f}" rx="{rx*.86:.0f}" ry="{ry*.8:.0f}" fill="#6F6C66"/>'
                    f'<path d="M{x + rx*.2:.0f} {y - ry*.95:.0f} A{rx:.0f} {ry:.0f} 0 0 1 {x + rx*.2:.0f} {y + ry*.95:.0f} A{rx*.7:.0f} {ry*.85:.0f} 0 0 0 {x + rx*.2:.0f} {y - ry*.95:.0f}Z" fill="#C9C5BA" opacity=".55"/>'
                    f'<path d="M{x - rx:.0f} {y:.0f} A{rx:.0f} {ry:.0f} 0 0 1 {x + rx:.0f} {y:.0f}" stroke="#1C1B1A" stroke-width="{1 + 1.5*k:.1f}" fill="none" opacity=".55"/>')
        return out
    pebbles = ''.join(f'<ellipse cx="{rnd.uniform(0, 1080):.0f}" cy="{y:.0f}" rx="{(y - hz) / 90 + .5:.1f}" ry="{(y - hz) / 200 + .3:.1f}" fill="{rnd.choice(["#C9C6BC", "#77746E", "#3A3A3C"])}" opacity=".7"/>' for y in [rnd.uniform(hz + 10, H) for _ in range(900)])
    bx, by, br = 380, 1080, 30
    dust = ''.join(f'<circle cx="{bx + rnd.gauss(0, 40):.0f}" cy="{by + br - abs(rnd.gauss(0, 30)):.0f}" r="{rnd.uniform(.6, 2):.1f}" fill="#D8D4C8" opacity="{rnd.uniform(.2, .7):.2f}"/>' for _ in range(60))
    body = f'''
{space(90, top='#000003', bot='#05070C', avoid=[(ex, ey, er + 20)], n=170, milkyway=False, ymax=hz)}
{earth}
<defs><linearGradient id="gr90" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8E8B84"/><stop offset=".25" stop-color="#6D6A64"/><stop offset="1" stop-color="#2A2A2C"/></linearGradient>
<linearGradient id="lit90" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF6E6" stop-opacity=".22"/><stop offset=".5" stop-color="#FFF6E6" stop-opacity="0"/></linearGradient></defs>
<path d="M-20 {hz + 8} Q540 {hz - 14} 1100 {hz + 8} V{H} H-20Z" fill="url(#gr90)"/>
<path d="M-20 {hz + 8} Q540 {hz - 14} 1100 {hz + 8}" stroke="#D8D4C8" stroke-width="1.5" fill="none" opacity=".6"/>
{craters(30, hz + 10, 900, 20, 70)}{craters(14, 900, 1240, 50, 150)}
{pebbles}
<rect y="{hz}" width="{W}" height="{H - hz}" fill="url(#lit90)"/>
<ellipse cx="{bx}" cy="{by + br + 4}" rx="92" ry="20" fill="#A9A59C" opacity=".4"/>
<ellipse cx="{bx}" cy="{by + br + 4}" rx="78" ry="15" fill="#4A4844"/>
<path d="M{bx + 14} {by + br - 10} A78 15 0 0 1 {bx + 14} {by + br + 18} A56 12 0 0 0 {bx + 14} {by + br - 10}Z" fill="#C9C5BA" opacity=".6"/>
<path d="M{bx} {by + br - 12} Q{bx + 200} {by + br - 6} {bx + 380} {by + br + 6} L{bx + 380} {by + br + 12} Q{bx + 200} {by + br + 18} {bx} {by + br + 16}Z" fill="url(#bshd90)"/>
<defs><linearGradient id="bshd90" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050506" stop-opacity=".95"/><stop offset="1" stop-color="#050506" stop-opacity=".1"/></linearGradient></defs>
{dust}
{ball('b90', bx, by, br, rot=-24)}
<circle cx="{bx}" cy="{by}" r="{br}" fill="url(#bsh90)"/>
<defs><linearGradient id="bsh90" x1="0" y1="0" x2="1" y2="0"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></linearGradient></defs>
{tag('OUT · 384,400 KM')}
{headline(META['lines'], y=290, size=60, colors=(C['cream'], C['lime']), ls=3, lh=80)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.16)}'''
    return page(body)
