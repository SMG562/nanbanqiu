from lib import *

META = dict(
    id=36, slug='good-morning', title='早安小球', lines=['早安，', '今天也有球。'],
    style=['插画', '意境', '拟人'], tone='暖色', demo=False,
    concept='「晚安」的另一半：小球像朝阳一样从远处的草坡后升起，睁眼笑着，光芒四散',
    use='早场约球、清晨打卡；和 30 号晚安成对使用',
)


def svg():
    random.seed(36)
    bx, by, br = 540, 850, 180
    rays = ''.join(f'<path d="M{bx} {by} L{bx + 1200*math.cos(a):.0f} {by + 1200*math.sin(a):.0f} L{bx + 1200*math.cos(a+.07):.0f} {by + 1200*math.sin(a+.07):.0f} Z"/>'
                   for a in [math.pi + i * math.pi / 14 for i in range(15)])
    birds = ''.join(f'<path transform="translate({x} {y}) scale({s})" d="M-14 0 Q-7 -9 0 0 Q7 -9 14 0" fill="none" stroke="#0B3B2A" stroke-width="3" stroke-linecap="round"/>'
                    for x, y, s in [(820, 560, 1.1), (900, 520, .8), (200, 600, .8)])
    body = f'''
<defs>
 <linearGradient id="bg36" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B5E5E"/><stop offset=".4" stop-color="#7FB5A0"/><stop offset=".7" stop-color="#F6C69A"/><stop offset="1" stop-color="#FFE2AE"/></linearGradient>
 <linearGradient id="hill36" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B7A52"/><stop offset="1" stop-color="#0B3B2A"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg36)"/>
<g fill="#FFF6D8" opacity=".16">{rays}</g>
<circle cx="{bx}" cy="{by}" r="{br*2.2:.0f}" fill="#FFF0B8" opacity=".5" filter="url(#bl60)"/>
{birds}
<g opacity=".95"><ellipse cx="180" cy="720" rx="150" ry="30" fill="#FFF6E6" filter="url(#bl14)"/><ellipse cx="900" cy="690" rx="170" ry="32" fill="#FFF6E6" filter="url(#bl14)"/></g>
{ball('b', bx, by, br)}{face(bx + 6, by + 8, 1.4, 'smile', 0)}
<path d="M0 960 Q260 900 540 960 T1080 940 V1350 H0 Z" fill="url(#hill36)"/>
<path d="M0 1040 Q300 990 600 1040 T1080 1030 V1350 H0 Z" fill="#0E5139"/>
<path d="M0 1130 Q540 1090 1080 1130 V1350 H0 Z" fill="#062318"/>
{tag('GOOD MORNING', color='#0B3B2A', rule='#0B3B2A', op=.8, weight=700)}
{headline(META['lines'], y=330, size=104, colors=('#0B3B2A', '#C2410C'), ls=4)}
{wordmark(1268, '#F3E6CC', sub=False, op=.95)}
{grain(.18, True)}'''
    return page(body)
