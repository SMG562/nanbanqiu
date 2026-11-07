from lib import *

META = dict(
    id=92, slug='lob-sun', title='正好对着太阳', lines=['这个高球，', '正好对着太阳。'],
    style=['写实光影', '极简'], tone='亮色', demo=False,
    concept='仰头看：大晴天的钴蓝天，几缕白云，太阳的光晕里有一颗小小的荧光球；画面最下方是球网白色的网带和网眼，近得发亮',
    use='打过球的人都被高球晃过眼；高调明亮的晴天氛围图',
)


def svg():
    rnd = random.Random(92)
    sx, sy = 780, 700
    clouds = ''
    for cx, cy, w in [(170, 560, 300), (930, 980, 260), (420, 1010, 340)]:
        puffs = [(cx + rnd.uniform(-w*.45, w*.45), cy + rnd.uniform(-w*.1, w*.02), rnd.uniform(w*.12, w*.22)) for _ in range(9)]
        base = ''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.0f}"/>' for x, y, r in puffs)
        clouds += f'<g fill="#C9DAF5" filter="url(#bl6)" transform="translate(6 10)">{base}</g><g fill="#FFFFFF" filter="url(#bl6)">{base}</g>'
    flare = ''.join(f'<circle cx="{sx + (300 - sx)*t*2.2:.0f}" cy="{sy + (300 - sy)*t*2.2:.0f}" r="{r}" fill="{c}" opacity="{o}"/>' for t, r, c, o in [(.18, 26, '#FFF4C0', .25), (.3, 12, '#C6EA3D', .3), (.42, 46, '#9FD0FF', .14), (.55, 18, '#FFFFFF', .25)])
    # 球网：网带 + 网眼，从左下斜到右下，近、亮
    net_top = lambda x: 1150 - (x - 540) * .08
    mesh = ''.join(f'<path d="M{x} {net_top(x)+18:.0f} V1400"/>' for x in range(-20, 1100, 22))
    mesh += ''.join(f'<path d="M-20 {net_top(-20)+18+k*22:.0f} L1100 {net_top(1100)+18+k*22:.0f}"/>' for k in range(0, 12))
    bx, by, br = 690, 610, 30
    body = f'''
<defs>
<radialGradient id="sky92" cx="72%" cy="52%" r="95%"><stop offset="0" stop-color="#7FB6FF"/><stop offset=".35" stop-color="#2A6FE6"/><stop offset="1" stop-color="#0838A6"/></radialGradient>
<linearGradient id="tape92" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DDE6F2"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky92)"/>
{clouds}
<circle cx="{sx}" cy="{sy}" r="360" fill="#FFFFFF" opacity=".35" filter="url(#bl60)"/>
<circle cx="{sx}" cy="{sy}" r="150" fill="#FFFDF0" opacity=".85" filter="url(#bl28)"/>
<circle cx="{sx}" cy="{sy}" r="60" fill="#FFFFFF" filter="url(#bl6)"/>
{''.join(f'<path d="M{sx} {sy} L{sx + 900*math.cos(math.radians(a)):.0f} {sy + 900*math.sin(math.radians(a)):.0f}" stroke="#FFFFFF" stroke-width="{w}" opacity=".18"/>' for a, w in [(15, 3), (70, 2), (128, 4), (200, 2), (250, 3), (320, 2)])}
<g filter="url(#bl6)">{flare}</g>
{ball('b92', bx, by, br, rot=-40, blur=.6)}
<circle cx="{bx}" cy="{by}" r="{br+6}" fill="#FFFFFF" opacity=".35" filter="url(#bl6)"/>
<g stroke="#1B2A44" stroke-width="2.4" opacity=".75" fill="none">{mesh}</g>
<path d="M-20 {net_top(-20):.0f} L1100 {net_top(1100):.0f} L1100 {net_top(1100)+30:.0f} L-20 {net_top(-20)+30:.0f}Z" fill="url(#tape92)"/>
<path d="M-20 {net_top(-20)+30:.0f} L1100 {net_top(1100)+30:.0f}" stroke="#9FB0C8" stroke-width="2"/>
<rect y="1215" width="{W}" height="135" fill="#0A2F86"/>
<text x="80" y="290" font-family="{SANS}" font-weight="900" font-size="96" letter-spacing="4" fill="#FFFFFF">这个高球，</text>
<text x="80" y="406" font-family="{SANS}" font-weight="900" font-size="96" letter-spacing="4" fill="{C['lime']}">正好对着太阳。</text>
{wordmark(1290, '#fff', sub=False)}
{grain(.06, light=True)}'''
    return page(body)
