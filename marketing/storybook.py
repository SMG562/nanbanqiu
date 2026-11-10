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


# ---------- v2 人物（11-10）：修长比例、细线描边、能看清的手和鞋 ----------
OUT = '#3A2A22'


def _q(p0, p1, p2, t):
    a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
    return (a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1])


def limb(p0, p1, p2, w0, w1, fill, sw=1.5):
    """沿二次曲线的渐细肢体：填色 + 两侧细描边（端头通常被手 / 鞋 / 衣服盖住）。"""
    Ls, Rs = [], []
    for i in range(15):
        t = i / 14
        x, y = _q(p0, p1, p2, t)
        dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0])
        dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
        n = math.hypot(dx, dy) or 1
        nx, ny = -dy / n, dx / n
        w = (w0 + (w1 - w0) * t) / 2
        Ls.append((x + nx * w, y + ny * w)); Rs.append((x - nx * w, y - ny * w))
    pl = lambda P: ' '.join(f'{x:.1f} {y:.1f}' for x, y in P)
    return (f'<path d="M{pl(Ls)} L{pl(Rs[::-1])} Z" fill="{fill}"/>'
            f'<circle cx="{p0[0]}" cy="{p0[1]}" r="{w0/2:.1f}" fill="{fill}"/>'
            f'<path d="M{pl(Ls)}" fill="none" stroke="{OUT}" stroke-width="{sw}" stroke-linecap="round"/>'
            f'<path d="M{pl(Rs)}" fill="none" stroke="{OUT}" stroke-width="{sw}" stroke-linecap="round"/>')


def hand(x, y, ang=0, kind='open', s=1.0, mirror=1):
    """手：指尖朝 +y 方向（ang 旋转）。open 自然张开、palm 掌心朝上托着、hold 握住、hook 两指勾着。"""
    sk = f'fill="{SKIN}" stroke="{OUT}" stroke-width="1.4" stroke-linejoin="round"'
    ln = f'fill="none" stroke="{OUT}" stroke-width="1.1" stroke-linecap="round"'
    if kind == 'open':
        g = (f'<path d="M-7 -2 C-8 6 -7 13 -4 17 C-2 19 0 18 0 15 L1 18 C2 20 5 19 5 16 L6 17 C8 18 9 16 8 12 C8 6 8 2 7 -2 Z" {sk}/>'
             f'<path d="M6 2 C11 3 13 8 11 11 C9 12 8 9 7 7" {sk}/>')
    elif kind == 'palm':  # 掌心朝上、手指平伸
        g = (f'<path d="M-8 -2 C-9 6 -6 10 -2 11 L14 13 C18 13 18 9 15 8 L17 7 C20 6 19 2 16 2 L9 1 C9 -1 8 -3 6 -3 Z" {sk}/>'
             f'<path d="M3 -3 C6 -9 11 -10 12 -7 C12 -5 9 -3 7 -1" {sk}/><path d="M2 6 L14 7 M3 9 L13 10" {ln} opacity=".6"/>')
    elif kind == 'hold':
        g = (f'<path d="M-8 -2 C-10 6 -8 14 0 15 C7 15 9 8 8 -2 Z" {sk}/>'
             f'<path d="M-6 5 Q0 7 6 5 M-6 9 Q0 11 6 9" {ln} opacity=".7"/><path d="M6 -1 C10 2 10 7 6 8" {sk}/>')
    else:  # hook：两根手指勾着东西
        g = (f'<path d="M-7 -2 C-8 5 -6 10 -2 12 L4 12 C8 12 9 8 7 -2 Z" {sk}/>'
             f'<path d="M-3 11 C-4 18 2 20 3 15 M2 11 C2 17 7 18 7 13" {sk}/><path d="M6 1 C10 2 11 6 8 8" {sk}/>')
    return f'<g transform="translate({x} {y}) rotate({ang}) scale({s * mirror} {s})">{g}</g>'


def sneaker(x, y, rot=0, d=1, upper='#FFFFFF', accent='#2F7552', high=False):
    """系带球鞋，侧面，d=1 鞋头朝右；(x, y) 是鞋底中心。"""
    top = '-30' if high else '-16'
    g = (f'<path d="M-24 2 C-27 -8 -22 {top} -10 {top} L0 -14 C10 -8 20 -7 27 -2 C30 1 29 4 26 4 L-24 4 Z" fill="{upper}" stroke="{OUT}" stroke-width="1.5" stroke-linejoin="round"/>'
         f'<path d="M-27 4 H28 C31 7 28 10 23 10 H-24 C-29 10 -29 6 -27 4 Z" fill="#EFE8DA" stroke="{OUT}" stroke-width="1.5"/>'
         f'<path d="M-27 7 H29" stroke="{OUT}" stroke-width="1" opacity=".5"/>'
         f'<path d="M14 -6 C19 -5 24 -3 27 -1" stroke="{accent}" stroke-width="3" fill="none" stroke-linecap="round"/>'
         f'<path d="M-14 -4 C-8 -6 -2 -6 4 -4" stroke="{accent}" stroke-width="2.4" fill="none"/>'
         + ''.join(f'<path d="M{-6 + i*5} -15 L{-1 + i*5} -9 M{-1 + i*5} -15 L{-6 + i*5} -9" stroke="{OUT}" stroke-width="1.1"/>' for i in range(3))
         + (f'<path d="M-22 -18 H-12" stroke="{OUT}" stroke-width="1.2"/>' if high else ''))
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({d} 1)">{g}</g>'


def maryjane(x, y, rot=0, d=1):
    g = (f'<path d="M-20 2 C-22 -8 -14 -12 -4 -11 C8 -10 18 -6 22 -1 C24 3 20 5 16 5 L-18 5 Z" fill="#1D1A1A" stroke="{OUT}" stroke-width="1.4"/>'
         f'<path d="M-6 -11 C-2 -16 6 -16 10 -8" stroke="#1D1A1A" stroke-width="3" fill="none"/><circle cx="9" cy="-8" r="2" fill="#D8C08A"/>'
         f'<path d="M-2 -8 C4 -8 10 -6 16 -3" stroke="#fff" stroke-width="1.6" opacity=".45" fill="none"/>'
         f'<path d="M-20 5 H18" stroke="#6B4A3A" stroke-width="2.5"/>')
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({d} 1)">{g}</g>'


def wc_filter(fid, seed=4):
    """水彩填色：形状里不均匀的深浅 + 轻微抖边。"""
    return (f'<filter id="{fid}" x="-10%" y="-10%" width="120%" height="120%">'
            f'<feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="3" seed="{seed}" result="n"/>'
            f'<feDisplacementMap in="SourceGraphic" in2="n" scale="3" result="d"/>'
            f'<feColorMatrix in="n" values="0 0 0 0 .25 0 0 0 0 .15 0 0 0 0 .1 0 0 0 -.6 .3" result="m"/>'
            f'<feComposite in="m" in2="d" operator="in" result="s"/>'
            f'<feMerge><feMergeNode in="d"/><feMergeNode in="s"/></feMerge></filter>')


_bn = [0]


def blush(cx, cy, rx, ry, op=.6):
    """柔边腮红（径向渐变），比平涂的椭圆自然。"""
    _bn[0] += 1
    i = f'bsh{_bn[0]}'
    return (f'<radialGradient id="{i}"><stop offset="0" stop-color="#F08C86" stop-opacity="{op}"/><stop offset="1" stop-color="#F08C86" stop-opacity="0"/></radialGradient>'
            f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="url(#{i})"/>')


def gloss(d, color, op=.28, w=1.8):
    """头发上一道细细的反光。"""
    return f'<path d="{d}" stroke="{color}" stroke-width="{w}" fill="none" stroke-linecap="round" opacity="{op}"/>'
