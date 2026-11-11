from lib import *

META = dict(
    id=41, slug='city-lights', title='万家灯火', lines=['今晚，', '有人在打球。'],
    style=['写实光影', '风景'], tone='深色', demo=False,
    concept='夜里的城市，成千上万扇暖黄的窗，中间一块被泛光灯照亮的球场；一句大实话',
    use='晚间约球的氛围图；品牌情绪：城市里有人在打球',
)


def layer(base, hmin, hmax, wmin, wmax, col, seed, p_on, ws, step):
    rnd = random.Random(seed)
    x, rects, wins = -20.0, '', ''
    while x < W + 20:
        w, h = rnd.uniform(wmin, wmax), rnd.uniform(hmin, hmax)
        rects += f'<rect x="{x:.0f}" y="{base-h:.0f}" width="{w:.0f}" height="{h+2:.0f}" fill="{col}"/>'
        for wx in range(int(x) + 5, int(x + w) - 5, step[0]):
            for wy in range(int(base - h) + 8, int(base) - 4, step[1]):
                if rnd.random() < p_on:
                    c = rnd.choice(['#FFD58A', '#FFC56B', '#FFE3A8', '#F7B25A'])
                    wins += f'<rect x="{wx}" y="{wy}" width="{ws[0]}" height="{ws[1]}" fill="{c}" opacity="{rnd.uniform(.35, .95):.2f}"/>'
        x += w + rnd.uniform(0, 5)
    return rects + wins


def svg():
    random.seed(41)
    rnd = random.Random(7)
    stars = ''.join(f'<circle cx="{rnd.uniform(20,1060):.0f}" cy="{rnd.uniform(40,640):.0f}" r="{rnd.uniform(.7,1.8):.1f}" fill="#F7EBD6" opacity="{rnd.uniform(.2,.8):.2f}"/>' for _ in range(90))
    poles = [(404, 930), (676, 930), (336, 1002), (744, 1002)]
    pole_svg = ''.join(f'<path d="M{x} {y} V{y-96}" stroke="#04100C" stroke-width="3"/><circle cx="{x}" cy="{y-98}" r="16" fill="#F2FFE0" opacity=".9" filter="url(#bl6)"/><circle cx="{x}" cy="{y-98}" r="4" fill="#fff"/>' for x, y in poles)
    beams = ''.join(f'<path d="M{x} {y-96} L{540+(x-540)*.3:.0f} {965} L{540+(x-540)*.1:.0f} 1012Z" fill="#E4FFC8" opacity=".07"/>' for x, y in poles)
    trees = ''.join(f'<circle cx="{rnd.uniform(-20,1100):.0f}" cy="{rnd.uniform(1050,1100):.0f}" r="{rnd.uniform(24,56):.0f}" fill="#020807"/>' for _ in range(40))
    lights = ''
    for _ in range(26):
        x = rnd.uniform(40, 520); lights += f'<rect x="{x:.0f}" y="1162" width="{rnd.uniform(8,26):.0f}" height="3" rx="1.5" fill="#FFF1C9" opacity="{rnd.uniform(.5,.95):.2f}"/>'
    for _ in range(26):
        x = rnd.uniform(560, 1040); lights += f'<rect x="{x:.0f}" y="1190" width="{rnd.uniform(8,26):.0f}" height="3" rx="1.5" fill="#FF5A44" opacity="{rnd.uniform(.5,.95):.2f}"/>'
    body = f'''
<defs><linearGradient id="sk41" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#030A0E"/><stop offset=".55" stop-color="#0B2A2E"/><stop offset="1" stop-color="#3A5B4E"/></linearGradient>
<linearGradient id="ct41" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FB07D"/><stop offset="1" stop-color="#1F7A52"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#sk41)"/>{stars}
<ellipse cx="540" cy="850" rx="700" ry="80" fill="#C98A4A" opacity=".28" filter="url(#bl60)"/>
{layer(840, 40, 210, 26, 60, '#0B2226', 11, .32, (2, 3), (6, 7))}
<ellipse cx="540" cy="880" rx="600" ry="40" fill="#E8A55A" opacity=".2" filter="url(#bl28)"/>
{layer(930, 40, 200, 34, 74, '#07171A', 12, .34, (3, 4), (9, 10))}
<ellipse cx="540" cy="940" rx="340" ry="130" fill="#DFF7C8" opacity=".24" filter="url(#bl28)"/>
{beams}
<path d="M404 930 L676 930 L744 1002 L336 1002 Z" fill="url(#ct41)"/>
<g stroke="#F2FFF0" stroke-width="2" fill="none" opacity=".85"><path d="M404 930 L676 930 L744 1002 L336 1002 Z"/><path d="M540 930 V1002"/><path d="M370 966 H710"/></g>
<g fill="#04100C"><rect x="480" y="962" width="4" height="12"/><circle cx="482" cy="959" r="2.6"/><rect x="618" y="947" width="4" height="12"/><circle cx="620" cy="944" r="2.6"/></g>
<circle cx="552" cy="968" r="3.2" fill="#E4F76A"/>
{pole_svg}
<path d="M0 1040 H1080 V1350 H0Z" fill="#020807"/>{trees}
<path d="M0 1150 H1080 V1215 H0Z" fill="#0A1614"/><path d="M0 1150 H1080" stroke="#2A3B36" stroke-width="2"/>
<g filter="url(#bl6)">{lights}</g><g>{lights}</g>
{tag('MELBOURNE · 8:40 PM')}
{headline(META['lines'], y=290, size=60, colors=C['cream'], ls=3, lh=76)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
