"""诗人打球（207 起）：古色平涂 + 现代版式。远景小人穿袍子、举球拍；竖排诗句、朱印、细线和小英文。"""
from lib import SERIF, SANS

# 古色
SHIQING = '#1E4E62'   # 石青
SHILV = '#2F8A6E'     # 石绿
YUEBAI = '#F4EDCF'    # 月白偏缃
ZHU = '#C23A2B'       # 朱砂
XIANG = '#F2DCA8'     # 缃色
DAI = '#2B3A3A'       # 黛


def scholar(x, y, s, robe='#EDE6D3', sash='#C23A2B', flip=1, arm='up', woman=False, wind=1, hat=None):
    """袍子小人（地面点 x,y，高约 100*s）：宽袍随风往后飘，一只宽袖举拍，另一只垂着。"""
    X = lambda v: x + v * s * flip
    Y = lambda v: y - v * s
    o = []
    # 袍身：肩 → 下摆，往身后飘
    o.append(f'<path d="M{X(-9):.1f} {Y(78):.1f} Q{X(-16):.1f} {Y(40):.1f} {X(-24 - 10 * wind):.1f} {Y(2):.1f} Q{X(-30 - 14 * wind):.1f} {Y(10):.1f} {X(-38 - 16 * wind):.1f} {Y(4):.1f} '
             f'L{X(-40 - 18 * wind):.1f} {Y(0):.1f} L{X(16):.1f} {Y(0):.1f} Q{X(13):.1f} {Y(40):.1f} {X(9):.1f} {Y(78):.1f} Z" fill="{robe}"/>')
    o.append(f'<path d="M{X(-12):.1f} {Y(50):.1f} Q{X(0):.1f} {Y(47):.1f} {X(12):.1f} {Y(50):.1f}" stroke="{sash}" stroke-width="{3 * s:.1f}" fill="none"/>')
    o.append(f'<path d="M{X(-4):.1f} {Y(48):.1f} q{-6 * s * flip:.1f} {14 * s:.1f} {-14 * s * flip * wind:.1f} {22 * s:.1f}" stroke="{sash}" stroke-width="{2 * s:.1f}" fill="none"/>')
    # 垂着的宽袖
    o.append(f'<path d="M{X(-8):.1f} {Y(76):.1f} Q{X(-20):.1f} {Y(56):.1f} {X(-26 - 6 * wind):.1f} {Y(36):.1f} L{X(-12):.1f} {Y(40):.1f} Q{X(-8):.1f} {Y(56):.1f} {X(-2):.1f} {Y(70):.1f}Z" fill="{robe}" opacity=".92"/>')
    # 头、发
    o.append(f'<circle cx="{X(0):.1f}" cy="{Y(88):.1f}" r="{8 * s:.1f}" fill="#F0D7B8"/>')
    if woman:
        o.append(f'<path d="M{X(-8):.1f} {Y(88):.1f} Q{X(-8):.1f} {Y(99):.1f} {X(1):.1f} {Y(98):.1f} Q{X(8):.1f} {Y(97):.1f} {X(8):.1f} {Y(91):.1f} Q{X(0):.1f} {Y(93):.1f} {X(-8):.1f} {Y(88):.1f}Z" fill="#1E1E1E"/>'
                 f'<circle cx="{X(-8):.1f}" cy="{Y(96):.1f}" r="{5 * s:.1f}" fill="#1E1E1E"/><path d="M{X(-14):.1f} {Y(100):.1f} L{X(-2):.1f} {Y(93):.1f}" stroke="#E2B93B" stroke-width="{1.4 * s:.1f}"/>'
                 f'<path d="M{X(-10):.1f} {Y(92):.1f} q{-10 * s * flip:.1f} {-2 * s:.1f} {-16 * s * flip * wind:.1f} {6 * s:.1f}" stroke="{sash}" stroke-width="{1.6 * s:.1f}" fill="none"/>')
    else:
        o.append(f'<path d="M{X(-8):.1f} {Y(89):.1f} Q{X(-8):.1f} {Y(98):.1f} {X(0):.1f} {Y(98):.1f} Q{X(8):.1f} {Y(98):.1f} {X(8):.1f} {Y(90):.1f}Z" fill="#1E1E1E"/>'
                 f'<rect x="{X(-3) - (3 * s if flip < 0 else 0):.1f}" y="{Y(105):.1f}" width="{6 * s:.1f}" height="{8 * s:.1f}" rx="{2 * s:.1f}" fill="#1E1E1E"/>'
                 f'<path d="M{X(-3):.1f} {Y(102):.1f} q{-10 * s * flip:.1f} {2 * s:.1f} {-18 * s * flip * wind:.1f} {10 * s:.1f}" stroke="#1E1E1E" stroke-width="{1.4 * s:.1f}" fill="none"/>')
    if hat == 'douli':   # 斗笠
        o.append(f'<path d="M{X(-24):.1f} {Y(92):.1f} L{X(0):.1f} {Y(110):.1f} L{X(24):.1f} {Y(92):.1f} Q{X(0):.1f} {Y(88):.1f} {X(-24):.1f} {Y(92):.1f}Z" fill="#B88A4A"/>'
                 f'<path d="M{X(-12):.1f} {Y(98):.1f} L{X(0):.1f} {Y(108):.1f} M{X(8):.1f} {Y(100):.1f} L{X(0):.1f} {Y(108):.1f}" stroke="#8C6430" stroke-width="{1 * s:.1f}"/>')
    if hat in ('douli', 'suoyi'):   # 蓑衣的草须
        o.append(''.join(f'<path d="M{X(-14 + i * 4.5):.1f} {Y(76 - (i % 2) * 6):.1f} l{-1.5 * s * flip:.1f} {22 * s:.1f}" stroke="#8C6430" stroke-width="{1.2 * s:.1f}"/>' for i in range(7)))
    # 举拍的手
    if arm == 'up':
        hx, hy = X(22), Y(118)
        o.append(f'<path d="M{X(6):.1f} {Y(76):.1f} Q{X(16):.1f} {Y(96):.1f} {X(20):.1f} {Y(116):.1f} L{X(26):.1f} {Y(114):.1f} Q{X(28):.1f} {Y(92):.1f} {X(14):.1f} {Y(70):.1f}Z" fill="{robe}"/>')
        o.append(f'<path d="M{hx:.1f} {hy:.1f} L{X(30):.1f} {Y(146):.1f}" stroke="#3A2A1E" stroke-width="{2.4 * s:.1f}" stroke-linecap="round"/>'
                 f'<ellipse cx="{X(34):.1f}" cy="{Y(160):.1f}" rx="{7 * s:.1f}" ry="{11 * s:.1f}" transform="rotate({16 * flip} {X(34):.1f} {Y(160):.1f})" fill="none" stroke="#3A2A1E" stroke-width="{1.8 * s:.1f}"/>')
    elif arm == 'none':  # 空手，袖子垂着
        o.append(f'<path d="M{X(6):.1f} {Y(76):.1f} Q{X(16):.1f} {Y(60):.1f} {X(20):.1f} {Y(42):.1f} L{X(12):.1f} {Y(40):.1f} Q{X(8):.1f} {Y(56):.1f} {X(0):.1f} {Y(70):.1f}Z" fill="{robe}"/>')
    else:  # 拍子垂在身侧
        o.append(f'<path d="M{X(6):.1f} {Y(76):.1f} Q{X(16):.1f} {Y(60):.1f} {X(20):.1f} {Y(42):.1f} L{X(12):.1f} {Y(40):.1f} Q{X(8):.1f} {Y(56):.1f} {X(0):.1f} {Y(70):.1f}Z" fill="{robe}"/>'
                 f'<path d="M{X(18):.1f} {Y(42):.1f} L{X(24):.1f} {Y(22):.1f}" stroke="#3A2A1E" stroke-width="{2.4 * s:.1f}" stroke-linecap="round"/>'
                 f'<ellipse cx="{X(26):.1f}" cy="{Y(12):.1f}" rx="{6 * s:.1f}" ry="{10 * s:.1f}" fill="none" stroke="#3A2A1E" stroke-width="{1.8 * s:.1f}"/>')
    return ''.join(o)


def vtext(text, x, y, size, color, gap=1.16, weight=600, font=None):
    """竖排一列，逐字往下（跳过标点）。"""
    return ''.join(f'<text x="{x}" y="{y + i * size * gap:.0f}" text-anchor="middle" font-family="{font or SERIF}" font-weight="{weight}" font-size="{size}" fill="{color}">{ch}</text>'
                   for i, ch in enumerate(c for c in text if c not in '，。、'))


def seal(x, y, s=46, text='南伴', fill=ZHU, color='#F6EBD3'):
    """朱文方印（两字竖排）。"""
    return (f'<rect x="{x}" y="{y}" width="{s}" height="{s * 1.7:.0f}" rx="4" fill="{fill}"/>'
            + ''.join(f'<text x="{x + s / 2}" y="{y + s * (.68 + i * .8):.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{s * .62:.0f}" fill="{color}">{ch}</text>' for i, ch in enumerate(text)))


def latin(text, x, y, color, size=15, anchor='start', ls=6):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{SANS}" font-weight="500" font-size="{size}" letter-spacing="{ls}" fill="{color}">{text}</text>'


def egret(x, y, s, rot=0, c='#FFFFFF'):
    """平面小白鹭（侧飞剪影，几何化）。"""
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})" fill="{c}">'
            '<path d="M-30 4 Q0 -4 26 0 Q34 -2 40 -8 L44 -6 Q38 2 28 6 Q0 12 -30 4Z"/>'
            '<path d="M-6 0 Q-14 -30 -34 -44 Q-8 -36 8 -2Z"/><path d="M2 4 Q8 26 26 40 Q4 34 -6 6Z" opacity=".85"/>'
            '<path d="M44 -6 L56 -5" stroke="#E2B93B" stroke-width="2"/></g>')


def sit(x, y, s, robe='#F3EEE0', sash='#2F8A6E', flip=1):
    """盘腿坐着的小人（坐在 x,y 这个点上，高约 70*s），侧脸望远。"""
    X = lambda v: x + v * s * flip
    Y = lambda v: y - v * s
    return (f'<path d="M{X(-30):.1f} {Y(0):.1f} Q{X(-30):.1f} {Y(14):.1f} {X(-12):.1f} {Y(16):.1f} L{X(-9):.1f} {Y(52):.1f} L{X(9):.1f} {Y(52):.1f} L{X(14):.1f} {Y(16):.1f} Q{X(34):.1f} {Y(14):.1f} {X(34):.1f} {Y(0):.1f}Z" fill="{robe}"/>'
            f'<path d="M{X(-10):.1f} {Y(30):.1f} H{X(11):.1f}" stroke="{sash}" stroke-width="{3 * s:.1f}"/>'
            f'<path d="M{X(8):.1f} {Y(48):.1f} Q{X(22):.1f} {Y(30):.1f} {X(18):.1f} {Y(14):.1f} L{X(8):.1f} {Y(16):.1f}Z" fill="{robe}" opacity=".9"/>'
            f'<circle cx="{X(0):.1f}" cy="{Y(61):.1f}" r="{8 * s:.1f}" fill="#F0D7B8"/>'
            f'<path d="M{X(-8):.1f} {Y(62):.1f} Q{X(-8):.1f} {Y(71):.1f} {X(0):.1f} {Y(71):.1f} Q{X(6):.1f} {Y(71):.1f} {X(7):.1f} {Y(65):.1f} Q{X(0):.1f} {Y(66):.1f} {X(-8):.1f} {Y(62):.1f}Z" fill="#1E1E1E"/>'
            f'<rect x="{X(-3) - (6 * s if flip < 0 else 0):.1f}" y="{Y(78):.1f}" width="{6 * s:.1f}" height="{8 * s:.1f}" rx="{2 * s:.1f}" fill="#1E1E1E"/>')


def racket_lean(x, y, s, rot=-20):
    """斜靠着的球拍（拍柄着地点 x,y）。"""
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})"><path d="M0 0 V-30" stroke="#3A2A1E" stroke-width="3" stroke-linecap="round"/>'
            '<ellipse cx="0" cy="-44" rx="10" ry="15" fill="none" stroke="#3A2A1E" stroke-width="2.4"/></g>')


def footer(p, line, cap, en, c1='#FFFFFF', c2='#BFE6CF', c3='#9FD3B8', mark_c='#FFFFFF', x=64, y=1250):
    """左下：现代的一句 + 系列编号 + 小英文；右下：南伴球落款。"""
    p.append(f'<text x="{x}" y="{y}" font-family="{SERIF}" font-weight="600" font-size="38" letter-spacing="6" fill="{c1}">{line}</text>')
    p.append(latin(cap, x + 2, y + 38, c2, 18, ls=3))
    p.append(latin(en, x + 2, y + 66, c3, 12, ls=5))
    p.append(f'<g transform="translate(1030 {y + 38})"><circle cx="-158" cy="-8" r="9" fill="#C6EA3D"/><circle cx="-142" cy="2" r="6" fill="#C6EA3D" stroke="#0B3B2A" stroke-width="2"/>'
             f'<text x="0" y="6" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="28" letter-spacing="8" fill="{mark_c}">南伴球</text></g>')
