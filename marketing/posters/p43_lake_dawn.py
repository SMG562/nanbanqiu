from lib import *

META = dict(
    id=43, slug='lake-dawn', title='球场的灯', lines=['球场的灯，', '比我先亮。'],
    style=['写实光影', '风景'], tone='深色', demo=False,
    concept='黎明前的蓝调，群山和倒影，对岸小小一块球场的灯还亮着；总有人比你起得早',
    use='早场约球；一句大实话，会心一笑',
)


def ridge(base, amp, seed, step=10):
    r = random.Random(seed)
    ph = [r.uniform(0, 6.28) for _ in range(4)]
    pts = []
    for x in range(-20, W + 30, step):
        y = base - amp * (.5 + .28 * math.sin(x / 140 + ph[0]) + .2 * math.sin(x / 63 + ph[1]) + .12 * math.sin(x / 31 + ph[2]) + .08 * math.sin(x / 17 + ph[3]))
        pts.append((x, y))
    return 'M' + ' L'.join(f'{x} {y:.0f}' for x, y in pts) + f' L{W+30} {base+300} L-20 {base+300} Z'


def svg():
    random.seed(43)
    r = random.Random(43)
    hz = 800
    mount = f'''<path d="{ridge(700, 190, 1)}" fill="#7FA9AD" opacity=".75"/>
<ellipse cx="540" cy="700" rx="700" ry="50" fill="#FFE6CC" opacity=".4" filter="url(#bl28)"/>
<path d="{ridge(770, 210, 2)}" fill="#4B8589"/>
<ellipse cx="400" cy="760" rx="600" ry="40" fill="#FFE6CC" opacity=".35" filter="url(#bl28)"/>
<path d="{ridge(830, 190, 3)}" fill="#25666A"/>
<path d="{ridge(880, 120, 4)}" fill="#0F4545"/>'''
    ripples = ''.join(f'<path d="M{r.uniform(-50,1000):.0f} {y:.0f} h{r.uniform(60,260):.0f}" stroke="#FFF1DC" stroke-width="{r.uniform(1,2.4):.1f}" stroke-linecap="round" opacity="{r.uniform(.06,.2):.2f}"/>' for y in [hz + 8 + i * 9 for i in range(60)])
    poles = [(645, 842), (755, 842), (625, 856), (775, 856)]
    pole_svg = ''.join(f'<path d="M{x} {y} V{y-34}" stroke="#031512" stroke-width="2"/><circle cx="{x}" cy="{y-36}" r="9" fill="#FFE9B0" opacity=".9" filter="url(#bl6)"/><circle cx="{x}" cy="{y-36}" r="2.6" fill="#fff"/>' for x, y in poles)
    reflect = ''.join(f'<rect x="{x-2}" y="{hz+62+i*10}" width="{4+i%3}" height="6" rx="2" fill="#FFE9B0" opacity="{max(.05,.5-i*.04):.2f}"/>' for x in (645, 755) for i in range(10))
    reeds = ''.join(f'<path d="M{x:.0f} 1360 Q{x+r.uniform(-20,20):.0f} {1360-h*.6:.0f} {x+r.uniform(-30,30):.0f} {1360-h:.0f}" stroke="#021210" stroke-width="{r.uniform(2,4):.1f}" fill="none" stroke-linecap="round"/>'
                    for x, h in [(r.uniform(-20, 330), r.uniform(120, 360)) for _ in range(70)])
    body = f'''
<defs><linearGradient id="sk43" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A2236"/><stop offset=".45" stop-color="#2D6277"/><stop offset=".8" stop-color="#F0C4A0"/><stop offset="1" stop-color="#FFE2BC"/></linearGradient>
<linearGradient id="lk43" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E4546" stop-opacity=".2"/><stop offset="1" stop-color="#04201E" stop-opacity=".95"/></linearGradient>
<linearGradient id="bt43" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#031512" stop-opacity="0"/><stop offset=".6" stop-color="#031512" stop-opacity=".92"/><stop offset="1" stop-color="#031512"/></linearGradient><clipPath id="lc43"><rect y="{hz}" width="{W}" height="{H-hz}"/></clipPath></defs>
<rect width="{W}" height="{H}" fill="url(#sk43)"/>
{''.join(f'<circle cx="{r.uniform(20,1060):.0f}" cy="{r.uniform(30,420):.0f}" r="{r.uniform(.6,1.5):.1f}" fill="#F7EBD6" opacity="{r.uniform(.2,.7):.2f}"/>' for _ in range(60))}
<ellipse cx="540" cy="{hz-40}" rx="520" ry="90" fill="#FFE2BC" opacity=".5" filter="url(#bl60)"/>
{mount}
<ellipse cx="560" cy="{hz-6}" rx="620" ry="22" fill="#FFF1DC" opacity=".5" filter="url(#bl14)"/>
<g clip-path="url(#lc43)"><g opacity=".55" filter="url(#bl6)"><g transform="translate(0 {2*hz}) scale(1 -1)">{mount}</g></g></g>
<rect y="{hz}" width="{W}" height="{H-hz}" fill="url(#lk43)"/>
<rect y="1000" width="{W}" height="350" fill="url(#bt43)"/>{ripples}{reflect}
<path d="M600 842 L800 842 L826 858 L574 858 Z" fill="#2E8F63" opacity=".95"/>
<path d="M600 842 L800 842 L826 858 L574 858 Z M700 842 V858" fill="none" stroke="#F2FFF0" stroke-width="1.3" opacity=".9"/>
{pole_svg}
<path d="M0 {hz} H1080" stroke="#FFF1DC" stroke-width="1.5" opacity=".4"/>
<g>{reeds}</g>
{tag('5:20 AM')}
{headline(META['lines'], y=290, size=60, colors='#F7EBD6', ls=3, lh=76)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.2)}'''
    return page(body)
