"""绘本人物 v3 的头（11-10）：漫画式五官——有虹膜和高光的眼睛、眉形、尖下巴的脸型、一簇一簇的发梢和发丝高光。
局部坐标：脸中心 (0,0)，脸高约 70；默认 3/4 侧脸朝右，mirror=-1 朝左。
返回 (后发, 前面的头)：后发要画在身体后面。
"""
from storybook import OUT, SKIN

SK_SH = '#EDBDA5'
_n = [0]


def _id(p):
    _n[0] += 1
    return f'{p}{_n[0]}'


def _eye(cx, cy, w, h, look=(0, 0), lash=True, iris='#4A2A1C', sharp=False, gid=''):
    """一只眼：眼白 + 渐变虹膜 + 两个高光 + 粗上眼线（女生外眼角上挑的睫毛）。"""
    x0, x1 = cx - w / 2, cx + w / 2
    top = cy - h * (0.62 if not sharp else 0.48)
    shape = f'M{x0} {cy} C{cx - w*.25} {top} {cx + w*.25} {top - h*.05} {x1} {cy - h*.18} C{cx + w*.2} {cy + h*.42} {cx - w*.25} {cy + h*.4} {x0} {cy} Z'
    cid = _id('ec')
    ix, iy = cx + w * .06 + look[0], cy - h * .02 + look[1]
    g = (f'<clipPath id="{cid}"><path d="{shape}"/></clipPath>'
         f'<path d="{shape}" fill="#FFFDF8"/>'
         f'<g clip-path="url(#{cid})"><ellipse cx="{ix}" cy="{iy}" rx="{w*.3:.1f}" ry="{h*.56:.1f}" fill="url(#{gid})"/>'
         f'<ellipse cx="{ix}" cy="{iy + h*.06:.1f}" rx="{w*.13:.1f}" ry="{h*.26:.1f}" fill="#1A100C"/>'
         f'<path d="M{x0} {cy - h*.3} H{x1}" stroke="#C9B6B0" stroke-width="{h*.25:.1f}" opacity=".35"/></g>'
         f'<circle cx="{ix - w*.1:.1f}" cy="{iy - h*.2:.1f}" r="{max(1.1, w*.09):.1f}" fill="#fff"/>'
         f'<circle cx="{ix + w*.1:.1f}" cy="{iy + h*.22:.1f}" r="{max(.6, w*.04):.1f}" fill="#fff" opacity=".9"/>')
    # 上眼线（粗）+ 外眼角
    g += f'<path d="M{x0 - .5} {cy + .5} C{cx - w*.25} {top - .6} {cx + w*.25} {top - h*.06 - .6} {x1 + .5} {cy - h*.18}" stroke="#1E1412" stroke-width="{2.4 if lash else 2.0}" fill="none" stroke-linecap="round"/>'
    if lash:
        g += f'<path d="M{x1 - w*.22:.1f} {cy - h*.42:.1f} Q{x1 + w*.08:.1f} {cy - h*.42:.1f} {x1 + w*.24:.1f} {cy - h*.62:.1f} Q{x1 + w*.12:.1f} {cy - h*.2:.1f} {x1:.1f} {cy - h*.1:.1f} Z" fill="#1E1412"/>'
    g += f'<path d="M{cx - w*.15:.1f} {cy + h*.42:.1f} Q{cx + w*.1:.1f} {cy + h*.5:.1f} {x1 - w*.15:.1f} {cy + h*.2:.1f}" stroke="#9A6A5A" stroke-width=".9" fill="none" opacity=".7"/>'
    return g


def _smile_eye(cx, cy, w, lash=True):
    g = f'<path d="M{cx - w/2} {cy} Q{cx} {cy - w*.42} {cx + w/2} {cy}" stroke="#1E1412" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    if lash:
        g += f'<path d="M{cx + w/2} {cy} l{w*.18:.1f} {-w*.12:.1f}" stroke="#1E1412" stroke-width="1.3" stroke-linecap="round"/>'
    return g


def _defs(gid, iris):
    return (f'<radialGradient id="{gid}" cx=".5" cy=".65" r=".6"><stop offset="0" stop-color="{iris[1]}"/>'
            f'<stop offset="1" stop-color="{iris[0]}"/></radialGradient>')


FACE_F = 'M-25 -22 C-27 -2 -22 16 -9 27 C-1 33 6 36 10 34 C17 31 23 20 26 6 C28 -8 27 -24 20 -34 L-20 -34 Z'
FACE_M = 'M-25 -24 C-27 -2 -23 16 -11 28 C-4 35 4 39 9 37 C17 34 23 24 26 10 C28 -6 28 -24 21 -36 L-20 -36 Z'


def head(sex='f', hair='long', mood='smile', look=(0, 0), mirror=1, hc='#3B2620', hl='#8C5E46', tilt=0):
    gid = _id('ir')
    iris = ('#3A1F14', '#9A6440') if sex == 'f' else ('#1F1A1E', '#5E5660')
    defs = f'<defs>{_defs(gid, iris)}</defs>'
    face = FACE_F if sex == 'f' else FACE_M
    g = defs
    # 后发
    back = ''
    if hair == 'long':
        back = (f'<path d="M0 -40 C-34 -44 -50 -18 -52 8 C-56 38 -82 60 -120 68 C-98 74 -86 78 -74 82 C-98 94 -118 94 -136 90 '
                f'C-106 110 -70 106 -48 86 C-36 74 -30 56 -26 40 L24 30 C34 0 34 -30 0 -40 Z" fill="{hc}" stroke="{OUT}" stroke-width="1.2"/>'
                f'<path d="M-46 4 C-56 40 -86 60 -114 66 M-40 20 C-50 56 -80 80 -110 86 M-34 -20 C-48 0 -54 30 -70 52" stroke="{hl}" stroke-width="1.6" fill="none" opacity=".75" stroke-linecap="round"/>'
                f'<path d="M-62 56 C-84 70 -112 74 -142 70 M-56 74 C-76 90 -100 96 -124 98" stroke="{hc}" stroke-width="2" fill="none" stroke-linecap="round"/>')
    elif hair == 'bob':
        back = (f'<path d="M-30 -24 C-40 -52 32 -56 38 -20 L40 18 C42 26 46 30 50 30 C40 36 30 32 26 26 L-26 26 C-30 34 -42 36 -50 30 C-44 28 -42 22 -42 16 Z" fill="{hc}" stroke="{OUT}" stroke-width="1.2"/>'
                f'<path d="M-36 -6 C-38 8 -40 20 -46 28 M34 -8 C36 6 38 18 44 28" stroke="{hl}" stroke-width="1.4" fill="none" opacity=".7"/>')
    elif hair == 'short':
        back = f'<path d="M-28 -10 C-34 -40 -10 -54 14 -50 C32 -46 38 -30 32 -12 Z" fill="{hc}"/>'
    # 脖子 + 脸
    g += f'<path d="M-9 26 L-8 50 L10 50 L11 26 Z" fill="{SKIN}" stroke="{OUT}" stroke-width="1.1"/><path d="M-8 30 Q2 38 11 30 L11 36 Q2 42 -8 36 Z" fill="{SK_SH}" opacity=".7"/>'
    g += f'<ellipse cx="-22" cy="2" rx="5.5" ry="8" fill="{SKIN}" stroke="{OUT}" stroke-width="1.1"/><path d="M-23 -2 C-20 0 -20 5 -23 7" stroke="{OUT}" stroke-width=".9" fill="none" opacity=".6"/>'
    g += f'<path d="{face}" fill="{SKIN}" stroke="{OUT}" stroke-width="1.3" stroke-linejoin="round"/>'
    # 腮红（柔边）
    bid = _id('bl')
    g += (f'<defs><radialGradient id="{bid}"><stop offset="0" stop-color="#F28C86" stop-opacity="{.55 if sex == "f" else .22}"/><stop offset="1" stop-color="#F28C86" stop-opacity="0"/></radialGradient></defs>'
          f'<ellipse cx="-5" cy="12" rx="10" ry="6" fill="url(#{bid})"/><ellipse cx="21" cy="12" rx="7" ry="5" fill="url(#{bid})"/>')
    # 五官
    if sex == 'f':
        g += (f'<path d="M-15 -14 Q-7 -19 1 -16" stroke="#3A2620" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
              f'<path d="M12 -16 Q18 -18 24 -14" stroke="#3A2620" stroke-width="1.4" fill="none" stroke-linecap="round"/>')
        if mood == 'smile_eyes':
            g += _smile_eye(-6, 0, 14) + _smile_eye(17, 0, 10)
        else:
            g += _eye(-6, 1, 18, 14, look, True, gid=gid) + _eye(18, 1, 12, 13, look, True, gid=gid)
        g += f'<path d="M24 6 C26 10 26 12 23 13" stroke="#B07A66" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
        if mood in ('smile', 'smile_eyes'):
            g += (f'<path d="M7 22 Q13 26 19 21" stroke="#A8443C" stroke-width="1.7" fill="none" stroke-linecap="round"/>'
                  f'<path d="M9 24.5 Q13 27 17 23.5" stroke="#E58A86" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>')
        else:  # 'o'
            g += f'<ellipse cx="13" cy="23" rx="3" ry="3.6" fill="#9A3A36"/><path d="M11 21.5 Q13 20.5 15 21.5" stroke="#E58A86" stroke-width="1" fill="none"/>'
    else:
        g += (f'<path d="M-18 -12 L-10 -16 L2 -15" stroke="#1E1A1D" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
              f'<path d="M11 -15 L19 -16 L25 -12" stroke="#1E1A1D" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>')
        if mood == 'smile_eyes':
            g += _smile_eye(-6, 0, 14, False) + _smile_eye(17, 0, 10, False)
        else:
            g += _eye(-5, 2, 18, 12, look, False, sharp=True, gid=gid) + _eye(18, 2, 12, 11, look, False, sharp=True, gid=gid)
        g += f'<path d="M25 5 Q28 11 23.5 13" stroke="#A8786A" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
        if mood == 'call':
            g += f'<path d="M6 21 Q13 19 20 21 Q15 30 10 28 Q6 26 6 21 Z" fill="#7E2E2C"/><path d="M8 21.5 Q13 20.5 18 21.5" stroke="#fff" stroke-width="1.6"/>'
        else:
            g += f'<path d="M6 22 Q13 26 20 21" stroke="#7A3A34" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M11 27 Q13 28 15 27" stroke="#B07A66" stroke-width="1" fill="none"/>'
    # 前发
    if hair == 'long':
        g += (f'<path d="M-28 -4 C-34 -40 -6 -50 14 -46 C30 -42 36 -28 31 -8 Q28 -16 25 -22 Q23 -12 18 -6 Q17 -18 12 -27 Q8 -15 1 -10 Q2 -21 -3 -31 Q-8 -18 -15 -13 Q-14 -22 -17 -28 Q-22 -16 -28 -4 Z" fill="{hc}" stroke="{OUT}" stroke-width="1.2" stroke-linejoin="round"/>'
              f'<path d="M-24 -14 C-30 0 -30 14 -26 30 C-24 18 -22 6 -20 -6 Z" fill="{hc}" stroke="{OUT}" stroke-width="1"/>'
              f'<path d="M-16 -36 Q4.0 -45 24 -37 L23 -32 L20.0 -31 L12.0 -28 L4.0 -31 L-4.0 -28 L-12.0 -31 L-15 -32 Z" fill="{hl}" opacity=".45"/>'
              f'<path d="M0 -44 C-6 -36 -10 -28 -12 -20 M12 -44 C10 -34 8 -26 6 -18" stroke="{hl}" stroke-width="1" fill="none" opacity=".8"/>'
              f'<circle cx="-22" cy="13" r="2" fill="#E2C27A" stroke="#9A7A3A" stroke-width=".6"/>')
    elif hair == 'bob':
        g += (f'<path d="M-30 -4 C-34 -42 -4 -50 16 -46 C34 -42 40 -26 34 -4 Q31 -12 28 -18 Q26 -8 21 -4 Q20 -14 16 -22 Q12 -12 6 -9 Q6 -18 2 -24 Q-3 -14 -10 -10 Q-10 -18 -14 -24 Q-20 -12 -30 -4 Z" fill="{hc}" stroke="{OUT}" stroke-width="1.2" stroke-linejoin="round"/>'
              f'<path d="M-26 -10 C-32 6 -32 16 -28 26 C-24 18 -22 6 -20 -8 Z M32 -10 C36 4 36 16 32 24 C30 14 28 4 28 -6 Z" fill="{hc}" stroke="{OUT}" stroke-width="1"/>'
              f'<path d="M-14 -37 Q6.0 -46 26 -38 L25 -33 L22.0 -32 L14.0 -29 L6.0 -32 L-2.0 -29 L-10.0 -32 L-13 -33 Z" fill="{hl}" opacity=".45"/>'
              f'<path d="M-2 -4 L2 -8" stroke="#E9C46A" stroke-width="2.4" stroke-linecap="round"/>')  # 小发夹
    else:  # 男生：蓬松的碎发刘海 + 两侧推短
        g += '<g transform="translate(4 -18) scale(.86) translate(-4 18)">'
        g += (              f'<path d="M-32 -6 C-42 -40 -20 -62 10 -60 C36 -58 50 -40 46 -16 Q42 -22 38 -26 Q40 -12 36 -2 Q32 -14 26 -22 Q26 -10 21 -4 Q18 -18 12 -26 Q10 -14 4 -8 Q2 -20 -4 -28 Q-8 -16 -14 -12 Q-14 -24 -20 -30 Q-24 -18 -32 -6 Z" fill="{hc}" stroke="{OUT}" stroke-width="1.2" stroke-linejoin="round"/>'
                            f'<path d="M-6 -42 C6 -32 14 -18 15 -4 C10 -16 2 -26 -12 -34 Z" fill="{hc}"/>'
              f'<path d="M-8 -52 Q4 -56 16 -54 M20 -50 Q30 -46 34 -38" stroke="{hl}" stroke-width="2.2" fill="none" opacity=".6" stroke-linecap="round"/></g>')
    t = f'rotate({tilt})' if tilt else ''
    wrap = lambda s_: f'<g transform="scale({mirror} 1) {t}">{s_}</g>'
    return wrap(back), wrap(g)
