from lib import *

META = dict(
    id=99, slug='doorway', title='出门前', lines=['出门前，', '又看了一眼天气。'],
    style=['写实光影', '极简'], tone='浅色', demo=False,
    concept='周六清早的玄关：深绿的门开了一条缝，门外的晴光斜斜铺进木地板；球包靠在门边的墙上，一双白球鞋摆在光里；伞筒里的伞今天用不上',
    use='周末约球的日常氛围；明亮、克制',
)


def svg():
    rnd = random.Random(99)
    fy = 930                       # 墙脚线
    vp = (520, 620)
    planks = ''.join(f'<path d="M{vp[0] + (x - vp[0]) * .0:.0f} {fy} L{x} {H}" stroke="#B88E62" stroke-width="1.4" opacity=".55"/>'.replace(f'M{vp[0]:.0f} {fy}', f'M{vp[0] + (x - vp[0]) * (fy - vp[1]) / (H - vp[1]):.0f} {fy}') for x in range(-1200, 2400, 120))
    joints = ''.join(f'<path d="M-20 {y:.0f} H1100" stroke="#B88E62" stroke-width="1" opacity=".25"/>' for y in [fy + 40, fy + 100, fy + 190, fy + 320])
    # 门：开一条缝
    dx0, dx1, dy0 = 650, 960, 250
    gap = 70
    door = f'''<rect x="{dx0-18}" y="{dy0-18}" width="{dx1-dx0+36}" height="{fy-dy0+18}" fill="#F7F2EA"/>
<rect x="{dx0-18}" y="{dy0-18}" width="{dx1-dx0+36}" height="{fy-dy0+18}" fill="none" stroke="#DCD3C4" stroke-width="2"/>
<rect x="{dx0}" y="{dy0}" width="{gap}" height="{fy-dy0}" fill="url(#out99)"/>
<g filter="url(#bl6)"><ellipse cx="{dx0+30}" cy="{fy-160}" rx="50" ry="120" fill="#8DBB78" opacity=".7"/></g>
<rect x="{dx0}" y="{dy0}" width="{gap}" height="{fy-dy0}" fill="#FFFFFF" opacity=".35"/>
<rect x="{dx0+gap}" y="{dy0}" width="{dx1-dx0-gap}" height="{fy-dy0}" fill="url(#door99)"/>
<rect x="{dx0+gap+36}" y="{dy0+40}" width="{dx1-dx0-gap-72}" height="250" rx="4" fill="none" stroke="#173A2C" stroke-width="4"/>
<rect x="{dx0+gap+36}" y="{dy0+330}" width="{dx1-dx0-gap-72}" height="280" rx="4" fill="none" stroke="#173A2C" stroke-width="4"/>
<rect x="{dx0+gap}" y="{dy0}" width="10" height="{fy-dy0}" fill="#FFFFFF" opacity=".25"/>
<circle cx="{dx0+gap+28}" cy="{dy0+360}" r="9" fill="#C9A45C"/><rect x="{dx0+gap+20}" y="{dy0+356}" width="34" height="8" rx="4" fill="#C9A45C"/>'''
    # 门缝的光：铺到地上的楔形，墙上一道亮边
    light = f'''<path d="M{dx0} {fy} L{dx0+gap} {fy} L{560} {H} L{150} {H}Z" fill="url(#beam99)" filter="url(#bl6)"/>
<path d="M{dx0-18} {dy0} L{dx0-18} {fy} L{dx0-120} {fy} L{dx0-60} {dy0+40}Z" fill="#FFF3D9" opacity=".0"/>'''
    # 球包：靠在门左边的墙上
    bag = '''<g transform="rotate(-8 520 900)">
<rect x="470" y="420" width="120" height="500" rx="56" fill="#174A35"/>
<rect x="470" y="420" width="38" height="500" rx="19" fill="#FFFFFF" opacity=".08"/>
<path d="M530 440 V900" stroke="#C6EA3D" stroke-width="3"/>
<rect x="522" y="470" width="16" height="30" rx="4" fill="#C6EA3D"/>
<rect x="476" y="600" width="108" height="16" fill="#0F3426"/>
<path d="M478 520 C420 600 420 760 480 840" stroke="#0F3426" stroke-width="10" fill="none" stroke-linecap="round"/>
</g>'''
    bag_sh = '<path d="M440 440 L360 460 L410 930 L480 920Z" fill="#B9AE9C" opacity=".35" filter="url(#bl14)"/>'
    # 白球鞋一双，摆在光里
    def shoe(x, y, s, flip=1):
        return f'''<g transform="translate({x} {y}) scale({s*flip} {s})">
<ellipse cx="0" cy="34" rx="98" ry="12" fill="#9C7A54" opacity=".35" filter="url(#bl6)"/>
<path d="M-96 26 Q-100 -6 -70 -14 L-20 -26 Q10 -54 50 -50 Q80 -46 92 -10 Q100 14 96 26Z" fill="#FBFAF6"/>
<path d="M-96 26 H96 V34 Q0 40 -96 34Z" fill="#E7E2D8"/>
<path d="M-12 -30 L40 -46" stroke="#D9D4CA" stroke-width="3"/><path d="M-4 -22 L46 -36 M4 -14 L52 -26" stroke="#D9D4CA" stroke-width="2.4"/>
<path d="M60 -44 Q84 -40 92 -12" stroke="#176B4D" stroke-width="5" fill="none"/>
</g>'''
    shoes = shoe(330, 1060, .78) + shoe(400, 1104, .82)
    bx, by, br = 600, 1030, 30
    balls = f'<ellipse cx="{bx+22}" cy="{by+br}" rx="{br*1.5:.0f}" ry="7" fill="#8A6A48" opacity=".4" filter="url(#bl6)"/>' + ball('b99', bx, by, br, rot=-30)
    # 伞筒 + 收着的伞
    umb = '''<rect x="120" y="760" width="90" height="170" rx="10" fill="#E8E1D4" stroke="#D2C8B7" stroke-width="2"/>
<path d="M150 760 L176 470 L196 760Z" fill="#1E3550"/><path d="M176 470 V440 Q176 420 160 420" stroke="#5B4632" stroke-width="6" fill="none" stroke-linecap="round"/>
<ellipse cx="165" cy="934" rx="70" ry="8" fill="#9C7A54" opacity=".3" filter="url(#bl6)"/>'''
    body = f'''
<defs>
<linearGradient id="wall99" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#EAE2D4"/><stop offset="1" stop-color="#F1EBE0"/></linearGradient>
<linearGradient id="floor99" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D2AC7E"/><stop offset="1" stop-color="#C39663"/></linearGradient>
<linearGradient id="out99" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DB6F2"/><stop offset=".45" stop-color="#E8F3FF"/><stop offset="1" stop-color="#FFFBEE"/></linearGradient>
<linearGradient id="door99" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#245C45"/><stop offset="1" stop-color="#1B4A37"/></linearGradient>
<linearGradient id="beam99" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6DE" stop-opacity=".95"/><stop offset="1" stop-color="#FFF2D2" stop-opacity=".55"/></linearGradient>
</defs>
<rect width="{W}" height="{fy}" fill="url(#wall99)"/>
<rect y="{fy}" width="{W}" height="{H-fy}" fill="url(#floor99)"/>
{planks}{joints}
<rect y="{fy-22}" width="{W}" height="22" fill="#FAF7F1"/><rect y="{fy-2}" width="{W}" height="3" fill="#D8CFC0"/>
{door}
{light}
{bag_sh}{bag}
<ellipse cx="530" cy="932" rx="70" ry="8" fill="#8A6A48" opacity=".35" filter="url(#bl6)"/>
{umb}
{shoes}
{balls}
{tag('SATURDAY · 7:15 AM', color='#3B4A42', rule='#176B4D', op=.75)}
{headline(META['lines'], y=290, size=62, colors=('#0B3B2A', '#176B4D'), ls=3, lh=84)}
{wordmark(1268, '#FFFFFF', sub=False)}
{grain(.08, light=True)}'''
    return page(body)
