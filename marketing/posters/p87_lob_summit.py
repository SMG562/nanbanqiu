from lib import *

META = dict(
    id=87, slug='lob-summit', title='挑得有点高', lines=['这个高球，', '挑得有点高。'],
    style=['写实光影', '风景'], tone='深色', demo=False,
    concept='日出时的云海与一层层远山；最近的一座雪峰顶上，一颗球砸出一个小雪坑，峰顶的风把雪吹成一缕；高球挑上了山',
    use='「打得有点远」系列：壮阔自然 × 一颗小球 × 一句大实话',
)


def ridge(base, amp, seed, step=8, sharp=1.0):
    r = random.Random(seed)
    ph = [r.uniform(0, 6.28) for _ in range(5)]
    pts = []
    for x in range(-30, W + 40, step):
        v = (.5 + .3 * math.sin(x / 150 + ph[0]) + .18 * math.sin(x / 70 + ph[1]) + .1 * math.sin(x / 33 + ph[2]) * sharp
             + .05 * math.sin(x / 13 + ph[3]) * sharp)
        pts.append((x, base - amp * v))
    return pts


def path(pts, bottom):
    return 'M' + ' L'.join(f'{x} {y:.0f}' for x, y in pts) + f' L{W+40} {bottom} L-30 {bottom} Z'


def svg():
    rnd = random.Random(87)
    sun = (850, 690)
    layers = ''
    cols = ['#B9C6CC', '#8FA3AE', '#667E8E', '#435C6E']
    for i, (b, a, c) in enumerate(zip([700, 760, 820, 880], [150, 170, 150, 120], cols)):
        pts = ridge(b, a, 10 + i, sharp=1 + i * .3)
        # 向阳面一道暖色描边
        crest = 'M' + ' L'.join(f'{x} {y:.0f}' for x, y in pts)
        layers += f'<path d="{path(pts, b + 400)}" fill="{c}"/><path d="{crest}" stroke="#FFD8A8" stroke-width="1.6" fill="none" opacity="{.5 - i*.08:.2f}"/>'
        layers += f'<ellipse cx="{rnd.uniform(200, 900):.0f}" cy="{b + 10}" rx="760" ry="{34 + i*6}" fill="#FFF0E0" opacity="{.55 - i*.07:.2f}" filter="url(#bl28)"/>'
    # 近处雪峰：从峰顶放射出的几个块面，向阳面暖白、背阴面冷蓝
    px, py = 430, 640
    def jag(p0, p1, n=9, amp=10):
        out = [p0]
        for i in range(1, n):
            t = i / n
            out.append((p0[0] + (p1[0] - p0[0]) * t + rnd.uniform(-amp, amp), p0[1] + (p1[1] - p0[1]) * t + rnd.uniform(-amp, amp) * .5))
        return out + [p1]
    bases = [(-260, 1000), (-60, 1400), (250, 1420), (520, 1420), (760, 1420), (1180, 1180), (1400, 1000)]
    tones = ['#5A6F92', '#7186AA', '#3F5175', '#F1DCCB', '#D9BFB4', '#FBEADB']
    edges = [jag((px, py), bp, 10, 14) for bp in bases]
    mtn = ''
    for i in range(len(bases) - 1):
        e1, e2 = edges[i], edges[i + 1]
        d = 'M' + ' L'.join(f'{a:.0f} {b:.0f}' for a, b in e1) + ' L' + ' L'.join(f'{a:.0f} {b:.0f}' for a, b in reversed(e2)) + 'Z'
        mtn += f'<path d="{d}" fill="{tones[i]}"/>'
    ridges = ''.join(f'<path d="M' + ' L'.join(f'{a:.0f} {b:.0f}' for a, b in e[:6]) + f'" stroke="#FFF4E4" stroke-width="2" fill="none" opacity="{o}"/>' for e, o in [(edges[3], .9), (edges[4], .5), (edges[5], .6)])
    # 岩石：背阴面靠下、贴着棱线的小块
    rocks = ''
    for k in range(1, 4):
        e = edges[k]
        for t in range(4, 10):
            x, y = e[t]
            w = rnd.uniform(16, 44) * (t / 6)
            rocks += f'<path d="M{x:.0f} {y:.0f} l{-w:.0f} {w*.9:.0f} l{w*.35:.0f} {w*.25:.0f}Z" fill="#26324A" opacity=".55"/>'
    shade = ''
    gullies = ''
    bx, by, br = 432, 624, 19
    plume = ''.join(f'<ellipse cx="{px - 40 - i*55:.0f}" cy="{py - 10 - i*8:.0f}" rx="{60 + i*30:.0f}" ry="{10 + i*4:.0f}" fill="#FFFFFF" opacity="{.42 - i*.07:.2f}" filter="url(#bl14)"/>' for i in range(5))
    spray = ''.join(f'<circle cx="{bx + rnd.gauss(0, 22):.0f}" cy="{by + br - rnd.uniform(0, 26):.0f}" r="{rnd.uniform(.8, 2.2):.1f}" fill="#fff" opacity="{rnd.uniform(.5, .95):.2f}"/>' for _ in range(26))
    stars = ''.join(f'<circle cx="{rnd.uniform(20, 1060):.0f}" cy="{rnd.uniform(20, 300):.0f}" r="{rnd.uniform(.5, 1.2):.1f}" fill="#F7EBD6" opacity="{rnd.uniform(.15, .5):.2f}"/>' for _ in range(50))
    body = f'''
<defs>
<linearGradient id="sk87" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1F2E"/><stop offset=".3" stop-color="#2B4B63"/><stop offset=".46" stop-color="#9A9CA5"/><stop offset=".52" stop-color="#F2B98A"/><stop offset=".58" stop-color="#FFE1B8"/><stop offset="1" stop-color="#FFE1B8"/></linearGradient>
<linearGradient id="snowL87" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9BB0CF"/><stop offset=".5" stop-color="#4E6283"/><stop offset="1" stop-color="#1A2638"/></linearGradient>
<linearGradient id="snowR87" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4E6"/><stop offset=".25" stop-color="#F3D8C4"/><stop offset=".7" stop-color="#7E8AA4"/><stop offset="1" stop-color="#1E2838"/></linearGradient>
<linearGradient id="fade87" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2436" stop-opacity="0"/><stop offset="1" stop-color="#1A2436" stop-opacity=".75"/></linearGradient>
<linearGradient id="bt87" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A121C" stop-opacity="0"/><stop offset="1" stop-color="#0A121C" stop-opacity=".92"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sk87)"/>{stars}
<circle cx="{sun[0]}" cy="{sun[1]}" r="260" fill="#FFD9A0" opacity=".6" filter="url(#bl60)"/>
<circle cx="{sun[0]}" cy="{sun[1]}" r="26" fill="#FFF6DE" filter="url(#bl6)"/>
{layers}
{mtn}<rect y="900" width="{W}" height="450" fill="url(#fade87)"/>
{gullies}{rocks}
{ridges}
{plume}
<ellipse cx="{bx}" cy="{by + br - 2}" rx="{br*1.5:.0f}" ry="7" fill="#5A6E92" opacity=".7" filter="url(#bl6)"/>
{spray}
{ball('b87', bx, by, br, rot=-20)}
<path d="M{bx - br*1.4:.0f} {by + br*.55:.0f} q{br*1.4:.0f} {br*.5:.0f} {br*2.8:.0f} 0" stroke="#EEF2FA" stroke-width="7" fill="none" stroke-linecap="round"/>
<g stroke="#F7EBD6" stroke-width="1.4" fill="none" opacity=".85"><path d="M{bx+26} {by-14} L{bx+60} {by-56} H{bx+84}"/></g>
<text x="{bx+92}" y="{by-49}" font-family="{SANS}" font-size="22" letter-spacing="3" fill="#F7EBD6" opacity=".92">在这儿。</text>
<rect y="1050" width="{W}" height="300" fill="url(#bt87)"/>
{tag('LOB · 2,962 M')}
{headline(META['lines'], y=290, size=60, colors=(C['cream'], C['lime']), ls=3, lh=80)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
