from lib import *
from mao3 import figure3, DOWN_L, DOWN_R


META = dict(
    id=84, slug='mao-rong-sunset', title='打完球，看会儿天', lines=['打完球，', '看会儿天。'],
    style=['插画', '角色', '意境', '暖色'], tone='暖色', demo=False,
    concept='36 号范式：角色放进有光的场景。傍晚的草坡上，小毛和小绒牵着手一起看日落；渐变天空 + 光芒 + 三层平涂山丘，立体球 + 黑色细线手脚',
    use='傍晚场 / 打完球的小红书配图；小毛小绒首张场景海报',
)




def svg():
    random.seed(84)
    sx, sy = 540, 830
    rays = ''.join(f'<path d="M{sx} {sy} L{sx + 1400*math.cos(a):.0f} {sy + 1400*math.sin(a):.0f} L{sx + 1400*math.cos(a+.06):.0f} {sy + 1400*math.sin(a+.06):.0f} Z"/>'
                   for a in [math.pi + i * math.pi / 15 for i in range(16)])
    birds = ''.join(f'<path transform="translate({x} {y}) scale({s})" d="M-14 0 Q-7 -9 0 0 Q7 -9 14 0" fill="none" stroke="#0B3B2A" stroke-width="3" stroke-linecap="round"/>'
                    for x, y, s in [(830, 560, 1.1), (910, 520, .8), (190, 640, .8)])
    rm, rr = 150, 138
    gy = 1100
    xm, xr = 372, 716
    cym, cyr = gy - 1.53 * rm, gy - 1.53 * rr
    mx, my = (xm + xr) / 2, gy - 150
    hm = ((mx - 5 - xm) / rm, (my - cym) / rm)
    hr = ((mx + 5 - xr) / rr, (my - cyr) / rr)
    a1 = figure3('m', xm, 0, rm, dict(L=DOWN_L, R=((1.32, .55), hm), legs='stand'), 'happy', gy=gy)
    a2 = figure3('r', xr, 0, rr, dict(L=((-1.32, .55), hr), R=DOWN_R, legs='stand'), 'happy', gy=gy, char='rong', look=1)
    arm = ''
    body = f'''
<defs>
 <linearGradient id="bg84" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F5F66"/><stop offset=".38" stop-color="#7FB5A8"/><stop offset=".66" stop-color="#F6C69A"/><stop offset="1" stop-color="#FFD9A0"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg84)"/>
<g fill="#FFF6D8" opacity=".17">{rays}</g>
<circle cx="{sx}" cy="{sy}" r="360" fill="#FFE9B0" opacity=".55" filter="url(#bl60)"/>
<circle cx="{sx}" cy="{sy}" r="92" fill="#FFF3C8"/>
{birds}
<g opacity=".95"><ellipse cx="170" cy="740" rx="150" ry="28" fill="#FFF6E6" filter="url(#bl14)"/><ellipse cx="920" cy="700" rx="170" ry="30" fill="#FFF6E6" filter="url(#bl14)"/></g>
<path d="M0 930 Q300 880 580 935 T1080 915 V1350 H0 Z" fill="#6FA58A"/>
<path d="M0 985 Q320 945 640 990 T1080 975 V1350 H0 Z" fill="#8CC27A"/>
<path d="M0 1040 Q300 1010 560 1040 T1080 1030 V1350 H0 Z" fill="#B5DA86"/>
{tag('SUNSET · MELBOURNE', color='#0B3B2A', rule='#0B3B2A', op=.8, weight=700)}
{headline(META['lines'], y=330, size=104, colors=('#0B3B2A', '#C2410C'), ls=4)}
{a1}{a2}{arm}
<path d="M0 1186 Q540 1156 1080 1186 V1350 H0 Z" fill="#0B3B2A"/>
{wordmark(1272, '#F3E6CC', sub=False, op=.95)}
{grain(.16, True)}'''
    return page(body)
