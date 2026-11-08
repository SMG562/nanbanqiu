"""场景插画人物（163 起）：现代社论插画风——不画五官，柔和的服装色块，四肢带衣袖/裤管的粗细；
可以投影到墙上（晴天斜光）。坐标原点在两脚中间的地面，向上为负；scale≈2.2 时人高约 750px。"""
from lin import ink

SKIN = ['#F1CBAA', '#D9A57E', '#A86F4C', '#7A4A30']
HAIR = ['#2A1E18', '#5A3624', '#9A6A3A', '#1A1A1A']

POSES = {
    'walk':  dict(hip=(0, -170), neck=(4, -292), head=(6, -324), fk=(18, -86), ff=(34, 0), bk=(-12, -88), bf=(-30, -4),
                  fs=(10, -282), fe=(24, -222), fh=(28, -170), bs=(-4, -282), be=(-18, -222), bh=(-26, -174)),
    'hold':  dict(hip=(0, -170), neck=(2, -292), head=(4, -324), fk=(10, -86), ff=(16, 0), bk=(-8, -86), bf=(-18, 0),
                  fs=(12, -282), fe=(22, -224), fh=(44, -246), bs=(-6, -282), be=(-12, -222), bh=(-14, -170)),
    'five':  dict(hip=(0, -170), neck=(8, -292), head=(12, -324), fk=(20, -86), ff=(36, 0), bk=(-10, -86), bf=(-24, 0),
                  fs=(16, -282), fe=(40, -330), fh=(52, -378), bs=(-4, -282), be=(-14, -224), bh=(-20, -176)),
    'laugh': dict(hip=(0, -110), neck=(30, -224), head=(44, -252), fk=(56, -110), ff=(60, 0), bk=(50, -104), bf=(46, 0),
                  fs=(32, -214), fe=(52, -160), fh=(66, -130), bs=(22, -214), be=(30, -156), bh=(44, -124)),
    'drink': dict(hip=(0, -110), neck=(-2, -230), head=(-6, -262), fk=(56, -110), ff=(60, 0), bk=(50, -106), bf=(44, 0),
                  fs=(6, -220), fe=(30, -200), fh=(18, -256), bs=(-8, -220), be=(-14, -164), bh=(4, -128)),
    'teach': dict(hip=(0, -170), neck=(10, -290), head=(14, -322), fk=(14, -86), ff=(22, 0), bk=(-10, -86), bf=(-22, 0),
                  fs=(16, -280), fe=(44, -240), fh=(72, -220), bs=(0, -280), be=(20, -226), bh=(50, -212)),
    'grip':  dict(hip=(0, -170), neck=(-4, -292), head=(-6, -324), fk=(12, -86), ff=(20, 0), bk=(-10, -86), bf=(-20, 0),
                  fs=(4, -282), fe=(24, -232), fh=(52, -214), bs=(-10, -282), be=(-20, -226), bh=(-22, -176)),
    'ride':  dict(hip=(0, -150), neck=(18, -262), head=(26, -292), fk=(34, -150), ff=(22, -80), bk=(28, -146), bf=(40, -96),
                  fs=(20, -254), fe=(44, -214), fh=(66, -196), bs=(12, -254), be=(36, -212), bh=(60, -194)),
    'squat': dict(hip=(0, -74), neck=(44, -170), head=(62, -194), fk=(46, -100), ff=(26, 0), bk=(32, -92), bf=(6, 0),
                  fs=(44, -162), fe=(72, -118), fh=(90, -80), bs=(36, -162), be=(62, -114), bh=(80, -76)),
}


def tint(hexc, k=.82):
    """把颜色压暗一点（后侧的手脚用，做出前后层次）。"""
    h = hexc.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return '#%02X%02X%02X' % (int(r * k), int(g * k), int(b * k))


def person(x, y, s, pose='walk', flip=1, skin=0, hair=0, top='#A8D8C0', bottom='#3E5E9A', shoe='#FFFFFF', skirt=False,
           sleeve='long', hairstyle='bob', bag=None, racket_hand=None, mono=None):
    """画一个人（不画五官）。后侧手脚压暗一档做出前后；mono=颜色 时画成单色（墙上的影子）。"""
    P = POSES[pose]
    T = lambda p: (x + p[0] * s * flip, y + p[1] * s)
    c = lambda col: mono or col
    d = lambda col: mono or tint(col)
    sk, hr = c(SKIN[skin]), c(HAIR[hair])
    o = []
    hx, hy = T(P['head'])
    nx, ny = T(P['neck'])
    hx0, hy0 = T(P['hip'])
    if hairstyle in ('long', 'pony'):                                                  # 脑后的长发 / 马尾
        if hairstyle == 'long':
            o.append(f'<path d="M{hx - 24*s*flip:.0f} {hy - 10*s:.0f} C{hx - 30*s*flip:.0f} {hy + 30*s:.0f} {hx - 26*s*flip:.0f} {hy + 64*s:.0f} {hx - 6*s*flip:.0f} {hy + 74*s:.0f} L{hx + 6*s*flip:.0f} {hy + 20*s:.0f}Z" fill="{hr}"/>')
        else:
            o.append(ink([T((P['head'][0] - 16, P['head'][1] - 10)), T((P['head'][0] - 34, P['head'][1] + 6)), T((P['head'][0] - 30, P['head'][1] + 36))], 13 * s, hr, 1, (.1, .8)))
    if bag:                                                                            # 背上的球拍包（斜挎在后背）
        o.append(f'<g transform="rotate({-20*flip} {nx:.0f} {ny:.0f})"><rect x="{nx - 13*s:.0f}" y="{ny - 26*s:.0f}" width="{26*s:.0f}" height="{150*s:.0f}" rx="{12*s:.0f}" fill="{c(bag)}"/>'
                 f'<ellipse cx="{nx:.0f}" cy="{ny - 34*s:.0f}" rx="{22*s:.0f}" ry="{28*s:.0f}" fill="{c(bag)}"/></g>')
    def leg(k, f, back):
        pts = [T(P['hip']), T(P[k]), T(P[f])]
        col = (d if back else c)(SKIN[skin] if skirt else bottom)
        o.append(ink(pts, (18 if skirt else 30) * s, col, 1, (0, 0), press=lambda t: 1 - .25 * t))
        fx, fy = T(P[f])
        o.append(f'<path d="M{fx - 10*s*flip:.0f} {fy - 2*s:.0f} C{fx - 10*s*flip:.0f} {fy - 14*s:.0f} {fx + 10*s*flip:.0f} {fy - 16*s:.0f} {fx + 26*s*flip:.0f} {fy - 6*s:.0f} L{fx + 26*s*flip:.0f} {fy:.0f} L{fx - 10*s*flip:.0f} {fy:.0f}Z" fill="{(d if back else c)(shoe)}"/>')
    def arm(sh, el, ha, back):
        pts = [T(P[sh]), T(P[el]), T(P[ha])]
        col = (d if back else c)(top)
        if not back and not mono:                                              # 前臂压在衣服上：描一圈深一档的边，才分得出手臂
            o.append(ink(pts, 23 * s, tint(top, .86), 1, (0, 0), press=lambda t: 1 - .2 * t))
        if sleeve == 'long':
            o.append(ink(pts, 20 * s, col, 1, (0, 0), press=lambda t: 1 - .2 * t))
        else:
            o.append(ink(pts[:2], 22 * s, col, 1, (0, 0)))
            o.append(ink(pts[1:], 13 * s, (d if back else c)(SKIN[skin]), 1, (0, 0)))
        hxx, hyy = T(P[ha])
        o.append(f'<circle cx="{hxx:.0f}" cy="{hyy:.0f}" r="{8*s:.0f}" fill="{(d if back else c)(SKIN[skin])}"/>')
    leg('bk', 'bf', True)
    arm('bs', 'be', 'bh', True)
    leg('fk', 'ff', False)
    if skirt:
        o.append(f'<path d="M{hx0 - 26*s:.0f} {hy0 - 14*s:.0f} L{hx0 + 26*s:.0f} {hy0 - 14*s:.0f} L{hx0 + 40*s:.0f} {hy0 + 46*s:.0f} L{hx0 - 40*s:.0f} {hy0 + 46*s:.0f}Z" fill="{c(bottom)}"/>')
    # 躯干：肩宽、收腰、下摆
    o.append(f'<path d="M{nx - 30*s:.0f} {ny + 8*s:.0f} C{nx - 34*s:.0f} {ny + 50*s:.0f} {hx0 - 30*s:.0f} {hy0 - 50*s:.0f} {hx0 - 28*s:.0f} {hy0 + 2*s:.0f} '
             f'L{hx0 + 28*s:.0f} {hy0 + 2*s:.0f} C{hx0 + 30*s:.0f} {hy0 - 50*s:.0f} {nx + 34*s:.0f} {ny + 50*s:.0f} {nx + 30*s:.0f} {ny + 8*s:.0f} '
             f'C{nx + 16*s:.0f} {ny - 4*s:.0f} {nx - 16*s:.0f} {ny - 4*s:.0f} {nx - 30*s:.0f} {ny + 8*s:.0f}Z" fill="{c(top)}"/>')
    o.append(f'<rect x="{nx - 7*s:.0f}" y="{ny - 18*s:.0f}" width="{14*s:.0f}" height="{22*s:.0f}" fill="{sk}"/>')
    arm('fs', 'fe', 'fh', False)
    if racket_hand:
        rx, ry = T(P[racket_hand])
        o.append(f'<line x1="{rx:.0f}" y1="{ry:.0f}" x2="{rx + 34*s*flip:.0f}" y2="{ry - 44*s:.0f}" stroke="{c("#2E3438")}" stroke-width="{5*s:.0f}" stroke-linecap="round"/>')
        o.append(f'<ellipse cx="{rx + 56*s*flip:.0f}" cy="{ry - 74*s:.0f}" rx="{21*s:.0f}" ry="{28*s:.0f}" transform="rotate({38*flip} {rx + 56*s*flip:.0f} {ry - 74*s:.0f})" fill="none" stroke="{c("#2E3438")}" stroke-width="{5*s:.0f}"/>')
    # 头：脸是肤色，头发只盖头顶和脑后
    o.append(f'<ellipse cx="{hx:.0f}" cy="{hy:.0f}" rx="{20*s:.0f}" ry="{23*s:.0f}" fill="{sk}"/>')
    if hairstyle == 'cap':
        o.append(f'<path d="M{hx - 22*s:.0f} {hy - 4*s:.0f} C{hx - 22*s:.0f} {hy - 32*s:.0f} {hx + 22*s:.0f} {hy - 32*s:.0f} {hx + 22*s:.0f} {hy - 4*s:.0f}Z" fill="{c("#2E3438")}"/>'
                 f'<path d="M{hx + 10*s*flip:.0f} {hy - 6*s:.0f} L{hx + 40*s*flip:.0f} {hy - 2*s:.0f} L{hx + 10*s*flip:.0f} {hy + 1*s:.0f}Z" fill="{c("#2E3438")}"/>')
    else:
        o.append(f'<path d="M{hx - 22*s*flip:.0f} {hy + 8*s:.0f} C{hx - 26*s*flip:.0f} {hy - 26*s:.0f} {hx + 8*s*flip:.0f} {hy - 36*s:.0f} {hx + 22*s*flip:.0f} {hy - 12*s:.0f} '
                 f'C{hx + 8*s*flip:.0f} {hy - 18*s:.0f} {hx - 6*s*flip:.0f} {hy - 12*s:.0f} {hx - 8*s*flip:.0f} {hy + 4*s:.0f}Z" fill="{hr}"/>')
    return ''.join(o)


def wall_shadow(svg_fn, dx=70, dy=-10, op=.16, color='#6A6070', clip=None):
    """晴天斜光：人在墙上的影子（偏右、略高、柔边）。svg_fn(mono_color) 返回人。"""
    cp = f' clip-path="url(#{clip})"' if clip else ''
    return f'<g{cp}><g transform="translate({dx} {dy})" opacity="{op}" filter="url(#bl6)">{svg_fn(color)}</g></g>'


def mark(x, y, color='#2A2A2A'):
    """右下角的小号品牌落款（场景图不压深色条）。"""
    from lib import SANS
    return (f'<circle cx="{x - 146}" cy="{y - 10}" r="9" fill="#C6EA3D"/><circle cx="{x - 130}" cy="{y}" r="6" fill="#C6EA3D" stroke="#FFFFFF" stroke-width="2"/>'
            f'<text x="{x}" y="{y + 6}" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="28" letter-spacing="8" fill="{color}">南伴球</text>')


def front(x, y, s, skin=0, hair=0, top='#FFFFFF', bottom='#2E3A34', shoe='#F4F2EC', hairstyle='short', skirt=False, hat=None,
          racket=None, bag=None, kid=False):
    """正面站立、面向镜头的人（合影站姿，不画五官）。原点在两脚中间地面；s=1 时成人高约 340。"""
    k = .72 if kid else 1.0
    H = lambda v: y - v * s * k
    X = lambda v: x + v * s
    sk, hr = SKIN[skin], HAIR[hair]
    o = []
    # 腿
    if skirt:
        o += [f'<rect x="{X(-15):.0f}" y="{H(120):.0f}" width="{10*s:.0f}" height="{120*s*k:.0f}" fill="{sk}"/>', f'<rect x="{X(5):.0f}" y="{H(120):.0f}" width="{10*s:.0f}" height="{120*s*k:.0f}" fill="{sk}"/>']
    else:
        o += [f'<path d="M{X(-24):.0f} {H(176):.0f} L{X(-2):.0f} {H(176):.0f} L{X(-4):.0f} {H(4):.0f} L{X(-20):.0f} {H(4):.0f}Z" fill="{bottom}"/>',
              f'<path d="M{X(2):.0f} {H(176):.0f} L{X(24):.0f} {H(176):.0f} L{X(20):.0f} {H(4):.0f} L{X(4):.0f} {H(4):.0f}Z" fill="{tint(bottom, .86)}"/>']
    o += [f'<ellipse cx="{X(-13):.0f}" cy="{H(3):.0f}" rx="{11*s:.0f}" ry="{5*s:.0f}" fill="{shoe}"/>', f'<ellipse cx="{X(13):.0f}" cy="{H(3):.0f}" rx="{11*s:.0f}" ry="{5*s:.0f}" fill="{shoe}"/>']
    if skirt:
        o.append(f'<path d="M{X(-28):.0f} {H(186):.0f} L{X(28):.0f} {H(186):.0f} L{X(40):.0f} {H(112):.0f} L{X(-40):.0f} {H(112):.0f}Z" fill="{bottom}"/>')
    # 上身 + 两臂（垂在身侧）
    o.append(f'<path d="M{X(-30):.0f} {H(292):.0f} C{X(-36):.0f} {H(250):.0f} {X(-30):.0f} {H(210):.0f} {X(-28):.0f} {H(176):.0f} L{X(28):.0f} {H(176):.0f} C{X(30):.0f} {H(210):.0f} {X(36):.0f} {H(250):.0f} {X(30):.0f} {H(292):.0f} C{X(14):.0f} {H(300):.0f} {X(-14):.0f} {H(300):.0f} {X(-30):.0f} {H(292):.0f}Z" fill="{top}"/>')
    for sx in (-1, 1):
        o.append(f'<path d="M{X(30*sx):.0f} {H(290):.0f} L{X(42*sx):.0f} {H(250):.0f} L{X(40*sx):.0f} {H(250):.0f}" stroke="{tint(top, .9)}" stroke-width="{18*s:.0f}" stroke-linecap="round" fill="none"/>')
        o.append(f'<line x1="{X(41*sx):.0f}" y1="{H(252):.0f}" x2="{X(38*sx):.0f}" y2="{H(190):.0f}" stroke="{sk}" stroke-width="{11*s:.0f}" stroke-linecap="round"/>')
    if bag:
        o.append(f'<line x1="{X(-24):.0f}" y1="{H(292):.0f}" x2="{X(26):.0f}" y2="{H(200):.0f}" stroke="{tint(bag, .8)}" stroke-width="{4*s:.0f}"/><rect x="{X(20):.0f}" y="{H(214):.0f}" width="{22*s:.0f}" height="{26*s:.0f}" rx="{4*s:.0f}" fill="{bag}"/>')
    if racket:
        o.append(f'<line x1="{X(38):.0f}" y1="{H(188):.0f}" x2="{X(46):.0f}" y2="{H(120):.0f}" stroke="#2E3438" stroke-width="{5*s:.0f}" stroke-linecap="round"/>'
                 f'<ellipse cx="{X(50):.0f}" cy="{H(88):.0f}" rx="{20*s:.0f}" ry="{30*s:.0f}" fill="none" stroke="#2E3438" stroke-width="{5*s:.0f}"/>')
    # 头
    o.append(f'<rect x="{X(-6):.0f}" y="{H(308):.0f}" width="{12*s:.0f}" height="{16*s:.0f}" fill="{sk}"/>')
    o.append(f'<ellipse cx="{X(0):.0f}" cy="{H(328):.0f}" rx="{19*s:.0f}" ry="{23*s:.0f}" fill="{sk}"/>')
    if hairstyle == 'long':
        o.append(f'<path d="M{X(-21):.0f} {H(320):.0f} C{X(-24):.0f} {H(356):.0f} {X(24):.0f} {H(356):.0f} {X(21):.0f} {H(320):.0f} L{X(22):.0f} {H(284):.0f} L{X(14):.0f} {H(290):.0f} L{X(13):.0f} {H(330):.0f} C{X(0):.0f} {H(340):.0f} {X(-13):.0f} {H(330):.0f} {X(-13):.0f} {H(330):.0f} L{X(-14):.0f} {H(290):.0f} L{X(-22):.0f} {H(284):.0f}Z" fill="{hr}"/>')
    else:                                                                              # 短发：只盖头顶（按头的实际大小算，小孩也不会盖住脸）
        hc, ry = H(328), 23 * s
        o.append(f'<path d="M{X(-20):.0f} {hc - ry*.25:.0f} C{X(-22):.0f} {hc - ry*1.35:.0f} {X(22):.0f} {hc - ry*1.35:.0f} {X(20):.0f} {hc - ry*.25:.0f} C{X(10):.0f} {hc - ry*.6:.0f} {X(-10):.0f} {hc - ry*.6:.0f} {X(-20):.0f} {hc - ry*.25:.0f}Z" fill="{hr}"/>')
    if hat:
        o.append(f'<ellipse cx="{X(0):.0f}" cy="{H(340):.0f}" rx="{30*s:.0f}" ry="{7*s:.0f}" fill="{hat}"/><path d="M{X(-18):.0f} {H(340):.0f} C{X(-18):.0f} {H(366):.0f} {X(18):.0f} {H(366):.0f} {X(18):.0f} {H(340):.0f}Z" fill="{hat}"/>')
    return ''.join(o)
