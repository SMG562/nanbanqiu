from lib import *
from mao import mao

META = dict(
    id=74, slug='mao-windy', title='小毛：今天风有点大', lines=['今天风有点大。'],
    style=['写实光影', '角色', '拟人'], tone='深色', demo=False,
    concept='角色设定 B（老球皮型 · 写实）：夜场泛光灯下，写实网球小毛停在底线上，半睁眼，头带被风吹得向一边飘，右边三道风线',
    use='运营形象的写实版；天气 / 夜场主题的主视觉',
)


def svg():
    random.seed(74)
    wind = ''.join(f'<path d="M{x} {y} q60 -16 120 0 t120 0 t100 0" fill="none" stroke="#F7EBD6" stroke-width="3" stroke-linecap="round" opacity="{o}"/>'
                   for x, y, o in [(700, 690, .26), (760, 770, .2), (720, 850, .24)])
    body = f'''
<defs>
 <radialGradient id="bg74" cx="12%" cy="0%" r="110%"><stop offset="0" stop-color="#1A6B4D"/><stop offset=".45" stop-color="#0B3B2A"/><stop offset="1" stop-color="#04120C"/></radialGradient>
 <linearGradient id="fl74" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14573F"/><stop offset="1" stop-color="#082219"/></linearGradient>
 <linearGradient id="cone74" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9FFF0" stop-opacity=".22"/><stop offset="1" stop-color="#E9FFF0" stop-opacity="0"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg74)"/>
<path d="M60 -40 L520 -40 L1080 1010 L360 1010 Z" fill="url(#cone74)" filter="url(#bl60)"/>
<circle cx="110" cy="-10" r="60" fill="#F4FFE8" opacity=".9" filter="url(#bl28)"/>
<rect x="0" y="930" width="{W}" height="{H-930}" fill="url(#fl74)"/>
<rect x="0" y="996" width="{W}" height="20" fill="#F3EBDD" opacity=".9"/>
{wind}
<ellipse cx="590" cy="1006" rx="215" ry="24" fill="#000" opacity=".55" filter="url(#bl14)"/>
{mao('main', 540, 806, 200, 'flat', style='real', tilt=-6, blow=True)}
{tag('MELBOURNE · 8:40 PM')}
{headline(META['lines'], y=292, size=72, colors=(C['cream'],), ls=3)}
{wordmark(1268, '#fff', sub=False)}
{grain(.2)}'''
    return page(body)
