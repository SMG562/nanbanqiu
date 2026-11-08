"""侠气（218 起）：远景侠客小人（斗笠、披风、背拍如背剑）、毛笔感大字、剑气光带、墨点。"""
import math
from lib import SERIF, SANS
from poet import scholar
from lin import ink

DEFS = ('<filter id="brush" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7"/>'
        '<feDisplacementMap in="SourceGraphic" scale="7"/></filter>'
        '<linearGradient id="qi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset=".8" stop-color="#F4FFD0" stop-opacity=".8"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>')


def hero(x, y, s, robe='#2B3A3A', cape='#C23A2B', flip=1, arm='none', wind=1.2, hat='douli', back=True):
    """侠客：袍子小人 + 往后飘的长披风 + 背在身后斜插的球拍（像背剑）。"""
    X = lambda v: x + v * s * flip
    Y = lambda v: y - v * s
    o = []
    o.append(f'<path d="M{X(-6):.1f} {Y(80):.1f} Q{X(-40 - 30 * wind):.1f} {Y(70):.1f} {X(-70 - 50 * wind):.1f} {Y(30):.1f} Q{X(-50 - 40 * wind):.1f} {Y(44):.1f} {X(-30 - 30 * wind):.1f} {Y(28):.1f} Q{X(-16):.1f} {Y(40):.1f} {X(-4):.1f} {Y(60):.1f}Z" fill="{cape}"/>')
    if back:
        o.append(f'<path d="M{X(-16):.1f} {Y(30):.1f} L{X(10):.1f} {Y(96):.1f}" stroke="#1E1E1E" stroke-width="{2.6 * s:.1f}" stroke-linecap="round"/>'
                 f'<ellipse cx="{X(16):.1f}" cy="{Y(110):.1f}" rx="{7 * s:.1f}" ry="{11 * s:.1f}" transform="rotate({22 * flip} {X(16):.1f} {Y(110):.1f})" fill="none" stroke="#1E1E1E" stroke-width="{2 * s:.1f}"/>')
    o.append(scholar(x, y, s, robe=robe, sash=cape, flip=flip, arm=arm, wind=wind * .6, hat=hat))
    return ''.join(o)


def brush_v(text, x, y, size, color, gap=1.05, seed=0):
    """毛笔感竖排大字：粗宋 + 轻微抖动 + 每字微旋。"""
    o = []
    for i, ch in enumerate(c for c in text if c not in '，。'):
        r = ((seed + i * 37) % 9 - 4) * .8
        cy = y + i * size * gap
        o.append(f'<text x="{x}" y="{cy:.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{size}" fill="{color}" transform="rotate({r:.1f} {x} {cy - size * .35:.0f})">{ch}</text>')
    return f'<g filter="url(#brush)">{"".join(o)}</g>'


def qi(pts, w, color='url(#qi)', op=1):
    """剑气 / 球的光带：一笔两头收的亮带。"""
    return ink(pts, w, color, op, taper=(.9, .05))


def dots(r, cx, cy, n, spread, color, rmax=6):
    return ''.join(f'<circle cx="{cx + r.gauss(0, spread):.0f}" cy="{cy + r.gauss(0, spread * .6):.0f}" r="{r.uniform(1, rmax):.1f}" fill="{color}"/>' for _ in range(n))
