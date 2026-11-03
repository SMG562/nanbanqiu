from lib import *

META = dict(
    id=48, slug='swatch', title='球场色卡', lines=['球场色卡'],
    style=['排版', '质感', '信息图'], tone='亮色', demo=False,
    concept='像潘通色卡：红土、假草、硬地三块出血色块，各一颗球和一句小毛病（袜子会红 / 鞋里有沙 / 膝盖有意见）',
    use='场地科普 / 约球时选场地；系列开篇',
)


def svg():
    random.seed(48)
    r = random.Random(48)
    pw = 360
    cards = [('红土', 'CLAY', '袜子会红', '#C9552E'), ('假草', 'TURF', '鞋里有沙', '#2E7D4F'), ('硬地', 'HARD', '膝盖有意见', '#2F6DB3')]
    panels = ''
    for i, (zh, en, line, col) in enumerate(cards):
        x = i * pw; cx = x + pw // 2
        extra = ''
        if i == 0:
            extra = (f'<rect x="{x}" width="{pw}" height="1190" filter="url(#cl48)" opacity=".55"/>'
                     + ''.join(f'<circle cx="{x + r.uniform(0,pw):.0f}" cy="{r.uniform(0,1190):.0f}" r="{r.uniform(.8,2.4):.1f}" fill="{r.choice(["#7A2E14", "#F2B48C"])}" opacity="{r.uniform(.15,.4):.2f}"/>' for _ in range(160))
                     + f'<path d="M{x-10} 760 H{x+pw+10}" stroke="#F5EDE0" stroke-width="12" filter="url(#rough2)"/>')
        elif i == 1:
            cols = ['#3EA866', '#1F6F42', '#58BE7C', '#18583A']
            for _ in range(420):
                bx_, by_ = x + r.uniform(0, pw), r.uniform(0, 1190)
                a = math.radians(-90 + r.gauss(0, 30)); l = r.uniform(22, 52)
                extra += f'<path d="M{bx_:.0f} {by_:.0f} L{bx_ + math.cos(a)*l:.0f} {by_ + math.sin(a)*l:.0f}" stroke="{r.choice(cols)}" stroke-width="{r.uniform(1.2,2.3):.1f}" stroke-linecap="round" opacity=".8"/>'
            extra += ''.join(f'<circle cx="{x + r.uniform(0,pw):.0f}" cy="{r.uniform(600,1190):.0f}" r="{r.uniform(.8,2.2):.1f}" fill="#E6D3A0" opacity=".85"/>' for _ in range(140))
            extra += f'<path d="M{cx+40} -10 V1200" stroke="#F4F1E6" stroke-width="12" opacity=".0"/><path d="M{x-10} 760 H{x+pw+10}" stroke="#F4F1E6" stroke-width="12" opacity=".9"/>'
        else:
            extra = (f'<rect x="{x}" width="{pw}" height="1190" fill="url(#sh48)"/>'
                     f'<path d="M{x+60} 1210 V760 H{x+pw+10}" stroke="#F4F1E6" stroke-width="12" fill="none"/>')
        panels += f'''<g clip-path="url(#pc{i})"><rect x="{x}" width="{pw}" height="1190" fill="{col}"/>{extra}
 <ellipse cx="{cx}" cy="640" rx="92" ry="17" fill="#000" opacity=".28" filter="url(#bl14)"/>
 {ball(f'p{i}', cx, 540, 96, rot=-22 + i * 30)}</g>
 <rect x="{x+28}" y="880" width="{pw-56}" height="226" fill="#F7F3EA"/>
 <text x="{x+52}" y="968" font-family="{SERIF}" font-weight="900" font-size="58" fill="#0B3B2A">{zh}</text>
 <text x="{x+54}" y="1016" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="3" fill="#0B3B2A">{line}</text>
 <text x="{x+54}" y="1074" font-family="{SANS}" font-weight="500" font-size="15" letter-spacing="8" fill="#0B3B2A" opacity=".6">{en}</text>
 <rect x="{x+pw-86}" y="900" width="34" height="34" fill="{col}"/>'''
    body = f'''
<defs>
 <filter id="cl48" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".014 .03" numOctaves="4" seed="9"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .15  0 0 0 0 .06  1.9 0 0 0 -.7"/></filter>
 <linearGradient id="sh48" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6AA2E0" stop-opacity=".5"/><stop offset="1" stop-color="#143B78" stop-opacity=".35"/></linearGradient>
 {''.join(f'<clipPath id="pc{i}"><rect x="{i*pw}" width="{pw}" height="1190"/></clipPath>' for i in range(3))}
</defs>
<rect width="{W}" height="{H}" fill="#0B3B2A"/>
{panels}
{tag('SURFACES', color='#FFF3E4', rule='#FFF3E4', op=.95, weight=700)}
{headline(META['lines'], y=290, size=56, colors='#FFF3E4', ls=4)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.16)}'''
    return page(body)
