"""开学季 / 综艺贴纸风（204 起）：无黑描边的立体白字、糖果泡泡字、纸雕山林、田字格副标题。
和 variety.py 的区别：不用粗黑描边，靠柔和投影、渐变和层叠出质感。"""
import math
from lib import SANS

DEFS = (
    '<filter id="pc" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="9" flood-color="#0B3B2A" flood-opacity=".22"/></filter>'
    '<filter id="pcs" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0B3B2A" flood-opacity=".22"/></filter>'
    '<filter id="tsh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="-4" dy="14" stdDeviation="10" flood-color="#B4541C" flood-opacity=".30"/></filter>'
    '<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>'
    '<linearGradient id="face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEF1F4"/></linearGradient>'
)


def char3d(ch, x, y, size, rot=0, side=('#FFC48A', '#F08A3E'), depth=16, dx=-.55, dy=.85):
    """单个立体白字：往 (dx,dy) 方向叠出有明暗渐变的侧面，正面白色微渐变，不描黑边。"""
    o = []
    for k in range(depth, 0, -1):
        t = k / depth
        c = _mix(side[0], side[1], t)
        o.append(f'<text x="{x + dx * k:.1f}" y="{y + dy * k:.1f}" fill="{c}" stroke="{c}" stroke-width="3" stroke-linejoin="round">{ch}</text>')
    o.append(f'<text x="{x}" y="{y}" fill="url(#face)" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round">{ch}</text>')
    return (f'<g transform="rotate({rot} {x} {y - size * .4:.0f})" font-family="{SANS}" font-weight="900" font-size="{size}" text-anchor="middle" filter="url(#tsh)">'
            + ''.join(o) + '</g>')


def bubbly(ch, x, y, size, c1, c2, rot=0):
    """糖果泡泡字：白色外圈 + 粗圆角描边鼓起来 + 上亮下深渐变 + 左上高光。"""
    gid = f'bb{abs(hash((ch, x, y))) % 10**6}'
    sw = size * .05
    return (f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{_mix(c1, "#FFFFFF", .35)}"/><stop offset=".55" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></linearGradient></defs>'
            f'<g transform="rotate({rot} {x} {y - size * .4:.0f})" font-family="{SANS}" font-weight="900" font-size="{size}" text-anchor="middle" stroke-linejoin="round">'
            f'<text x="{x + 4}" y="{y + 9}" fill="{c2}" stroke="{c2}" stroke-width="{sw + 16:.0f}" opacity=".45" filter="url(#pcs)">{ch}</text>'
            f'<text x="{x}" y="{y}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="{sw + 16:.0f}">{ch}</text>'
            f'<text x="{x}" y="{y}" fill="url(#{gid})" stroke="url(#{gid})" stroke-width="{sw:.0f}">{ch}</text>'
            f'<ellipse cx="{x - size * .26:.0f}" cy="{y - size * .62:.0f}" rx="{size * .07:.0f}" ry="{size * .035:.0f}" fill="#FFFFFF" opacity=".9" transform="rotate(-30 {x - size * .26:.0f} {y - size * .62:.0f})"/>'
            '</g>')


def _mix(a, b, t):
    a = [int(a[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x + (y - x) * t):02X}' for x, y in zip(a, b))


def boxed(text, cx, y, box=66, gap=10, color='#3B4B5C'):
    """田字格副标题：一字一格，格里淡淡的十字虚线。逗号单独占半格。"""
    ws = [box if ch not in '，,·' else box * .45 for ch in text]
    total = sum(ws) + gap * (len(ws) - 1)
    x = cx - total / 2
    o = []
    for ch, w in zip(text, ws):
        if w == box:
            o.append(f'<rect x="{x:.1f}" y="{y}" width="{box}" height="{box}" fill="#FFFFFF" fill-opacity=".55" stroke="{color}" stroke-width="2.4"/>'
                     f'<path d="M{x + box / 2:.1f} {y + 4} V{y + box - 4} M{x + 4:.1f} {y + box / 2} H{x + box - 4:.1f}" stroke="{color}" stroke-width="1.2" stroke-dasharray="5 5" opacity=".35"/>')
        o.append(f'<text x="{x + w / 2:.1f}" y="{y + box * .74:.1f}" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="{box * .62:.0f}" fill="{color}">{ch}</text>')
        x += w + gap
    return ''.join(o)


def dotline(text, cx, y, color='#3B4B5C', size=26, half=290):
    """—o 文字 o— 小标语。"""
    return (f'<text x="{cx}" y="{y}" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="{size}" letter-spacing="4" fill="{color}">{text}</text>'
            f'<path d="M{cx - half - 90} {y - size * .35:.0f} H{cx - half}" stroke="{color}" stroke-width="2"/><circle cx="{cx - half + 8}" cy="{y - size * .35:.0f}" r="6" fill="none" stroke="{color}" stroke-width="2.4"/>'
            f'<path d="M{cx + half} {y - size * .35:.0f} H{cx + half + 90}" stroke="{color}" stroke-width="2"/><circle cx="{cx + half - 8}" cy="{y - size * .35:.0f}" r="6" fill="none" stroke="{color}" stroke-width="2.4"/>')


def vtext(text, x, y, color='#7A8A99', size=16, ls=14):
    """贴边竖排的小英文（字母一个个往下排）。"""
    return (f'<text transform="translate({x} {y}) rotate(90)" font-family="{SANS}" font-weight="500" font-size="{size}" letter-spacing="{ls}" fill="{color}">{text}</text>')


def mountain(pts, light, dark, filt='pc'):
    """纸雕山：一座山分亮面暗面两块（pts = 左脚, 峰, 右脚；峰顶圆一点）。"""
    (x0, y0), (px, py), (x1, y1) = pts
    r = 30
    body = f'M{x0} {y0} L{px - r * .9:.0f} {py + r * .7:.0f} Q{px} {py - r * .2:.0f} {px + r * .9:.0f} {py + r * .7:.0f} L{x1} {y1} Z'
    shade = f'M{px} {py + r * .25:.0f} Q{px + r * .5:.0f} {py + r * .3:.0f} {px + r * .9:.0f} {py + r * .7:.0f} L{x1} {y1} L{px + (x1 - px) * .25:.0f} {y1} Q{px + 10} {(py + y1) / 2:.0f} {px} {py + r * .25:.0f}Z'
    return f'<g filter="url(#{filt})"><path d="{body}" fill="{light}"/><path d="{shade}" fill="{dark}"/></g>'


def cloud(x, y, s=1, fill='#FFFFFF'):
    return (f'<path transform="translate({x} {y}) scale({s})" d="M-90 20 Q-92 -6 -62 -8 Q-56 -40 -22 -38 Q-6 -66 28 -50 Q58 -54 60 -20 Q92 -18 92 20 Z" fill="{fill}" filter="url(#pcs)"/>')


def tree(x, y, h, c1, c2, trunk='#8C6A4F'):
    """纸雕小树：细树干 + 两三团叠起来的圆冠。"""
    r = h * .32
    return (f'<g filter="url(#pcs)"><path d="M{x} {y} V{y - h * .55:.0f} M{x} {y - h * .35:.0f} L{x - r * .45:.0f} {y - h * .55:.0f} M{x} {y - h * .3:.0f} L{x + r * .4:.0f} {y - h * .48:.0f}" stroke="{trunk}" stroke-width="{max(3, h * .035):.0f}" stroke-linecap="round" fill="none"/>'
            f'<circle cx="{x - r * .45:.0f}" cy="{y - h * .62:.0f}" r="{r * .72:.0f}" fill="{c2}"/><circle cx="{x + r * .4:.0f}" cy="{y - h * .58:.0f}" r="{r * .66:.0f}" fill="{c2}"/>'
            f'<circle cx="{x}" cy="{y - h * .78:.0f}" r="{r:.0f}" fill="{c1}"/></g>')


def ball(cx, cy, r, c1='#DDF35A', c2='#B5D82A', seam='#FFFFFF'):
    gid = f'tb{cx}{cy}'
    return (f'<defs><radialGradient id="{gid}" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="{c1}"/><stop offset="1" stop-color="{c2}"/></radialGradient></defs>'
            f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#{gid})"/>'
            f'<path d="M{cx - r * .92:.0f} {cy - r * .38:.0f} Q{cx - r * .2:.0f} {cy:.0f} {cx - r * .5:.0f} {cy + r * .85:.0f} M{cx + r * .5:.0f} {cy - r * .85:.0f} Q{cx + r * .2:.0f} {cy:.0f} {cx + r * .92:.0f} {cy + r * .38:.0f}" stroke="{seam}" stroke-width="{r * .08:.1f}" fill="none" stroke-linecap="round" opacity=".9"/>')
