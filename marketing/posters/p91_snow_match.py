from lib import *

META = dict(
    id=91, slug='snow-match', title='一拍即合', lines=['一拍', '即合。'],
    style=['写实光影', '极简', '双关'], tone='亮色', demo=False,
    concept='钴蓝晴空下的雪原，两颗荧光网球并排半埋在雪里，挨在一起；「一拍即合」本来就有个「拍」字',
    use='品牌主视觉：按水平匹配，找到合得来的球友；高调、明亮、大色块',
)

SKY_TOP, SKY_BOT = '#0A3BB0', '#2C6FE0'


def buried(id, cx, cy, r, snow_y, rot):
    """半埋在雪里的球：雪面以上的部分 + 雪面边缘的小雪堆 + 向右下的蓝色影子。"""
    return f'''
<ellipse cx="{cx + r*.55:.0f}" cy="{snow_y + r*.12:.0f}" rx="{r*1.25:.0f}" ry="{r*.2:.0f}" fill="#7C9CD8" opacity=".55" filter="url(#bl14)"/>
<clipPath id="cut{id}"><path d="M{cx - r*1.4:.0f} {cy - r*1.4:.0f} H{cx + r*1.4:.0f} V{snow_y:.0f} Q{cx:.0f} {snow_y + r*.1:.0f} {cx - r*1.4:.0f} {snow_y:.0f}Z"/></clipPath>
<g clip-path="url(#cut{id})">{ball(id, cx, cy, r, rot=rot)}
<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#sh{id})"/>
<rect x="{cx - r:.0f}" y="{snow_y - r*.32:.0f}" width="{2*r}" height="{r*.34:.0f}" fill="url(#ao{id})"/></g>
<defs><linearGradient id="ao{id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5D7FC0" stop-opacity="0"/><stop offset="1" stop-color="#5D7FC0" stop-opacity=".45"/></linearGradient></defs>
<g fill="#fff">{''.join(f'<ellipse cx="{cx - r*.35 + random.uniform(-r*.35, r*.35):.0f}" cy="{cy - r*.86 + random.uniform(-r*.06, r*.12):.0f}" rx="{random.uniform(1.5, 5)*r/200:.1f}" ry="{random.uniform(1, 3)*r/200:.1f}" opacity="{random.uniform(.7, 1):.2f}"/>' for _ in range(int(r/5)))}</g>
<defs><radialGradient id="sh{id}" cx="30%" cy="25%" r="95%"><stop offset=".45" stop-color="#1A3A00" stop-opacity="0"/><stop offset="1" stop-color="#1A3A00" stop-opacity=".55"/></radialGradient></defs>
<path d="M{cx - r*1.12:.0f} {snow_y + 4:.0f} Q{cx - r*.98:.0f} {snow_y - r*.2:.0f} {cx - r*.62:.0f} {snow_y - r*.1:.0f} Q{cx - r*.2:.0f} {snow_y - r*.02:.0f} {cx + r*.1:.0f} {snow_y - r*.08:.0f} Q{cx + r*.5:.0f} {snow_y - r*.16:.0f} {cx + r*.75:.0f} {snow_y - r*.08:.0f} Q{cx + r*.98:.0f} {snow_y - r*.14:.0f} {cx + r*1.14:.0f} {snow_y + 5:.0f} Q{cx:.0f} {snow_y + r*.22:.0f} {cx - r*1.12:.0f} {snow_y + 4:.0f}Z" fill="url(#rim91)"/>
<g fill="#fff">{''.join(f'<circle cx="{cx + random.uniform(-r*.9, r*.9):.0f}" cy="{snow_y - random.uniform(0, r*.06):.0f}" r="{random.uniform(1.5, 4):.1f}"/>' for _ in range(int(r/6)))}</g>'''


def svg():
    random.seed(91)
    rnd = random.Random(91)
    # 雪原：三道平缓的雪坡，左上来光，坡的右侧背阴（淡蓝）
    hills = f'''
<path d="M-40 760 C200 700 420 690 640 740 C820 780 960 760 1120 720 V1400 H-40Z" fill="url(#sn1)"/>
<path d="M640 740 C820 780 960 760 1120 720 V800 C960 830 820 840 700 800Z" fill="#B8CBEB" opacity=".55" filter="url(#bl14)"/>
<path d="M-40 900 C260 840 560 860 800 930 C940 970 1040 960 1120 940 V1400 H-40Z" fill="url(#sn2)"/>
<path d="M560 870 C700 890 760 920 820 940 C700 960 600 930 520 900Z" fill="#AFC4E8" opacity=".5" filter="url(#bl14)"/>
'''
    sparkle = ''.join(f'<circle cx="{rnd.uniform(0, 1080):.0f}" cy="{rnd.uniform(740, 1350):.0f}" r="{rnd.uniform(.6, 1.8):.1f}" fill="#fff" opacity="{rnd.uniform(.5, 1):.2f}"/>' for _ in range(260))
    body = f'''
<defs>
<linearGradient id="sky91" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{SKY_TOP}"/><stop offset="1" stop-color="{SKY_BOT}"/></linearGradient>
<linearGradient id="sn1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F8FF"/><stop offset="1" stop-color="#DCE7F8"/></linearGradient>
<linearGradient id="sn2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#EEF3FC"/><stop offset="1" stop-color="#D6E2F6"/></linearGradient>
<linearGradient id="rim91" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#D2DFF5"/></linearGradient>
<filter id="snow91" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .65  0 0 0 0 .85  0 0 0 -1.6 1.05"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky91)"/>
{hills}
<rect y="700" width="{W}" height="{H-700}" filter="url(#snow91)" opacity=".4" clip-path="url(#ground91)"/>
<clipPath id="ground91"><path d="M-40 760 C200 700 420 690 640 740 C820 780 960 760 1120 720 V1400 H-40Z"/></clipPath>
{buried('f91', 790, 812, 62, 840, -30)}
{buried('n91', 420, 1010, 205, 1062, -18)}
{sparkle}
<text x="80" y="300" font-family="{SANS}" font-weight="900" font-size="150" letter-spacing="6" fill="#FFFFFF">一拍</text>
<text x="80" y="470" font-family="{SANS}" font-weight="900" font-size="150" letter-spacing="6" fill="{C['lime']}">即合。</text>
<text x="84" y="1186" font-family="{SANS}" font-weight="700" font-size="34" letter-spacing="2" fill="#123A8C">水平差不多，时间也<tspan fill="#176B4D">对得上</tspan>。</text>
<g transform="translate(330 0)">{wordmark(1268, '#123A8C', sub=False)}</g>
{grain(.08, light=True)}'''
    return page(body)
