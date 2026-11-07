from lib import *

META = dict(
    id=88, slug='next-door-roof', title='隔壁屋顶', lines=['隔壁屋顶，', '又多了一个。'],
    style=['写实光影', '城市'], tone='深色', demo=False,
    concept='黄昏，站在球场隔壁人家的瓦屋顶上往外看：楼下球场的灯亮了，远处城市万家灯火；屋檐的排水槽里躺着一排球，旧的褪成灰白、长了青苔，最新的一颗还是荧光黄绿',
    use='「打得有点远」系列：打过球的人都见过隔壁屋顶上那一排球',
)


def svg():
    rnd = random.Random(88)
    hz = 700
    # 远处城市：几层楼剪影 + 暖色窗
    city = ''
    for base, hmin, hmax, col, p_on, ws in [(hz, 30, 170, '#1C2B3F', .28, 2), (hz + 30, 20, 110, '#152236', .32, 3)]:
        x = -20.0
        while x < W + 20:
            w, h = rnd.uniform(26, 80), rnd.uniform(hmin, hmax)
            city += f'<rect x="{x:.0f}" y="{base-h:.0f}" width="{w:.0f}" height="{h+60:.0f}" fill="{col}"/>'
            for wx in range(int(x) + 5, int(x + w) - 4, 7):
                for wy in range(int(base - h) + 6, int(base) + 20, 9):
                    if rnd.random() < p_on:
                        city += f'<rect x="{wx}" y="{wy}" width="{ws}" height="{ws+1}" fill="{rnd.choice(["#FFD58A", "#FFC56B", "#FFE3A8"])}" opacity="{rnd.uniform(.4, .95):.2f}"/>'
            x += w + rnd.uniform(0, 4)
    # 街区树冠
    trees = ''.join(f'<circle cx="{rnd.uniform(-20, 1100):.0f}" cy="{rnd.uniform(hz+40, hz+120):.0f}" r="{rnd.uniform(18, 44):.0f}" fill="{rnd.choice(["#0B1A17", "#0E201B", "#122822"])}"/>' for _ in range(70))
    # 楼下球场（俯视透视），在画面右中
    cx0, cy0 = 640, 905
    court = f'''<g transform="translate({cx0} {cy0}) skewX(-24) scale(.8 .36)">
<rect x="-250" y="-210" width="500" height="420" fill="#2C7A55"/>
<rect x="-200" y="-170" width="400" height="340" fill="#3A8E63"/>
<g stroke="#F2FFF0" stroke-width="3" fill="none" opacity=".9"><rect x="-180" y="-150" width="360" height="300"/><path d="M-140 -150 V150 M140 -150 V150 M-140 -64 H140 M-140 64 H140 M0 -64 V64"/></g>
<path d="M-200 0 H200" stroke="#0A1A12" stroke-width="5"/><path d="M-200 -2 H200" stroke="#fff" stroke-width="2"/>
</g>'''
    poles = [(500, 870), (820, 870), (470, 955), (800, 955)]
    lights = ''.join(f'<path d="M{x} {y} V{y-90}" stroke="#0B1612" stroke-width="3"/><circle cx="{x}" cy="{y-92}" r="22" fill="#F4FFE6" opacity=".8" filter="url(#bl6)"/><circle cx="{x}" cy="{y-92}" r="4" fill="#fff"/>' for x, y in poles)
    # 屋顶（近处，下方）：瓦片一行行
    roof_top = 1060
    tiles = ''
    for row in range(9):
        y = roof_top + 18 + row * (24 + row * 4)
        hgt = 24 + row * 4
        wid = 46 + row * 9
        off = (row % 2) * wid / 2
        x = -wid + off
        while x < W + wid:
            shade = rnd.uniform(-.08, .08)
            tiles += f'<path d="M{x:.0f} {y:.0f} q{wid/2:.0f} {-hgt*.5:.0f} {wid:.0f} 0 v{hgt:.0f} q{-wid/2:.0f} {-hgt*.5:.0f} {-wid:.0f} 0Z" fill="{rnd.choice(["#6E3322", "#7A3A26", "#64301F", "#83412A"])}" stroke="#2A120B" stroke-width="2" opacity="{.92 + shade:.2f}"/>'
            tiles += f'<path d="M{x+wid*.15:.0f} {y-hgt*.08:.0f} q{wid*.35:.0f} {-hgt*.32:.0f} {wid*.7:.0f} 0" stroke="#E79A68" stroke-width="2" fill="none" opacity=".35"/>'
            x += wid
    # 排水槽：横贯画面
    gy = 1046
    balls = [(130, 'old1', .86), (232, 'old2', .9), (338, 'old3', .86), (468, 'moss', .92), (720, 'new', 1.0)]
    gutter_back = f'<path d="M-20 {gy-30} H1100 V{gy+6} H-20Z" fill="#59636B"/><path d="M-20 {gy-30} H1100" stroke="#9BA6AE" stroke-width="3"/>'
    leaves = ''.join(f'<ellipse cx="{rnd.uniform(0, 1080):.0f}" cy="{gy - rnd.uniform(4, 12):.0f}" rx="{rnd.uniform(6, 13):.0f}" ry="3" transform="rotate({rnd.uniform(-30, 30):.0f})" fill="{rnd.choice(["#5A4020", "#7A5A2A", "#3E3A22"])}" opacity=".9"/>' for _ in range(0))
    leaf = ''
    for _ in range(28):
        x = rnd.uniform(0, 1080); y = gy - rnd.uniform(2, 14)
        leaf += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{rnd.uniform(6, 13):.0f}" ry="3" transform="rotate({rnd.uniform(-30, 30):.0f} {x:.0f} {y:.0f})" fill="{rnd.choice(["#5A4020", "#7A5A2A", "#3E3A22"])}" opacity=".9"/>'
    bsvg = ''
    for x, kind, s in balls:
        r = 30
        cy = gy - 22
        if kind == 'new':
            bsvg += f'<circle cx="{x}" cy="{cy}" r="60" fill="#E6FF8A" opacity=".18" filter="url(#bl14)"/>' + ball('b88', x, cy, r, rot=-35)
        else:
            col = {'old1': ('#C9C6A8', '#8E8B72'), 'old2': ('#B9B08A', '#7C7458'), 'old3': ('#D0CDB4', '#99967E'), 'moss': ('#A7B07A', '#6B7448')}[kind]
            bsvg += f'''<defs><radialGradient id="og{kind}" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="{col[0]}"/><stop offset="1" stop-color="{col[1]}"/></radialGradient></defs>
<g transform="translate({x} {cy}) rotate({rnd.uniform(-60, 60):.0f})"><circle r="{r}" fill="url(#og{kind})"/>
<clipPath id="oc{kind}"><circle r="{r}"/></clipPath><g clip-path="url(#oc{kind})" opacity=".55"><path d="M{-r*.67:.0f} {-r*.74:.0f} C{-r*.3:.0f} {-r*.34:.0f} {-r*.3:.0f} {r*.34:.0f} {-r*.67:.0f} {r*.74:.0f}" stroke="#E8E4D0" stroke-width="3.2" fill="none"/>
<path d="M{r*.67:.0f} {-r*.74:.0f} C{r*.3:.0f} {-r*.34:.0f} {r*.3:.0f} {r*.34:.0f} {r*.67:.0f} {r*.74:.0f}" stroke="#E8E4D0" stroke-width="3.2" fill="none"/>
<circle r="{r}" fill="#000" filter="url(#fuzz)" opacity=".4"/>{''.join(f'<circle cx="{rnd.uniform(-r, r):.0f}" cy="{rnd.uniform(-r, r):.0f}" r="{rnd.uniform(2, 6):.1f}" fill="#4E5A2E" opacity=".5"/>' for _ in range(7 if kind == 'moss' else 2))}</g>
<circle r="{r}" fill="#000" opacity="{1 - s:.2f}"/></g>'''
    gutter_front = f'<path d="M-20 {gy-18} Q540 {gy-12} 1100 {gy-18} V{gy+18} H-20Z" fill="#7D8890"/><path d="M-20 {gy-18} Q540 {gy-12} 1100 {gy-18}" stroke="#C9D2D8" stroke-width="3" fill="none"/><path d="M-20 {gy+10} H1100" stroke="#3E474E" stroke-width="3"/>'
    stars = ''.join(f'<circle cx="{rnd.uniform(20, 1060):.0f}" cy="{rnd.uniform(20, 330):.0f}" r="{rnd.uniform(.5, 1.3):.1f}" fill="#F7EBD6" opacity="{rnd.uniform(.15, .6):.2f}"/>' for _ in range(60))
    body = f'''
<defs><linearGradient id="sk88" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1626"/><stop offset=".3" stop-color="#1D3550"/><stop offset=".45" stop-color="#5A5E78"/><stop offset=".52" stop-color="#E08A5C"/><stop offset=".56" stop-color="#F5B47A"/><stop offset="1" stop-color="#F5B47A"/></linearGradient>
<linearGradient id="rf88" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".1"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#sk88)"/>{stars}
<ellipse cx="300" cy="{hz-20}" rx="560" ry="90" fill="#FFB27A" opacity=".45" filter="url(#bl60)"/>
{city}
<rect y="{hz+20}" width="{W}" height="400" fill="#0C1714"/>
{trees}
<ellipse cx="{cx0}" cy="{cy0}" rx="330" ry="150" fill="#E8FFD0" opacity=".2" filter="url(#bl28)"/>
{court}
<g stroke="#7E8C86" stroke-width="1" opacity=".35">{''.join(f'<path d="M{x} 850 l26 -26"/><path d="M{x} 850 l-26 -26"/>' for x in range(430, 880, 8))}<path d="M430 850 H880 M430 824 H880" stroke-width="2"/></g>
{lights}
<rect y="{roof_top}" width="{W}" height="{H-roof_top}" fill="#3C1A10"/>
{tiles}
<rect y="{roof_top}" width="{W}" height="{H-roof_top}" fill="url(#rf88)"/>
{gutter_back}{leaf}{bsvg}{gutter_front}
<g stroke="#F7EBD6" stroke-width="1.4" fill="none" opacity=".85"><path d="M{720+30} {gy-50} L{720+62} {gy-92} H{720+86}"/></g>
<text x="{720+94}" y="{gy-85}" font-family="{SANS}" font-size="22" letter-spacing="3" fill="#F7EBD6" opacity=".92">今天的。</text>
{tag('NEXT DOOR · 7:40 PM')}
{headline(META['lines'], y=290, size=60, colors=(C['cream'], C['lime']), ls=3, lh=80)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.2)}'''
    return page(body)
