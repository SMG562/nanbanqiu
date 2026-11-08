"""汉风工具（144 起）：汉白玉石面、浅浮雕（阴影 + 高光 + 主体）、画像石人物、云气纹。"""
import math
from lin import ink

MARBLE = '''<filter id="marble" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0025 .007" numOctaves="5" seed="31" result="n"/>
<feColorMatrix in="n" type="matrix" values="0 0 0 0 .45  0 0 0 0 .46  0 0 0 0 .48  1 0 0 0 0" result="m"/>
<feComponentTransfer in="m"><feFuncA type="table" tableValues="0 0 0 0 0 .9 0 0 0 0 0 .5 0 0 0 0 0"/></feComponentTransfer></filter>
<filter id="stone" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="32"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .18 0"/></filter>
<filter id="rsh" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.4"/></filter>'''


def marble_bg(W, H, base='#F1EEE6'):
    return (f'<rect width="{W}" height="{H}" fill="{base}"/><rect width="{W}" height="{H}" filter="url(#marble)" opacity=".4"/>'
            f'<rect width="{W}" height="{H}" filter="url(#stone)" opacity=".6" style="mix-blend-mode:multiply"/>')


def relief(svg, face='#F8F6F0', shadow='#8E8A80', hi='#FFFFFF', d=4):
    """浅浮雕：同一组形状画三遍——右下阴影、左上高光、正面。svg 里用 FILL 作占位颜色。"""
    sh = svg.replace('FILL', shadow)
    h = svg.replace('FILL', hi)
    f = svg.replace('FILL', face)
    return (f'<g transform="translate({d} {d})" opacity=".75" filter="url(#rsh)">{sh}</g>'
            f'<g transform="translate({-d*.5} {-d*.5})" opacity=".9">{h}</g><g>{f}</g>')


POSES = {
    # 关节（以脚底中点为原点，向上为负）：hip, neck, head, 两条腿 [hip→knee→foot]，抛球/空手臂 [neck→elbow→hand]，持拍臂 [neck→elbow→hand]，拍头中心
    'serve': dict(hip=(0, -78), neck=(-10, -138), head=(-16, -160), legs=[[(0, -78), (10, -40), (16, 0)], [(0, -78), (-20, -40), (-30, -4)]],
                  arm=[(-10, -134), (6, -170), (14, -208)], rarm=[(-10, -134), (-40, -140), (-40, -176)], rk=(-50, -214), rr=-20),
    'lunge': dict(hip=(0, -62), neck=(18, -118), head=(26, -138), legs=[[(0, -62), (40, -40), (58, 0)], [(0, -62), (-30, -30), (-62, 0)]],
                  arm=[(16, -114), (-14, -100), (-40, -96)], rarm=[(16, -114), (52, -100), (88, -86)], rk=(124, -80), rr=75),
    'leap': dict(hip=(0, -110), neck=(-6, -168), head=(-10, -190), legs=[[(0, -110), (24, -80), (6, -48)], [(0, -110), (-22, -86), (-44, -66)]],
                 arm=[(-6, -164), (24, -190), (40, -222)], rarm=[(-6, -164), (-36, -186), (-30, -226)], rk=(-24, -268), rr=10),
    'pick': dict(hip=(0, -80), neck=(30, -130), head=(42, -150), legs=[[(0, -80), (16, -40), (22, 0)], [(0, -80), (-14, -40), (-20, 0)]],
                 arm=[(28, -126), (48, -80), (58, -20)], rarm=[(28, -126), (30, -86), (36, -30)], rk=(-34, -60), rr=50),
    'stand': dict(hip=(0, -80), neck=(0, -138), head=(2, -160), legs=[[(0, -80), (6, -40), (8, 0)], [(0, -80), (-6, -40), (-10, 0)]],
                  arm=[(0, -134), (16, -100), (20, -66)], rarm=[(0, -134), (-16, -100), (-20, -66)], rk=(-30, -40), rr=0),
    'sit': dict(hip=(0, -66), neck=(4, -124), head=(8, -146), legs=[[(0, -66), (40, -66), (42, 0)], [(-4, -64), (34, -62), (32, 0)]],
                arm=[(4, -120), (30, -100), (52, -96)], rarm=[(4, -120), (24, -96), (46, -92)], rk=(70, -60), rr=0),
    'sip': dict(hip=(0, -66), neck=(4, -124), head=(8, -146), legs=[[(0, -66), (40, -66), (42, 0)], [(-4, -64), (34, -62), (32, 0)]],
                arm=[(4, -120), (30, -112), (22, -142)], rarm=[(4, -120), (26, -98), (48, -94)], rk=(70, -60), rr=0),
    'bend': dict(hip=(0, -84), neck=(52, -112), head=(70, -118), legs=[[(0, -84), (6, -42), (10, 0)], [(0, -84), (-12, -42), (-16, 0)]],
                 arm=[(50, -110), (80, -112), (108, -118)], rarm=[(50, -110), (76, -100), (102, -100)], rk=(70, -60), rr=0),
}

NO_RACKET = {'pick', 'stand', 'sit', 'sip', 'bend'}


def figure(cx, cy, s=1.0, pose='serve', flip=1, sash=True):
    """画像石里的打球人：宽袍束腰、发髻、飘带，几大块剪影 + 球拍。返回带 FILL 占位的 SVG。"""
    P = POSES[pose]
    def T(pt):
        return (cx + pt[0] * s * flip, cy + pt[1] * s)
    out = []
    for leg in P['legs']:
        out.append(ink([T(p) for p in leg], 20 * s, 'FILL', 1, (.05, .05)))
    hx, hy = T(P['hip'])
    nx, ny = T(P['neck'])
    # 袍：从颈到胯再向下张开的梯形裙摆
    dx = (nx - hx)
    skirt = f'<path d="M{nx - 16*s:.0f} {ny:.0f} L{nx + 16*s:.0f} {ny:.0f} L{hx + 34*s:.0f} {hy + 30*s:.0f} C{hx + 10*s:.0f} {hy + 40*s:.0f} {hx - 10*s:.0f} {hy + 40*s:.0f} {hx - 34*s:.0f} {hy + 30*s:.0f}Z" fill="FILL"/>'
    out.append(skirt)
    if sash and pose not in ('pick', 'sit', 'sip', 'bend'):                             # 飘带：从肩后向上扬起（不从腰后拖，免得像尾巴）
        out.append(ink([(nx, ny + 6 * s), (nx - flip * 40 * s, ny - 10 * s), (nx - flip * 76 * s, ny - 4 * s), (nx - flip * 104 * s, ny - 30 * s)], 7 * s, 'FILL', 1, (.1, .9)))
    for arm in ('arm', 'rarm'):
        out.append(ink([T(p) for p in P[arm]], 14 * s, 'FILL', 1, (.05, .3)))
    hdx, hdy = T(P['head'])
    out.append(f'<circle cx="{hdx:.0f}" cy="{hdy:.0f}" r="{13*s:.1f}" fill="FILL"/>')
    out.append(f'<circle cx="{hdx - flip*6*s:.0f}" cy="{hdy - 13*s:.0f}" r="{6*s:.1f}" fill="FILL"/>')                 # 发髻
    if pose in NO_RACKET:                                   # 捡球、站着、坐着的人不拿拍
        return ''.join(out)
    hx2, hy2 = T(P['rarm'][-1])
    rkx, rky = T(P['rk'])
    out.append(ink([(hx2, hy2), (rkx + (hx2 - rkx) * .45, rky + (hy2 - rky) * .45)], 5 * s, 'FILL', 1, (0, 0)))
    out.append(f'<ellipse cx="{rkx:.0f}" cy="{rky:.0f}" rx="{14*s:.1f}" ry="{20*s:.1f}" transform="rotate({P["rr"]*flip} {rkx:.0f} {rky:.0f})" fill="none" stroke="FILL" stroke-width="{5*s:.1f}"/>')
    return ''.join(out)


def incise(svg, color='#6E6A60', op=.55):
    """阴刻线：把一组线条用细深色刻出来。"""
    return f'<g opacity="{op}">{svg.replace("FILL", color)}</g>'


def cloud_scroll(x, y, s=1.0, flip=1, w=4):
    """汉代云气纹：一条拖长的弧线，末端卷成小涡。返回带 FILL 占位的线。"""
    k = s * flip
    return (f'<path d="M{x:.0f} {y:.0f} C{x + 60*k:.0f} {y - 50*s:.0f} {x + 140*k:.0f} {y - 40*s:.0f} {x + 170*k:.0f} {y - 4*s:.0f} '
            f'C{x + 186*k:.0f} {y + 18*s:.0f} {x + 166*k:.0f} {y + 34*s:.0f} {x + 150*k:.0f} {y + 22*s:.0f} C{x + 140*k:.0f} {y + 14*s:.0f} {x + 146*k:.0f} {y + 2*s:.0f} {x + 156*k:.0f} {y + 6*s:.0f}" '
            f'fill="none" stroke="FILL" stroke-width="{w*s:.1f}" stroke-linecap="round"/>')


def flat(svg, color):
    """平面剪影：把 FILL 换成一个颜色（不做浮雕）。"""
    return svg.replace('FILL', color)


POP = dict(coral='#FF6B5B', cobalt='#2F5BEA', butter='#FFD45C', mint='#5ED3A6', pink='#FF9EC0', navy='#1D2440', cream='#FFF6E6', sky='#8EC9FF', orange='#FF9A3C', lilac='#B9A6FF')
