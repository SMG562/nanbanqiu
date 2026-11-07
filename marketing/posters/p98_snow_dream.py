from lib import *
from gf import vcol, seal

META = dict(
    id=98, slug='snow-dream', title='雪初霁（写意版）', lines=['雪初霁，', '能打一局无。'],
    style=['古风', '写实光影', '极简'], tone='浅色', demo=False,
    concept='浅景深的雪后清晨：远处一段朱红宫墙和屋檐在雾里化开，近处一枝覆雪的红梅清晰，一颗球落在积雪的石栏上；前景几片失焦的雪花',
    use='古风系列：极简、柔光、亦真亦幻',
)


def svg():
    rnd = random.Random(98)
    # 远景：雾里化开的宫墙与檐
    far = '''<g filter="url(#d98)">
<rect x="420" y="640" width="760" height="300" fill="#B8463A"/>
<path d="M380 640 L1180 600 L1180 560 L420 590Z" fill="#3E4452"/>
<path d="M380 600 L1180 552 L1180 540 L400 588Z" fill="#F4F2EE"/>
<rect x="560" y="700" width="70" height="240" fill="#8E3229"/>
<rect x="-40" y="700" width="300" height="240" fill="#C7564A" opacity=".55"/>
</g>'''
    # 前景失焦雪花（大光斑）+ 清晰的小雪
    bokeh = ''.join(f'<circle cx="{rnd.uniform(0, 1080):.0f}" cy="{rnd.uniform(0, 1350):.0f}" r="{rnd.uniform(14, 40):.0f}" fill="#FFFFFF" opacity="{rnd.uniform(.25, .6):.2f}" filter="url(#bl14)"/>' for _ in range(16))
    flakes = ''.join(f'<circle cx="{rnd.uniform(0, 1080):.0f}" cy="{rnd.uniform(0, 1300):.0f}" r="{rnd.uniform(1, 2.6):.1f}" fill="#FFFFFF" opacity="{rnd.uniform(.6, 1):.2f}"/>' for _ in range(70))
    # 近景：一枝覆雪红梅（清晰），从左上斜下
    main = 'M-40 250 C120 300 240 360 340 450 C400 505 450 540 520 560'
    twig = ['M180 330 C200 280 230 250 262 236', 'M320 432 C340 400 370 380 400 372', 'M430 528 C440 580 452 610 470 630']
    def snowcap(d, w):
        return f'<path d="{d}" stroke="#FFFFFF" stroke-width="{w}" fill="none" stroke-linecap="round" transform="translate(0 -{w*.45:.1f})"/>'
    branch = f'<path d="{main}" stroke="#2E2420" stroke-width="10" fill="none" stroke-linecap="round"/>' + ''.join(f'<path d="{t}" stroke="#2E2420" stroke-width="5" fill="none" stroke-linecap="round"/>' for t in twig)
    caps = snowcap('M-40 250 C120 300 240 360 330 444', 7) + snowcap(twig[1], 4)
    def plum(x, y, r, open_=True):
        if not open_:
            return f'<circle cx="{x}" cy="{y}" r="{r*.5:.1f}" fill="#B3221C"/><circle cx="{x-1}" cy="{y-1}" r="{r*.2:.1f}" fill="#E0544A"/>'
        p = ''.join(f'<ellipse cx="{x + r*.5*math.cos(math.radians(a)):.1f}" cy="{y + r*.5*math.sin(math.radians(a)):.1f}" rx="{r*.48:.1f}" ry="{r*.44:.1f}" fill="url(#pl98)"/>' for a in range(-80, 280, 72))
        st = ''.join(f'<path d="M{x} {y} l{r*.45*math.cos(a):.1f} {r*.45*math.sin(a):.1f}" stroke="#F1D37A" stroke-width=".8"/><circle cx="{x + r*.45*math.cos(a):.1f}" cy="{y + r*.45*math.sin(a):.1f}" r="1.1" fill="#F6D27A"/>' for a in [k * .7 for k in range(9)])
        return f'<g>{p}<circle cx="{x}" cy="{y}" r="{r*.16:.1f}" fill="#7A1A14"/>{st}</g>'
    plums = ''.join(plum(x, y, r, o) for x, y, r, o in [(150, 318, 15, True), (262, 236, 13, True), (348, 462, 16, True), (400, 372, 9, False), (470, 630, 12, True), (505, 556, 8, False), (230, 352, 7, False)])
    # 石栏 + 积雪 + 球
    bx, by, br = 760, 1078, 30
    rail = f'''<rect x="-20" y="1110" width="1120" height="260" fill="url(#st98)"/>
<path d="M-20 1112 C200 1090 420 1098 640 1096 C820 1094 960 1088 1100 1094 V1124 H-20Z" fill="url(#sn98)"/>
<path d="M-20 1124 H1100" stroke="#C9CFD6" stroke-width="2" opacity=".7"/>'''
    body = f'''
<defs>
<linearGradient id="bg98" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDE7F1"/><stop offset=".5" stop-color="#F3F1EC"/><stop offset="1" stop-color="#ECE8E2"/></linearGradient>
<filter id="d98" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="22"/></filter>
<radialGradient id="pl98" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#E9483C"/><stop offset="1" stop-color="#B8241D"/></radialGradient>
<linearGradient id="st98" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9D6D0"/><stop offset="1" stop-color="#B9B5AE"/></linearGradient>
<linearGradient id="sn98" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E7ECF2"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg98)"/>
<circle cx="900" cy="260" r="420" fill="#FFF4DE" opacity=".7" filter="url(#bl60)"/>
{far}
<rect y="520" width="{W}" height="520" fill="#F4F3F0" opacity=".35" filter="url(#bl60)"/>
{rail}
<ellipse cx="{bx + 22}" cy="{by + br - 4}" rx="{br*1.3:.0f}" ry="6" fill="#7E8794" opacity=".35" filter="url(#bl6)"/>
{ball('b98', bx, by, br, rot=-30)}
<path d="M{bx-16} {by-br+6} q8 -6 18 -2 q8 2 12 6" stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>
{branch}{caps}{plums}
{flakes}{bokeh}
{vcol('雪初霁', 960, 220, 58, '#2A2A2E', weight=700)}
{vcol('能打一局无', 884, 220, 58, '#2A2A2E', weight=700, op=.78)}
{seal(934, 420, 50)}
{wordmark(1268, '#0B3B2A', sub=False, op=.85)}
{grain(.07, light=True)}'''
    return page(body)
