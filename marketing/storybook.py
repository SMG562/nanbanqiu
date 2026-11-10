"""绘本风（85 起）：水彩晕染 wash、彩铅排线 hatch、绘本小人 person。
person(x, gy, s, ...)：脚踩在 (x, gy)，s=1 时身高约 300；圆头、豆豆眼、腮红、细胳膊细腿，
衣服平涂，整体套 rough2 轻微抖动。手的位置用相对坐标（以脚底为原点，向上为负）。
"""
from lib import *

INK, SKIN = '#2A211C', '#F7DCC4'


def wash(fid, seed, freq, color, k, b):
    """水彩晕染：低频噪声当成一层不均匀的颜料。"""
    return (f'<filter id="{fid}" x="0" y="0" width="{W}" height="{H}" filterUnits="userSpaceOnUse">'
            f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="4" seed="{seed}"/>'
            f'<feColorMatrix values="0 0 0 0 {color[0]} 0 0 0 0 {color[1]} 0 0 0 0 {color[2]} {k} 0 0 0 {b}"/></filter>')


def hatch(n, x0, y0, x1, y1, color, op, ang=-62, ln=(10, 22), w=1.3):
    out = []
    for _ in range(n):
        x, y = random.uniform(x0, x1), random.uniform(y0, y1)
        l = random.uniform(*ln)
        a = math.radians(ang + random.uniform(-6, 6))
        out.append(f'M{x:.0f} {y:.0f} l{l*math.cos(a):.1f} {l*math.sin(a):.1f}')
    return f'<path d="{" ".join(out)}" stroke="{color}" stroke-width="{w}" stroke-linecap="round" opacity="{op}" fill="none"/>'


def person(x, gy, s=1.0, sex='f', top='#E9DCC2', bottom='#3B4A5A', hair='#2B2320', shoe='#FFFFFF',
           L=(-46, -120), R=(46, -120), Le=None, Re=None, legs='stand', look=0, mood='smile',
           bag=None, behind='', front='', bag_side=1):
    """L / R：左右手位置；Le / Re：肘的位置（不给就自动）。legs: stand / walk。
    bag：背在身后的球拍包颜色；behind / front：画在身体后 / 前的道具（同一坐标系）。"""
    def arm(sh, h, e, sign):
        if e is None:
            e = ((sh[0] + h[0]) / 2 + sign * 10, (sh[1] + h[1]) / 2)
        return (f'<path d="M{sh[0]} {sh[1]} Q{e[0]} {e[1]} {h[0]} {h[1]}" stroke="{top}" stroke-width="15" fill="none" stroke-linecap="round"/>'
                f'<path d="M{sh[0]} {sh[1]} Q{e[0]} {e[1]} {h[0]} {h[1]}" stroke="{INK}" stroke-width="1.6" fill="none" opacity=".35" stroke-linecap="round"/>'
                f'<circle cx="{h[0]}" cy="{h[1]}" r="7" fill="{SKIN}"/>')
    if legs == 'walk':
        lg = [((-10, -112), (-22, -56), (-34, -4)), ((10, -112), (22, -54), (26, -4))]
    else:
        lg = [((-11, -112), (-13, -56), (-14, -4)), ((11, -112), (13, -56), (14, -4))]
    legs_s = ''.join(f'<path d="M{a[0]} {a[1]} Q{b[0]} {b[1]} {c[0]} {c[1]}" stroke="{bottom}" stroke-width="15" fill="none" stroke-linecap="round"/>' for a, b, c in lg)
    shoes = ''.join(f'<ellipse cx="{c[0] + 5}" cy="-3" rx="14" ry="7" fill="{shoe}" stroke="{INK}" stroke-width="1.6"/>' for _, _, c in lg)
    if sex == 'f':
        torso = f'<path d="M-30 -214 Q0 -224 30 -214 L38 -104 Q0 -96 -38 -104 Z" fill="{top}"/>'
        hair_b = f'<path d="M-42 -248 Q-46 -300 0 -302 Q46 -300 42 -248 L44 -214 Q30 -206 22 -220 L-22 -220 Q-30 -206 -44 -214 Z" fill="{hair}"/>'
        hair_f = f'<path d="M-39 -262 Q-30 -300 0 -298 Q34 -298 39 -262 Q20 -278 {-4 + look*6} -270 Q-20 -280 -39 -262 Z" fill="{hair}"/>'
    else:
        torso = f'<path d="M-36 -216 Q0 -226 36 -216 L34 -108 Q0 -102 -34 -108 Z" fill="{top}"/>'
        hair_b = ''
        hair_f = f'<path d="M-39 -256 Q-40 -302 2 -300 Q42 -300 39 -256 Q30 -276 {6 + look*6} -278 Q-18 -282 -39 -256 Z" fill="{hair}"/>'
    fx = look * 7
    if mood == 'smile':
        mouth = f'<path d="M{fx - 6} -236 Q{fx} -230 {fx + 6} -236" stroke="{INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
    elif mood == 'open':
        mouth = f'<ellipse cx="{fx}" cy="-234" rx="5" ry="6" fill="{INK}"/>'
    else:
        mouth = f'<path d="M{fx - 5} -234 H{fx + 5}" stroke="{INK}" stroke-width="2.2" stroke-linecap="round"/>'
    head = (f'<rect x="-7" y="-226" width="14" height="14" fill="{SKIN}"/>'
            f'<ellipse cx="0" cy="-256" rx="38" ry="40" fill="{SKIN}"/>'
            f'<circle cx="{fx - 13}" cy="-252" r="3.6" fill="{INK}"/><circle cx="{fx + 13}" cy="-252" r="3.6" fill="{INK}"/>'
            f'<ellipse cx="{fx - 22}" cy="-240" rx="7" ry="4" fill="#F2A2A0" opacity=".7"/><ellipse cx="{fx + 22}" cy="-240" rx="7" ry="4" fill="#F2A2A0" opacity=".7"/>'
            + mouth)
    bag_s = ''
    if bag:
        strings = ''.join(f'<path d="M{k} -306 V-232" stroke="{INK}" stroke-width="1" opacity=".5"/>' for k in (-14, -7, 0, 7, 14)) + \
            ''.join(f'<path d="M-20 {k} H20" stroke="{INK}" stroke-width="1" opacity=".5"/>' for k in (-296, -284, -272, -260, -248))
        bag_s = (f'<g transform="rotate({32*bag_side} 0 -170)">'
                 f'<clipPath id="rh{abs(hash((x, gy)))}"><ellipse cx="0" cy="-270" rx="22" ry="32"/></clipPath>'
                 f'<ellipse cx="0" cy="-270" rx="22" ry="32" fill="#F4F1E6" fill-opacity=".5" stroke="{INK}" stroke-width="4"/>'
                 f'<g clip-path="url(#rh{abs(hash((x, gy)))})">{strings}</g>'
                 f'<rect x="-22" y="-246" width="44" height="100" rx="14" fill="{bag}" stroke="{INK}" stroke-width="1.6"/>'
                 f'<path d="M-22 -232 H22" stroke="{INK}" stroke-width="1.2" opacity=".5"/></g>')
        strap = f'<path d="M{-26*bag_side} -212 L{30*bag_side} -112" stroke="{INK}" stroke-width="4" opacity=".75"/>'
    else:
        strap = ''
    return (f'<g transform="translate({x} {gy}) scale({s})" filter="url(#rough2)">'
            f'<ellipse cx="4" cy="0" rx="46" ry="7" fill="#000" opacity=".12"/>'
            f'{behind}{bag_s}{hair_b}{legs_s}{shoes}{torso}{strap}'
            f'{arm((-30, -206), L, Le, -1)}{arm((30, -206), R, Re, 1)}{head}{hair_f}{front}</g>')
