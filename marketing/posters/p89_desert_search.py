from lib import *

META = dict(
    id=89, slug='desert-search', title='找了一个下午', lines=['找球，', '找了一个下午。'],
    style=['写实光影', '风景'], tone='暖色', demo=False,
    concept='傍晚低斜的太阳下，一层层沙丘，背光面是深赭色；一串脚印从地平线弯弯绕绕走来，中途还绕了一圈，最后停在近处一颗球旁边，球的影子拉得很长',
    use='「打得有点远」系列：找球是每个打球的人都干过的事',
)


def svg():
    rnd = random.Random(89)
    sun = (930, 600)
    dunes = ''
    specs = [(640, 70, '#E2A574', '#B0663F', 1), (700, 90, '#D9925C', '#9A5132', 2), (790, 120, '#CF8048', '#87432A', 3), (930, 150, '#C47038', '#6E3420', 4), (1110, 190, '#B9622F', '#5A2A18', 5)]
    for base, amp, lit, dark, sd in specs:
        r = random.Random(sd)
        ph = [r.uniform(0, 6.28) for _ in range(3)]
        crest = []
        for x in range(-40, W + 60, 10):
            y = base - amp * (.55 + .3 * math.sin(x / 210 + ph[0]) + .15 * math.sin(x / 90 + ph[1]))
            crest.append((x, y))
        top = 'M' + ' L'.join(f'{x} {y:.0f}' for x, y in crest)
        dunes += f'<defs><linearGradient id="dg{sd}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{lit}"/><stop offset="{.1 + sd*.02:.2f}" stop-color="{lit}"/><stop offset="{.3 + sd*.04:.2f}" stop-color="{dark}"/><stop offset="1" stop-color="{dark}"/></linearGradient></defs><path d="{top} L{W+60} {base+260+sd*40} L-40 {base+260+sd*40}Z" fill="url(#dg{sd})"/><path d="{top} L{W+60} {H+40} L-40 {H+40}Z" fill="url(#dg{sd})" opacity="0"/>'
        dunes += f'<rect x="-40" y="{base+250+sd*40}" width="{W+100}" height="{H}" fill="{dark}"/>'
        # 背光面：在每个波峰左侧（太阳在右），从波峰往下斜切
        shade = ''
        n = len(crest)
        for i in range(1, n - 1):
            x, y = crest[i]
            if crest[i - 1][1] > y < crest[i + 1][1]:          # 波峰
                j = i
                while j > 0 and crest[j - 1][1] >= crest[j][1]:
                    j -= 1                                          # 向左走到谷底
                seg = crest[j:i + 1]
                d = amp * .75
                pts = ' L'.join(f'{a} {b:.0f}' for a, b in seg)
                bot = max(b for _, b in seg) + d
                D = 320
                shade += f'<path d="M{pts} C{x - D*.05:.0f} {y + D*.3:.0f} {x - D*.35:.0f} {y + D*.75:.0f} {x - D*.9:.0f} {y + D:.0f} Q{seg[0][0] - 10} {(y + D + seg[0][1]) / 2:.0f} {seg[0][0]} {seg[0][1]:.0f}Z" fill="{dark}" opacity=".9"/>'
        clip = f'<clipPath id="dc{sd}"><path d="{top} L{W+60} {H+40} L-40 {H+40}Z"/></clipPath>'
        ripples = ''.join(f'<path d="M{r.uniform(-40, 1080):.0f} {r.uniform(base - amp*.3, base + 260):.0f} q{r.uniform(20, 60):.0f} {r.uniform(-6, -2):.0f} {r.uniform(60, 160):.0f} {r.uniform(-2, 4):.0f}" stroke="{dark}" stroke-width="{1 + sd*.3:.1f}" fill="none" opacity=".35"/>' for _ in range(30 + sd * 10))
        dunes += f'{clip}<g clip-path="url(#dc{sd})"><g filter="url(#bl14)" opacity=".35">{shade}</g>{ripples}</g>'
        dunes += f'<path d="{top}" stroke="#FFE2B8" stroke-width="1.4" fill="none" opacity=".55"/>'
    # 脚印：从地平线 (360, 650) 绕一圈来到球旁 (548, 1150)
    pts = []
    for i in range(170):
        t = i / 169
        x = 360 + 220 * math.sin(t * 3.2) * (1 - t * .5) + 190 * t
        y = 650 + 500 * t ** 1.7
        if .42 < t < .58:     # 中途绕一圈
            k = (t - .42) / .16 * 2 * math.pi
            x += 46 * (1 + t) * math.sin(k)
            y += 22 * (1 + t) * (1 - math.cos(k))
        pts.append((x, y))
    steps = ''
    for i in range(1, len(pts), 2):
        x, y = pts[i]
        x0, y0 = pts[i - 1]
        s = .25 + (y - 640) / 520 * 1.2
        ang = math.degrees(math.atan2(y - y0, x - x0))
        side = 1 if (i // 2) % 2 else -1
        nx, ny = -math.sin(math.radians(ang)) * 4 * s * side, math.cos(math.radians(ang)) * 4 * s * side
        steps += f'<ellipse cx="{x + nx:.1f}" cy="{y + ny:.1f}" rx="{5.5*s:.1f}" ry="{2.8*s:.1f}" transform="rotate({ang:.0f} {x + nx:.1f} {y + ny:.1f})" fill="#3A160B" opacity=".7"/>'
    bx, by, br = 600, 1146, 30
    body = f'''
<defs><linearGradient id="sk89" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14304A"/><stop offset=".25" stop-color="#3D6178"/><stop offset=".4" stop-color="#C9A28A"/><stop offset=".46" stop-color="#FFD39A"/><stop offset="1" stop-color="#FFD39A"/></linearGradient>
<linearGradient id="bsh89" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#3A160B" stop-opacity=".8"/><stop offset="1" stop-color="#3A160B" stop-opacity="0"/></linearGradient>
<linearGradient id="bt89" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A0F07" stop-opacity="0"/><stop offset="1" stop-color="#2A0F07" stop-opacity=".85"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#sk89)"/>
<circle cx="{sun[0]}" cy="{sun[1]}" r="300" fill="#FFC27A" opacity=".55" filter="url(#bl60)"/>
<circle cx="{sun[0]}" cy="{sun[1]}" r="32" fill="#FFF3D6" filter="url(#bl6)"/>
{dunes}
{steps}
<path d="M{bx} {by + br - 6} L{bx - 330} {by + br - 2} L{bx - 330} {by + br + 22} L{bx} {by + br + 6}Z" fill="url(#bsh89)" filter="url(#bl6)"/>
<ellipse cx="{bx}" cy="{by + br - 1}" rx="{br:.0f}" ry="6" fill="#3A160B" opacity=".6" filter="url(#bl6)"/>
{ball('b89', bx, by, br, rot=-25)}
<rect y="1100" width="{W}" height="250" fill="url(#bt89)"/>
{tag('OUT · 4:30 PM')}
{headline(META['lines'], y=290, size=60, colors=(C['cream'], '#FFE7A8'), ls=3, lh=80)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
