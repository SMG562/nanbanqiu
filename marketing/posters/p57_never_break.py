from lib import *

META = dict(
    id=57, slug='never-break', title='怕断线，又怕一直不断', lines=['怕断线，', '又怕一直不断。'],
    style=['写实光影', '微距', '幽默'], tone='深色', demo=False,
    concept='拍线微距，线床完好无损；一张吊牌系在线上：穿线日期 2023.03，至今一根没断；怕断线，又怕自己打了三年都打不断',
    use='拍线 / 力量的小心思；打过球的人都懂',
)


def svg():
    random.seed(57)
    vx = [30 + 150 * i for i in range(8)]
    hy = [180 + 160 * j for j in range(8)]
    def stroke(d, w=11, col='#F4F1E4'):
        return f'<path d="{d}" fill="none" stroke="#000" stroke-width="{w+7}" stroke-linecap="round" opacity=".35" transform="translate(5 8)" filter="url(#bl6)"/><path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/><path d="{d}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".6" transform="translate(-2 -2)"/>'
    vert = ''.join(stroke(f'M{x} -40 V1400') for x in vx)
    hor = ''.join(stroke(f'M-40 {y} H1120') for y in hy)
    over = ''.join(stroke(f'M{x} {y-34} V{y+34}') for i, x in enumerate(vx) for j, y in enumerate(hy) if (i + j) % 2 == 0)
    body = f'''
<defs><radialGradient id="bg57" cx="50%" cy="46%" r="70%"><stop offset="0" stop-color="#1A6B49"/><stop offset="1" stop-color="#04180F"/></radialGradient>
<linearGradient id="tp57" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120B" stop-opacity=".97"/><stop offset=".6" stop-color="#03120B" stop-opacity=".9"/><stop offset="1" stop-color="#03120B" stop-opacity="0"/></linearGradient>
<linearGradient id="bt57" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120B" stop-opacity="0"/><stop offset="1" stop-color="#03120B" stop-opacity=".95"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg57)"/>
{ball('s', 300, 960, 330, rot=-24, blur=7)}
<g>{vert}{hor}{over}</g>
<path d="M630 660 C660 740 690 760 740 800" fill="none" stroke="#C9B58A" stroke-width="4" stroke-linecap="round"/>
<g transform="translate(790 880) rotate(9)">
 <rect x="-14" y="22" width="372" height="236" rx="22" fill="#000" opacity=".4" filter="url(#bl14)"/>
 <rect x="-130" y="-120" width="260" height="170" rx="18" fill="#F7EBD6"/>
 <circle cx="-100" cy="-90" r="9" fill="#04180F"/>
 <text x="-80" y="-60" font-family="{SANS}" font-weight="700" font-size="18" letter-spacing="3" fill="#5C4A2B">穿线日期</text>
 <text x="-80" y="-14" font-family="{SERIF}" font-weight="900" font-size="46" fill="#0B3B2A">2023.03</text>
 <text x="-110" y="30" font-family="{SANS}" font-weight="700" font-size="21" letter-spacing="2" fill="#B8441E">至今，一根没断</text>
</g>
<rect width="{W}" height="520" fill="url(#tp57)"/>
<rect y="1080" width="{W}" height="270" fill="url(#bt57)"/>
{tag('STILL INTACT', color='#F7EBD6')}
{headline(META['lines'], y=290, size=62, colors=C['cream'], ls=3, lh=80)}
{wordmark(1268, '#fff', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
