from lib import *

META = dict(
    id=101, slug='clothesline', title='洗不干净了', lines=['白袜子，', '洗不干净了。'],
    style=['平面', '极简', '光影'], tone='亮色', demo=False,
    concept='扁平光影插画：钴蓝晴空，一根晾衣绳斜穿画面；白球衣被风吹鼓，一双白袜子是主角，袜底留着一片洗不掉的红土色',
    use='打过红土的人都懂；平涂色块、锐利的布料阴影',
)

SKY = '#2F6FD6'
WHITE, FOLD, FOLD2 = '#FFFFFF', '#D6E2F2', '#BFD0E8'
CLAY = '#C8603A'


def svg():
    def ly(x):
        return 560 + (x + 40) * .17 - 60 * math.sin(math.pi * (x + 40) / 1180)
    line = 'M-40 ' + f'{ly(-40):.1f} ' + ' '.join(f'L{x} {ly(x):.1f}' for x in range(-20, 1160, 20))
    def peg(x):
        y = ly(x)
        return f'<rect x="{x-7}" y="{y-20:.0f}" width="14" height="44" rx="3" fill="#E2C39A"/><rect x="{x-7}" y="{y-20:.0f}" width="5" height="44" rx="2" fill="#F0D8B4"/>'
    # 球衣：裁出画面左边，被风吹鼓
    sx = -60
    sy = ly(sx + 120)
    shirt = f'''<g transform="translate({sx} {sy:.0f}) rotate(10)">
<path d="M0 0 L120 -4 Q160 34 210 -6 L330 2 L400 120 L330 150 L330 500 Q180 530 30 500 L28 150 L-40 120Z" fill="{WHITE}"/>
<path d="M210 -6 L330 2 L400 120 L330 150 L330 500 Q260 515 220 512 Q270 300 210 -6Z" fill="{FOLD}"/>
<path d="M120 -4 Q160 34 210 -6 L198 46 Q162 72 130 46Z" fill="{FOLD2}"/>
<path d="M165 60 V180" stroke="{FOLD2}" stroke-width="4"/>
<path d="M60 170 Q90 330 70 490 L110 495 Q120 330 96 170Z" fill="{FOLD}" opacity=".7"/>
</g>'''
    def sock(x, rot, s, id):
        y = ly(x) + 2
        d = 'M2 0 H108 C110 80 114 170 120 222 C126 252 150 262 186 266 C232 270 262 274 280 296 C296 322 280 352 244 354 C190 358 120 360 70 352 C20 344 2 316 0 270 C-2 180 0 90 2 0Z'
        return f'''<g transform="translate({x} {y:.0f}) rotate({rot}) scale({s})">
<clipPath id="sk{id}"><path d="{d}"/></clipPath>
<path d="{d}" fill="{WHITE}"/>
<g clip-path="url(#sk{id})">
<path d="M70 0 H120 V230 Q110 300 60 360 H-10 V0Z" fill="{FOLD}" opacity=".0"/>
<path d="M84 0 H130 V360 H96 C104 300 100 200 84 0Z" fill="{FOLD}"/><path d="M150 268 C220 272 266 284 290 320 V370 H200 C230 330 210 290 150 268Z" fill="{FOLD}"/>
<rect x="-10" y="0" width="140" height="58" fill="{WHITE}"/>{''.join(f'<path d="M{k} 6 V54" stroke="#E3EAF3" stroke-width="2.4"/>' for k in range(10, 108, 11))}
<rect x="-10" y="18" width="140" height="8" fill="#176B4D"/><rect x="-10" y="32" width="140" height="5" fill="#C6EA3D"/>
<path d="M-10 312 C40 300 90 296 150 304 C210 312 250 300 300 296 V380 H-10Z" fill="{CLAY}" opacity=".62"/>
<path d="M-10 312 C40 300 90 296 150 304 C210 312 250 300 300 296" stroke="#E08A62" stroke-width="10" fill="none" opacity=".5"/>
<path d="M-10 290 C10 280 30 282 50 292 L40 312 L-10 316Z" fill="{CLAY}" opacity=".35"/>
</g></g>'''
    clouds = '''<path d="M640 230 Q660 190 710 196 Q740 160 790 178 Q830 158 860 196 Q910 196 916 230Z" fill="#FFFFFF"/>
<path d="M640 1150 Q660 1120 700 1124 Q730 1096 770 1112 Q810 1098 830 1130 Q870 1130 876 1150Z" fill="#FFFFFF" opacity=".9"/>'''
    leaves = ''.join(f'<g transform="translate({x} {y}) rotate({a})"><path d="M0 0 Q48 -12 100 0 Q48 12 0 0Z" fill="{c}"/></g>' for x, y, a, c in [(1000, -10, 110, '#2E6B4A'), (1050, 20, 130, '#3C7E58'), (970, 40, 96, '#24583D'), (1080, 70, 120, '#2E6B4A')])
    body = f'''
<rect width="{W}" height="{H}" fill="{SKY}"/>
{clouds}{leaves}
{shirt}
{sock(560, 4, 1.05, 'a')}{sock(780, -3, 1.0, 'b')}
<path d="{line}" stroke="#F6F3EC" stroke-width="3.5" fill="none"/>
{''.join(peg(x) for x in (40, 230, 590, 648, 806, 864))}
{tag('AFTER CLAY · SUNDAY', color='#FFFFFF', op=.85)}
<text x="80" y="290" font-family="{SANS}" font-weight="700" font-size="54" letter-spacing="4" fill="#FFFFFF">白袜子，</text>
<text x="80" y="366" font-family="{SANS}" font-weight="700" font-size="54" letter-spacing="4" fill="{C['lime']}">洗不干净了。</text>
{wordmark(1272, '#fff', sub=False)}
{grain(.08, light=True)}'''
    return page(body)
