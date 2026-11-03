"""南伴球宣传物料：品牌常量 + 绘图小工具（海报源文件都 `from lib import *`）。

画布固定 1080×1350（4:5）。海报源文件只返回 SVG 内容字符串，用 page(body) 包成网页，
渲染、检查、出图都交给 build.py。用法速查见 .claude/skills/nanbanqiu-poster/SKILL.md，
不用通读本文件。所有随机效果必须 random.seed(...)，保证重画结果一致。
"""
import math
import random

W, H = 1080, 1350
SERIF = "'Noto Serif CJK SC','Noto Serif CJK TC','Noto Serif CJK KR',serif"
SANS = "'Noto Sans CJK SC','Noto Sans CJK TC','Noto Sans CJK KR',sans-serif"

# 品牌色（取自 App 图标和 PWA 样式：深绿渐变 + 荧光黄绿球）
C = dict(
    green='#176B4D', mid='#0E5139', deep='#0B3B2A', night='#04180F',
    lime='#C6EA3D', lime_hi='#E4F76A', lime_lo='#7FA21C',
    cream='#F7EBD6', paper='#F3E6CC', ink='#101828',
    orange='#E8643C', amber='#F2B134', warm='#FFC27A',
)

# 通用滤镜：fuzz（球的毛绒质感）、grain（胶片颗粒）、bl6/14/28/60（高斯模糊，区域放大避免出现方块边）
COMMON = '''
<filter id="fuzz" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .9 -.25"/></filter>
<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="8"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".5"/></feComponentTransfer></filter>
<filter id="bl6" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="bl14" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="bl28" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="28"/></filter>
<filter id="bl60" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="60"/></filter>
<filter id="rough" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9"/></filter>
<filter id="rough2" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="2" seed="5" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="3.5"/></filter>
'''


def ball(id, cx, cy, r, rot=-22, blur=0):
    """写实网球（渐变 + 毛绒噪点 + 边缘暗角）。id 在同一张海报里不能重复。"""
    s = r / 100
    return f'''
<g transform="translate({cx} {cy}) scale({s})" {'filter="url(#b%s)"' % id if blur else ''}>
  <circle r="100" fill="url(#ballg{id})"/>
  <clipPath id="bc{id}"><circle r="100"/></clipPath>
  <g clip-path="url(#bc{id})">
    <g transform="rotate({rot})">
      <path d="M-67 -74 C-30 -34 -30 34 -67 74" fill="none" stroke="#F7FBE8" stroke-width="11" stroke-linecap="round" opacity=".92"/>
      <path d="M67 -74 C30 -34 30 34 67 74" fill="none" stroke="#F7FBE8" stroke-width="11" stroke-linecap="round" opacity=".92"/>
    </g>
    <circle r="100" fill="#000" filter="url(#fuzz)" opacity=".35" style="mix-blend-mode:multiply"/>
    <circle r="100" fill="url(#rim{id})"/>
  </g>
</g>
<defs>
 <radialGradient id="ballg{id}" cx="35%" cy="30%" r="85%"><stop offset="0" stop-color="#E4F76A"/><stop offset=".55" stop-color="#C6EA3D"/><stop offset="1" stop-color="#7FA21C"/></radialGradient>
 <radialGradient id="rim{id}" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#1b2a00" stop-opacity=".0"/><stop offset="1" stop-color="#0b1a00" stop-opacity=".55"/></radialGradient>
 <filter id="b{id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="{blur}"/></filter>
</defs>'''


def seamdisc(cx, cy, r, rot, fill="#0B3B2A", seam="#C6EA3D", id="s"):
    """扁平球（纯色圆 + 两条球缝），极简海报用。"""
    s = r / 100
    return f'''<g transform="translate({cx} {cy}) scale({s})"><circle r="100" fill="{fill}"/><clipPath id="sd{id}"><circle r="100"/></clipPath><g clip-path="url(#sd{id})"><g transform="rotate({rot})">
<path d="M-67 -74 C-30 -34 -30 34 -67 74" fill="none" stroke="{seam}" stroke-width="11" stroke-linecap="round"/>
<path d="M67 -74 C30 -34 30 34 67 74" fill="none" stroke="{seam}" stroke-width="11" stroke-linecap="round"/></g></g></g>'''


def grain(op=.16, light=False):
    """整张加胶片颗粒；浅色底用 light=True（multiply），深色底默认（overlay）。放在 body 最后。"""
    return f'<rect width="{W}" height="{H}" filter="url(#grain)" opacity="{op}" style="mix-blend-mode:{"multiply" if light else "overlay"}"/>'


def wordmark(cy=1262, color="#fff", sub=True, op=1):
    """底部居中品牌标：双球小图标 + 「南伴球」 + 可选英文行。深色底 color 用 #fff，浅色底用 #0B3B2A。"""
    return f'''
<g opacity="{op}" fill="{color}">
 <g transform="translate(540 {cy-26})">
   <circle cx="-14" cy="-4" r="11" fill="#C6EA3D"/><circle cx="6" cy="8" r="7" fill="#C6EA3D" stroke="{'#0B3B2A' if color=='#fff' else '#F3EBDD'}" stroke-width="2.5"/>
 </g>
 <text x="540" y="{cy+22}" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="40" letter-spacing="14">南伴球</text>
 {'<text x="540" y="%d" text-anchor="middle" font-family="%s" font-weight="500" font-size="15" letter-spacing="9" opacity=".7">NANBANQIU · MELBOURNE</text>' % (cy + 52, SANS) if sub else ''}
</g>'''


def tag(text, x=84, y=150, color="#F7EBD6", rule="#C6EA3D", op=.7, weight=500):
    """左上角小标签 + 短横线（几乎每张都有）。"""
    return f'''<text x="{x}" y="{y}" font-family="{SANS}" font-size="17" font-weight="{weight}" letter-spacing="9" fill="{color}" opacity="{op}">{text}</text>
<line x1="{x}" y1="{y+26}" x2="{x+66}" y2="{y+26}" stroke="{rule}" stroke-width="3"/>'''


def headline(lines, x=80, y=330, size=112, colors=("#F7EBD6", "#C6EA3D"), ls=4, lh=None, anchor="start", weight=700):
    """多行大标题（衬线）。colors 按行轮换，只给一种颜色就全用它；行距默认 size*1.1。
    宽度估算：字数 × (size+ls) ≤ 画布宽 − 2×80，112 号字一行最多 7 个字。"""
    lh = lh or round(size * 1.11)
    cs = colors if isinstance(colors, (list, tuple)) else (colors,)
    out = ''
    for i, t in enumerate(lines):
        out += f'<text x="{x}" y="{y + i * lh}" text-anchor="{anchor}" font-family="{SERIF}" font-weight="{weight}" font-size="{size}" letter-spacing="{ls}" fill="{cs[i % len(cs)]}">{t}</text>'
    return out


def sub(text, x=84, y=530, size=26, color="#F7EBD6", op=.85, ls=5, anchor="start"):
    """标题下的副标题（无衬线）。"""
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{SANS}" font-size="{size}" letter-spacing="{ls}" fill="{color}" opacity="{op}">{text}</text>'


def persp(t, x0n, x1n, y_near, y_far, x0f, x1f):
    """球场透视：t=0 近端底线，t=1 远端底线，返回 (y, 左x, 右x)。"""
    y = y_near + (y_far - y_near) * t
    return y, x0n + (x0f - x0n) * t, x1n + (x1f - x1n) * t


def page(body, bg="#000"):
    """把 SVG 内容包成可渲染的网页（带 COMMON 滤镜）。"""
    return f'''<!doctype html><meta charset="utf-8"><style>html,body{{margin:0;background:{bg}}}svg{{display:block}}</style>
<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><defs>{COMMON}</defs>{body}</svg>'''


def moon(id, cx, cy, r, seed=1, glow=1.0, light=(-.45, -.55)):
    """写实满月：暗海（噪声生成的不规则斑块）+ 带亮边的环形坑 + 放射亮纹 + 边缘变暗 + 受光面渐变。
    id 同一张里唯一；glow 控制外圈光晕强度（0 关闭）；light 是受光方向（默认左上）。"""
    rnd = random.Random(seed)
    cr = ''
    for _ in range(34):
        a, d = rnd.uniform(0, 2 * math.pi), r * math.sqrt(rnd.random()) * .93
        x, y = cx + d * math.cos(a), cy + d * math.sin(a)
        s = r * (.011 + .06 * rnd.random() ** 2.8)
        edge = 1 - (d / r) ** 2  # 靠近边缘的坑压扁一点
        cr += (f'<g transform="translate({x:.1f} {y:.1f}) scale({max(.35, edge ** .5):.2f} 1) rotate({math.degrees(a):.0f})">'
               f'<circle r="{s:.1f}" fill="#4A463A" opacity=".07"/>'
               f'<circle cx="{-s*.13:.1f}" cy="{-s*.13:.1f}" r="{s:.1f}" fill="none" stroke="#FFFFFA" stroke-width="{max(.8, s*.16):.1f}" opacity=".5"/>'
               f'<circle cx="{s*.22:.1f}" cy="{s*.22:.1f}" r="{s*.6:.1f}" fill="#6B654F" opacity=".1"/></g>')
    ox, oy = cx - .12 * r, cy + .52 * r
    rays = ''.join(
        f'<line x1="{ox:.0f}" y1="{oy:.0f}" x2="{ox + math.cos(t) * r * rnd.uniform(.35, .85):.0f}" y2="{oy + math.sin(t) * r * rnd.uniform(.35, .85):.0f}" stroke="#FFFFF4" stroke-width="{rnd.uniform(1.5, 4):.1f}" opacity=".22"/>'
        for t in [i / 22 * 2 * math.pi + rnd.uniform(-.1, .1) for i in range(22)])
    lx, ly = 50 + light[0] * 45, 50 + light[1] * 45
    f = 2.2 / r
    return f'''
<defs>
 <radialGradient id="mb{id}" cx="{lx:.0f}%" cy="{ly:.0f}%" r="78%"><stop offset="0" stop-color="#FFFFF7"/><stop offset=".55" stop-color="#F6F1DF"/><stop offset="1" stop-color="#D3CCB4"/></radialGradient>
 <radialGradient id="ml{id}" cx="50%" cy="50%" r="50%"><stop offset=".74" stop-color="#14120C" stop-opacity="0"/><stop offset=".95" stop-color="#14120C" stop-opacity=".2"/><stop offset="1" stop-color="#0A0906" stop-opacity=".4"/></radialGradient>
 <radialGradient id="ms{id}" cx="{lx:.0f}%" cy="{ly:.0f}%" r="105%"><stop offset=".4" stop-color="#05090C" stop-opacity="0"/><stop offset="1" stop-color="#05090C" stop-opacity=".34"/></radialGradient>
 <radialGradient id="mg{id}" cx="50%" cy="50%" r="50%"><stop offset=".48" stop-color="#E4EEF8" stop-opacity=".42"/><stop offset="1" stop-color="#E4EEF8" stop-opacity="0"/></radialGradient>
 <filter id="mm{id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="{f:.5f}" numOctaves="5" seed="{seed*7+3}"/><feColorMatrix values="0 0 0 0 .52  0 0 0 0 .50  0 0 0 0 .44  13 0 0 0 -6.0"/><feGaussianBlur stdDeviation="{r/150:.1f}"/></filter>
 <filter id="mt{id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="{.9/ r * 40:.4f}" numOctaves="4" seed="{seed+11}"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".0" intercept="1"/></feComponentTransfer></filter>
 <clipPath id="mc{id}"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>
</defs>
{f'<circle cx="{cx}" cy="{cy}" r="{r*2.0:.0f}" fill="url(#mg{id})" opacity="{.55*glow:.2f}"/><circle cx="{cx}" cy="{cy}" r="{r*1.12:.0f}" fill="#F4F1DF" opacity="{.3*glow:.2f}" filter="url(#bl60)"/>' if glow else ''}
<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#mb{id})"/>
<g clip-path="url(#mc{id})">
  <rect x="{cx-r}" y="{cy-r}" width="{2*r}" height="{2*r}" filter="url(#mm{id})" opacity=".62"/>
  <rect x="{cx-r}" y="{cy-r}" width="{2*r}" height="{2*r}" filter="url(#mt{id})" opacity=".0"/>
  <g filter="url(#bl6)">{rays}</g>
  {cr}
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="#000" filter="url(#fuzz)" opacity=".12"/>
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#ms{id})"/>
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#ml{id})"/>
</g>'''


def space(seed=7, top='#02070A', bot='#06241A', avoid=(), n=150, milkyway=True, ymax=None):
    """深空背景：竖向渐变 + 银河带 + 星点（avoid=[(cx,cy,r)] 的区域不放星）。放在最底层。"""
    rnd = random.Random(seed)
    ymax = ymax or H
    stars = ''
    for _ in range(n):
        x, y = rnd.uniform(10, W - 10), rnd.uniform(10, ymax)
        if any((x - a) ** 2 + (y - b) ** 2 < (c * 1.12) ** 2 for a, b, c in avoid):
            continue
        r = rnd.choice([.7, .9, 1.1, 1.4, 1.8, 2.4]) * (1 if rnd.random() > .08 else 1.5)
        col = rnd.choice(['#F7EBD6', '#F7EBD6', '#DDEBFF', '#FFE9B8'])
        stars += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r:.1f}" fill="{col}" opacity="{rnd.uniform(.3, .95):.2f}"/>'
    mw = ''
    if milkyway:
        dust = ''
        for _ in range(260):
            u, v = rnd.gauss(0, 330), rnd.gauss(0, 60)
            dust += f'<circle cx="{u:.0f}" cy="{v:.0f}" r="{rnd.uniform(.5, 1.3):.1f}" fill="#F7EBD6" opacity="{rnd.uniform(.15, .6):.2f}"/>'
        mw = (f'<g transform="translate(560 {int(H*.55)}) rotate(-28)"><ellipse rx="760" ry="130" fill="#7FC6A4" opacity=".07" filter="url(#bl60)"/>'
              f'<ellipse rx="640" ry="48" fill="#F7EBD6" opacity=".06" filter="url(#bl28)"/>{dust}</g>')
    return f'''<defs><linearGradient id="sp{seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#sp{seed})"/>{mw}{stars}'''


def face(cx, cy, s=1.0, mood='smile', look=0, ink='#0B3B2A'):
    """网球小脸（画在球上）。mood: smile 睁眼微笑 / happy 弯弯笑眼 / sleep 闭眼；look -1..1 眼睛朝向；s 按球半径 / 118 缩放。"""
    e = 42 * s
    if mood == 'sleep':
        eyes = f'<path d="M{-e-20*s:.1f} 0 Q{-e:.1f} {20*s:.1f} {-e+20*s:.1f} 0"/><path d="M{e-20*s:.1f} 0 Q{e:.1f} {20*s:.1f} {e+20*s:.1f} 0"/>'
        eyes = f'<g fill="none" stroke="{ink}" stroke-width="{6*s:.1f}" stroke-linecap="round">{eyes}</g>'
    elif mood == 'happy':
        eyes = f'<g fill="none" stroke="{ink}" stroke-width="{6*s:.1f}" stroke-linecap="round"><path d="M{-e-18*s:.1f} {6*s:.1f} Q{-e:.1f} {-14*s:.1f} {-e+18*s:.1f} {6*s:.1f}"/><path d="M{e-18*s:.1f} {6*s:.1f} Q{e:.1f} {-14*s:.1f} {e+18*s:.1f} {6*s:.1f}"/></g>'
    else:
        lx = look * 5 * s
        one = lambda x: (f'<ellipse cx="{x:.1f}" cy="0" rx="{10*s:.1f}" ry="{14*s:.1f}" fill="{ink}"/>'
                         f'<circle cx="{x+lx-3*s:.1f}" cy="{-5*s:.1f}" r="{3.6*s:.1f}" fill="#fff"/>')
        eyes = one(-e) + one(e)
    mouth = f'<path d="M{-11*s:.1f} {32*s:.1f} Q0 {45*s:.1f} {11*s:.1f} {32*s:.1f}" fill="none" stroke="{ink}" stroke-width="{5*s:.1f}" stroke-linecap="round"/>'
    blush = ''.join(f'<ellipse cx="{x:.1f}" cy="{24*s:.1f}" rx="{15*s:.1f}" ry="{9*s:.1f}" fill="#E8643C" opacity=".35"/>' for x in (-e - 30 * s, e + 30 * s))
    return f'<g transform="translate({cx} {cy})">{blush}{eyes}{mouth}</g>'
