from lib import *
from mao2 import SERIF as _S  # noqa: F401  (保证 mao2 可导入)
from mao3 import figure3, pen, hand3, PEN, DOWN_L, DOWN_R

META = dict(
    id=80, slug='mao-rong', title='小毛和小绒，好朋友', lines=['小毛和小绒，', '好朋友。'],
    style=['插画', '角色', '拟人', '极简'], tone='浅色', demo=False,
    concept='角色设定：男生小毛（头顶一小撮毛，嘴硬心软）和女生小绒（一颗粉色的球，头顶奶油白小蝴蝶结、睫毛，话多守时）。主图两人击掌，笔线标出各自的记号；下面三个合照姿势：搭肩 / 一起招手 / 晚安',
    use='客服 / 运营形象的双人设定；做“约球搭子”“带朋友一起来”的物料',
)


def label(x, y, text, anchor='start', size=24, op=.75, color='#0B3B2A'):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{SANS}" font-size="{size}" letter-spacing="3" fill="{color}" opacity="{op}">{text}</text>'


def svg():
    random.seed(80)
    gy = 760
    rm, rr = 122, 114
    xm, xr = 368, 712
    cym, cyr = gy - 1.53 * rm, gy - 1.53 * rr
    tx, ty = 540, 452                      # 击掌的位置
    hm = ((tx - 6 - xm) / rm, (ty - cym) / rm)
    hr = ((tx + 6 - xr) / rr, (ty - cyr) / rr)
    mao_pose = dict(L=DOWN_L, R=((1.50, -.55), hm), legs='stand')
    rong_pose = dict(L=((-1.62, -.60), hr), R=DOWN_R, legs='stand')
    sparks = ''.join(pen(f'M{tx + math.cos(math.radians(a))*30:.1f} {ty + math.sin(math.radians(a))*30:.1f} L{tx + math.cos(math.radians(a))*52:.1f} {ty + math.sin(math.radians(a))*52:.1f}', 3)
                     for a in (-150, -120, -90, -60, -30))
    # 笔线标注
    note = (pen('M214 440 Q280 454 338 434', 2.6) + pen('M324 426 L339 434 L325 443', 2.6)
            + pen('M876 458 Q846 470 806 482', 2.6) + pen('M820 470 L805 482 L822 488', 2.6))
    # 三个合照
    r2, gy2 = 40, 1075
    duo = ''
    # 搭肩
    xc = 200
    xa, xb = xc - 56, xc + 56
    cy2 = gy2 - 1.53 * r2
    duo += figure3('a1', xa, 0, r2, dict(L=DOWN_L, R=None, legs='stand'), 'happy', gy=gy2)
    duo += figure3('a2', xb, 0, r2, dict(L=DOWN_L, R=DOWN_R, legs='stand'), 'happy', gy=gy2, char='rong')
    hx, hy = xb - .78 * r2, cy2 - .30 * r2
    duo += f'<g filter="url(#rough2)">{pen(f"M{xa + .93*r2:.1f} {cy2 + .12*r2:.1f} Q{xa + 1.5*r2:.1f} {cy2 - .55*r2:.1f} {hx:.1f} {hy:.1f}", 2.2)}{hand3(hx, hy, r2, 2)}</g>'
    # 一起招手
    xc = 540
    xa, xb = xc - 56, xc + 56
    wv = lambda s_: dict(L=((-1.62, 0), (-1.44, -.80)), R=DOWN_R, legs='stand', sparks='wave')
    duo += figure3('b1', xa, 0, r2, wv(0), 'happy', gy=gy2, mirror=True)
    duo += figure3('b2', xb, 0, r2, wv(0), 'happy', gy=gy2, char='rong', mirror=True)
    # 晚安
    xc = 880
    xa, xb = xc - 56, xc + 56
    duo += figure3('c1', xa, 0, r2, dict(L=DOWN_L, R=DOWN_R, legs='stand', tilt=7), 'sleep', gy=gy2)
    duo += figure3('c2', xb, 0, r2, dict(L=DOWN_L, R=DOWN_R, legs='stand', tilt=-7), 'sleep', gy=gy2, char='rong')
    zs = ''
    for i in range(3):
        s_ = 10 + i * 4
        ox, oy = xc - 8 + i * 22, 930 - i * 30
        zs += pen(f'M{ox} {oy} H{ox + s_} L{ox} {oy + s_} H{ox + s_}', 2.4)
    body = f'''
<defs><linearGradient id="bg80" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF4E3"/><stop offset="1" stop-color="#F1E3C4"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg80)"/>
{tag('XIAO MAO · XIAO RONG', color='#0B3B2A', rule='#0B3B2A', op=.8, weight=700)}
{headline(META['lines'], y=290, size=70, colors=('#0B3B2A', '#C2410C'), ls=4, lh=78)}
{figure3('m', xm, 0, rm, mao_pose, 'happy', gy=gy)}
{figure3('r', xr, 0, rr, rong_pose, 'happy', gy=gy, char='rong')}
<g filter="url(#rough2)">{sparks}{note}</g>
{label(96, 438, '一小撮毛', size=24)}
{label(884, 452, '小蝴蝶结', size=24)}
<text x="{xm}" y="{gy+60}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="38" fill="#0B3B2A">小毛</text>
<text x="{xr}" y="{gy+60}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="38" fill="#0B3B2A">小绒</text>
{label(xm, gy + 98, '嘴硬，心软。', 'middle', 22, .68)}{label(xr, gy + 98, '话多，守时。', 'middle', 22, .68)}
{duo}<g filter="url(#rough2)">{zs}</g>
{label(200, gy2 + 52, '搭肩', 'middle', 23, .72)}{label(540, gy2 + 52, '一起招手', 'middle', 23, .72)}{label(880, gy2 + 52, '晚安', 'middle', 23, .72)}
<path d="M0 1204 Q540 1172 1080 1204 V1350 H0 Z" fill="#0B3B2A"/>
{wordmark(1276, '#F3E6CC', sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
