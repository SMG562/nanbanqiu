from lib import *
from mao3 import pen, SH_L, SH_R, DOWN_L, DOWN_R, PEN, PAPER
from mao4 import figure4, K_ARM, GROUND

META = dict(
    id=82, slug='mao-rong-v4', title='小毛和小绒，好朋友（毛茸茸版）', lines=['小毛和小绒，', '好朋友。'],
    style=['插画', '角色', '拟人', '极简'], tone='浅色', demo=False,
    concept='v4 设定：毛茸茸的黄绿小毛（头顶一小撮毛）和棉花糖粉的小绒（小蝴蝶结）；婴儿比例的大眼睛、短短的黑线手脚；主图击掌，下面三个合照：搭肩 / 一起招手 / 晚安',
    use='客服 / 运营形象的双人设定；做“约球搭子”“带朋友一起来”的物料',
)


def label(x, y, text, anchor='start', size=24, op=.75, color='#0B3B2A'):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{SANS}" font-size="{size}" letter-spacing="3" fill="{color}" opacity="{op}">{text}</text>'


def raw(sh, target):   # figure4 会把手臂缩到 K_ARM 倍，这里反算，让手正好落在 target
    return (sh[0] + (target[0] - sh[0]) / K_ARM, sh[1] + (target[1] - sh[1]) / K_ARM)


def svg():
    random.seed(82)
    gy = 775
    rm, rr = 132, 124
    xm, xr = 362, 718
    cym, cyr = gy - GROUND * rm, gy - GROUND * rr
    tx, ty = 540, 462
    hm = ((tx - 8 - xm) / rm, (ty - cym) / rm)
    hr = ((tx + 8 - xr) / rr, (ty - cyr) / rr)
    mao_pose = dict(L=DOWN_L, R=((1.5, -.2), raw(SH_R, hm)), legs='stand')
    rong_pose = dict(L=((-1.5, -.2), raw(SH_L, hr)), R=DOWN_R, legs='stand')
    sparks = ''.join(pen(f'M{tx + math.cos(math.radians(a))*30:.1f} {ty + math.sin(math.radians(a))*30:.1f} L{tx + math.cos(math.radians(a))*52:.1f} {ty + math.sin(math.radians(a))*52:.1f}', 3)
                     for a in (-150, -120, -90, -60, -30))
    note = (pen('M214 440 Q280 454 332 440', 2.6) + pen('M318 432 L333 440 L319 449', 2.6)
            + pen('M876 470 Q850 478 812 490', 2.6) + pen('M826 478 L811 490 L828 496', 2.6))
    r2, gy2 = 44, 1080
    duo = ''
    xc = 200
    xa, xb = xc - 62, xc + 62
    cy2 = gy2 - GROUND * r2
    duo += figure4('a1', xa, 0, r2, dict(L=DOWN_L, R=None, legs='stand'), 'happy', gy=gy2)
    duo += figure4('a2', xb, 0, r2, dict(L=DOWN_L, R=DOWN_R, legs='stand'), 'smile', char='rong', gy=gy2)
    hx, hy = xb - .80 * r2, cy2 - .22 * r2
    duo += (f'<g filter="url(#rough2)">{pen(f"M{xa + .93*r2:.1f} {cy2 + .12*r2:.1f} Q{xa + 1.5*r2:.1f} {cy2 - .5*r2:.1f} {hx:.1f} {hy:.1f}", 2.2)}'
            f'<circle cx="{hx:.1f}" cy="{hy:.1f}" r="{.07*r2:.1f}" fill="{PAPER}" stroke="{PEN}" stroke-width="2"/></g>')
    xc = 540
    xa, xb = xc - 62, xc + 62
    wv = dict(L=((-1.62, 0), (-1.44, -.80)), R=DOWN_R, legs='stand', sparks='wave')
    duo += figure4('b1', xa, 0, r2, wv, 'happy', gy=gy2, mirror=True)
    duo += figure4('b2', xb, 0, r2, wv, 'happy', char='rong', gy=gy2, mirror=True)
    xc = 880
    xa, xb = xc - 62, xc + 62
    duo += figure4('c1', xa, 0, r2, dict(L=DOWN_L, R=DOWN_R, legs='stand', tilt=7), 'sleep', gy=gy2)
    duo += figure4('c2', xb, 0, r2, dict(L=DOWN_L, R=DOWN_R, legs='stand', tilt=-7), 'sleep', char='rong', gy=gy2)
    zs = ''
    for i in range(3):
        s_ = 10 + i * 4
        ox, oy = xc - 8 + i * 22, 930 - i * 30
        zs += pen(f'M{ox} {oy} H{ox + s_} L{ox} {oy + s_} H{ox + s_}', 2.4)
    body = f'''
<defs><linearGradient id="bg82" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF4E3"/><stop offset="1" stop-color="#F1E3C4"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg82)"/>
{tag('XIAO MAO · XIAO RONG', color='#0B3B2A', rule='#0B3B2A', op=.8, weight=700)}
{headline(META['lines'], y=290, size=70, colors=('#0B3B2A', '#C2410C'), ls=4, lh=78)}
{figure4('m', xm, 0, rm, mao_pose, 'happy', gy=gy)}
{figure4('r', xr, 0, rr, rong_pose, 'smile', char='rong', gy=gy)}
<g filter="url(#rough2)">{sparks}{note}</g>
{label(96, 438, '一小撮毛', size=24)}
{label(884, 462, '小蝴蝶结', size=24)}
<text x="{xm}" y="{gy+64}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="38" fill="#0B3B2A">小毛</text>
<text x="{xr}" y="{gy+64}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="38" fill="#0B3B2A">小绒</text>
{label(xm, gy + 100, '嘴硬，心软。', 'middle', 22, .68)}{label(xr, gy + 100, '话多，守时。', 'middle', 22, .68)}
{duo}<g filter="url(#rough2)">{zs}</g>
{label(200, gy2 + 50, '搭肩', 'middle', 23, .72)}{label(540, gy2 + 50, '一起招手', 'middle', 23, .72)}{label(880, gy2 + 50, '晚安', 'middle', 23, .72)}
<path d="M0 1204 Q540 1172 1080 1204 V1350 H0 Z" fill="#0B3B2A"/>
{wordmark(1276, '#F3E6CC', sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
