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
