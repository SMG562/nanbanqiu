from lib import *

META = dict(
    id=99, slug='doorway', title='出门前', lines=['出门前，', '又看了一眼天气。'],
    style=['平面', '极简', '光影'], tone='浅色', demo=False,
    concept='扁平光影插画：周六清早的玄关，墨绿的门开着一条缝，一道锐利的晨光斜铺过地板；球包靠墙，白球鞋和一颗球落在光里；伞筒里的伞今天用不上',
    use='周末约球的日常；平涂色块 + 锐利光影，大面积留白',
)

WALL, WALL_S = '#EEE4D3', '#E0D3BE'
FLOOR, FLOOR_S = '#C9935F', '#B98250'
LIGHT, LIGHT_F = '#FAF0DC', '#E9B97F'
GREEN, GREEN_D = '#1F4D3B', '#173D2F'


def svg():
    fy = 960
    # 门洞 + 向里开的门扇（右侧合页）
    ox0, ox1, oy0 = 660, 930, 300
    leaf = f'M{ox1} {oy0} L{ox1} {fy} L800 1004 L800 262Z'
    door = f'''<rect x="{ox0-22}" y="{oy0-22}" width="{ox1-ox0+44}" height="{fy-oy0+22}" fill="#F7F1E6"/>
<rect x="{ox0}" y="{oy0}" width="{ox1-ox0}" height="{fy-oy0}" fill="#8FC3EC"/>
<path d="M{ox0} 760 Q{ox0+50} 700 {ox0+120} 740 L{ox0+140} {fy} H{ox0}Z" fill="#7FAF72"/>
<path d="M{ox0} 860 Q{ox0+70} 820 {ox0+150} 860 V{fy} H{ox0}Z" fill="#6A9C60"/>
<rect x="{ox0}" y="{oy0}" width="{ox1-ox0}" height="120" fill="#B5D7F3"/>
<path d="{leaf}" fill="{GREEN}"/>
<path d="M{ox1-30} {oy0+40} L{ox1-30} {oy0+300} L824 {oy0+290} L824 {oy0+30}Z" fill="none" stroke="{GREEN_D}" stroke-width="4"/>
<path d="M{ox1-30} {oy0+350} L{ox1-30} {fy-50} L824 {fy-30} L824 {oy0+346}Z" fill="none" stroke="{GREEN_D}" stroke-width="4"/>
<path d="M800 262 L812 266 L812 1000 L800 1004Z" fill="#2A6450"/>
<rect x="826" y="616" width="30" height="8" rx="4" fill="#D2A75A"/><circle cx="830" cy="620" r="9" fill="#D2A75A"/>'''
    # 晨光：从门缝铺到地板，边缘锐利
    beam = f'<path d="M{ox0} {fy} L800 {fy} L640 {H} L250 {H}Z" fill="{LIGHT_F}"/>'
    beam_wall = f'<path d="M{ox0-22} {fy} L{ox0-22} {fy-6} L{ox0} {fy-6} L{ox0} {fy}Z" fill="{LIGHT}"/>'
    # 球包靠墙（影子向左，平涂）
    bag = f'''<g transform="translate(-64 0) skewX(4)"><g transform="rotate(-7 520 960)"><rect x="462" y="430" width="116" height="530" rx="58" fill="{WALL_S}"/></g></g>
<g transform="rotate(-7 520 960)"><rect x="462" y="430" width="116" height="530" rx="58" fill="#2C5E49"/>
<rect x="462" y="430" width="40" height="530" rx="20" fill="#3A6F58"/>
<path d="M520 456 V930" stroke="#C6EA3D" stroke-width="3"/><rect x="513" y="490" width="14" height="28" rx="4" fill="#C6EA3D"/>
<rect x="462" y="620" width="116" height="14" fill="{GREEN_D}"/></g>'''
    # 伞筒 + 伞
    umb = f'''<path d="M150 930 L118 960 L230 960 L250 930Z" fill="{FLOOR_S}"/>
<path d="M210 470 L236 470 L250 790 L196 790Z" fill="{WALL_S}" opacity=".0"/>
<path d="M164 800 L190 480 L216 800Z" fill="#20375A"/><path d="M190 480 V452 Q190 436 176 436" stroke="#6B4E33" stroke-width="7" fill="none" stroke-linecap="round"/>
<rect x="140" y="790" width="100" height="170" rx="6" fill="#D98E62"/><rect x="140" y="790" width="100" height="14" fill="#C47B51"/>'''
    # 光里：白球鞋一双 + 一颗球，影子是锐利的长条
    def shoe(x, y, s):
        return f'''<g transform="translate({x} {y}) scale({s})">
<path d="M-90 30 L60 30 L150 70 L-20 70Z" fill="{FLOOR}" opacity=".55"/>
<path d="M-92 28 Q-96 0 -68 -8 L-22 -20 Q8 -48 48 -46 Q80 -42 92 -8 Q98 14 94 28Z" fill="#FFFFFF"/>
<path d="M-92 28 H94 V36 H-92Z" fill="#E6DDCF"/>
<path d="M58 -40 Q84 -34 92 -8" stroke="{GREEN}" stroke-width="6" fill="none"/>
<path d="M-8 -26 L40 -40 M0 -16 L46 -28" stroke="#E0D8CB" stroke-width="3"/></g>'''
    bx, by, br = 640, 1112, 30
    ball_sh = f'<path d="M{bx} {by+br} L{bx+220} {by+br+70} L{bx+230} {by+br+48} L{bx+20} {by+br-4}Z" fill="{FLOOR}" opacity=".6"/>'
    body = f'''
<rect width="{W}" height="{fy}" fill="{WALL}"/>
<rect y="{fy}" width="{W}" height="{H-fy}" fill="{FLOOR}"/>
<rect y="{fy-18}" width="{W}" height="18" fill="#F7F1E6"/>
{door}{beam}{beam_wall}
{bag}{umb}
{shoe(380, 1080, .72)}{shoe(450, 1128, .76)}
{ball_sh}{ball('b99', bx, by, br, rot=-30)}
{tag('SATURDAY · 7:15 AM', color='#3B4A42', rule='#176B4D', op=.75)}
<text x="80" y="290" font-family="{SANS}" font-weight="700" font-size="54" letter-spacing="4" fill="{GREEN_D}">出门前，</text>
<text x="80" y="366" font-family="{SANS}" font-weight="700" font-size="54" letter-spacing="4" fill="#2E7A57">又看了一眼天气。</text>
{wordmark(1272, '#FFFFFF', sub=False, op=.95)}
{grain(.09, light=True)}'''
    return page(body)
