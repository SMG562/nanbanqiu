"""立式小黑板（挂板）共用底子：墙面 + 原木框 + 墨绿黑板 + 粉笔槽（粉笔、板擦）+ 可选粉笔彩旗 + 粉笔颗粒滤镜。
framed(chalk_svg, chalk_html, css, paper_html='')：chalk_* 走粉笔滤镜；paper_html 是贴在黑板上的实物（纸条等），不走滤镜。"""
import random
from chalkbase import FONT_DIR, WK
from common import *
W_, LM, PK, YL, BL = '#F4F2EA', '#D4F25A', '#F5A3B5', '#F6DB6E', '#9ED3F0'
SLATE = '#2F5A4B'
CUR = ['fair']
SEAL_AT = [(560, 404)]          # 国风印章位置，由版式设置
BX0, BY0, BX1, BY1 = 64, 92, 1016, 1318

def bunting():
    cols = [PK, YL, BL, LM, W_]; out = ''
    for (x0, x1) in ((BX0 + 10, 540), (540, BX1 - 10)):
        n = 7; sag = 34
        pts = [(x0 + (x1 - x0) * i / n, BY0 + 26 + sag * 4 * (i / n) * (1 - i / n)) for i in range(n + 1)]
        out += f'<path d="M{pts[0][0]:.0f} {pts[0][1]:.0f} Q {(x0+x1)/2:.0f} {BY0+26+sag*2:.0f} {pts[-1][0]:.0f} {pts[-1][1]:.0f}" stroke="{W_}" stroke-width="2.4" fill="none" opacity=".8"/>'
        for i in range(n):
            (ax, ay), (bx, by) = pts[i], pts[i + 1]; c = cols[(i + (0 if x0 < 300 else 3)) % len(cols)]
            mx, my = (ax + bx) / 2, (ay + by) / 2 + 44
            out += f'<path d="M{ax+4:.0f} {ay:.0f} L{bx-4:.0f} {by:.0f} L{mx:.0f} {my:.0f}Z" fill="{c}" fill-opacity=".38" stroke="{c}" stroke-width="2.4" stroke-linejoin="round"/>'
            out += ''.join(f'<path d="M{ax+10+k*9:.0f} {ay+4+k*.5:.0f} l8 {22-k*3:.0f}" stroke="{c}" stroke-width="1.6" opacity=".6"/>' for k in range(4))
    return f'<g class="art">{out}</g>'

def title(text, x, y, size, fill='url(#hl)', stroke=W_):
    """标题字。fill='url(#hl)' 是强调行，按当前皮肤的字效画；其余是白粉笔行。"""
    mode = SKINS[CUR[0]]['tmode']; hi = fill == 'url(#hl)'
    base = f'x="{x}" y="{y}" font-family="{WK}" font-weight="700" font-size="{size}" letter-spacing="6"'
    sw = f'{size*.068:.1f}'
    if mode == 'hollow':   # 空心描边 + 错位影子
        sh = f'<text data-fx="1" x="{x+7}" y="{y+7}" font-family="{WK}" font-weight="700" font-size="{size}" letter-spacing="6" fill="none" stroke="{LM if hi else BL}" stroke-width="2.6" opacity=".8">{text}</text>'
        return sh + f'<text {base} fill="none" stroke="{W_}" stroke-width="3.4" stroke-linejoin="round">{text}</text>'
    if not hi: return f'<text {base} fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" paint-order="stroke">{text}</text>'
    if mode == 'multi':    # 每个字一种颜色
        pats = ['hp', 'hy', 'hb', 'hl']; tsp = ''.join(f'<tspan fill="url(#{pats[i % 4]})">{ch}</tspan>' for i, ch in enumerate(text))
        return f'<text {base} stroke="{W_}" stroke-width="{sw}" stroke-linejoin="round" paint-order="stroke">{tsp}</text>'
    if mode == 'neon':     # 霓虹：外层彩色光晕 + 白芯
        c = SKINS[CUR[0]]['title']
        return f'<text data-fx="1" {base} fill="{c}" opacity=".9" filter="url(#glow)">{text}</text><text {base} fill="{c}" stroke="#FFF7D6" stroke-width="2.4" paint-order="stroke">{text}</text>'
    if mode == 'seal':     # 朱红 + 金描边
        return f'<text {base} fill="url(#hl)" stroke="#E9C46A" stroke-width="{sw}" stroke-linejoin="round" paint-order="stroke">{text}</text>'
    return f'<text {base} fill="url(#hl)" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" paint-order="stroke">{text}</text>'

def framed(chalk_svg, chalk_html, css='', paper_html='', seed=7, skin='fair', wall=False):
    random.seed(seed); K = SKINS[skin]
    wood = ''.join(f'<path d="M{x} 0 q 30 {random.randint(-6,6)} 60 0 t 60 0" stroke="#7A5233" stroke-opacity=".25" fill="none"/>' for x in range(0, 1080, 120))
    smudge = ''.join(f'<ellipse cx="{random.randint(BX0,BX1)}" cy="{random.randint(BY0,BY1)}" rx="{random.randint(120,320)}" ry="{random.randint(30,90)}" fill="#fff" opacity="{random.uniform(.015,.035):.3f}" filter="url(#bl)"/>' for _ in range(12))
    doc = f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em,i,u{{text-decoration:none;font-style:normal}}
body{{width:1080px;height:1440px;overflow:hidden;position:relative;font-family:{WK};color:{W_};background:linear-gradient(180deg,#EFE9DE,#E4DCCD)}}
.fx{{position:absolute;inset:0}} .chalk{{position:absolute;inset:0;filter:url(#chalk)}} .paper{{position:absolute;inset:0}}
.lime{{color:{LM}}} .pink{{color:{PK}}}
.how{{position:absolute;left:100px;top:1200px;font-size:26px}} .how b{{color:{LM}}} .how small{{display:block;font-size:18px;opacity:.6;margin-top:4px}}
.wm{{position:absolute;right:100px;top:1196px;text-align:right;font-weight:700;font-size:36px;letter-spacing:9px}} .wm small{{display:block;font-weight:400;font-size:13px;letter-spacing:4px;opacity:.55}}
.demo{{position:absolute;right:100px;top:1278px;font-size:13px;letter-spacing:4px;opacity:.45}}
.tagd{{position:absolute;font-size:21px;padding:0 14px;background:{K['board'][1]};letter-spacing:2px}} .tagd small{{font-size:18px;opacity:.7;margin-left:10px}}
{css}
{K.get('css', '')}
</style><body>
<svg class="fx" width="1080" height="1440"><defs>
<filter id="chalk" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="2" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3 0 0 0 2.55" result="holes"/>
 <feComposite in="SourceGraphic" in2="holes" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="w"/>
 <feDisplacementMap in="c" in2="w" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".35"/></filter>
<filter id="bl" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1480" height="1840"><feGaussianBlur stdDeviation="36"/></filter>
<filter id="sh" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1280" height="1640"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="wall"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .35  0 0 0 0 .3  0 0 0 .12 0"/></filter>
<linearGradient id="oak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{K["frame"][0]}"/><stop offset=".5" stop-color="{K["frame"][1]}"/><stop offset="1" stop-color="{K["frame"][2]}"/></linearGradient>
<linearGradient id="oakv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{K["frame"][0]}"/><stop offset=".5" stop-color="{K["frame"][1]}"/><stop offset="1" stop-color="{K["frame"][2]}"/></linearGradient>
<radialGradient id="slate" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="{K["board"][0]}"/><stop offset=".6" stop-color="{K["board"][1]}"/><stop offset="1" stop-color="{K["board"][2]}"/></radialGradient>
<linearGradient id="stick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient>
<pattern id="hl" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="9" fill="{K["title"]}" fill-opacity=".7"/><path d="M0 0 V9" stroke="{K["title"]}" stroke-width="4"/></pattern>
<pattern id="hy" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="9" fill="{YL}" fill-opacity=".7"/><path d="M0 0 V9" stroke="{YL}" stroke-width="4"/></pattern>
<pattern id="hb" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="9" fill="{BL}" fill-opacity=".7"/><path d="M0 0 V9" stroke="{BL}" stroke-width="4"/></pattern>
<filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1440"><feGaussianBlur stdDeviation="9"/></filter>
<pattern id="hp" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="9" fill="{PK}" fill-opacity=".6"/><path d="M0 0 V9" stroke="{PK}" stroke-width="4"/></pattern></defs>
{"" if wall else '<rect width="1080" height="1440" filter="url(#wall)"/>'}
<rect x="{BX0-8}" y="{BY0+16}" width="{BX1-BX0+16}" height="{BY1-BY0+70}" rx="10" fill="#000" opacity=".28" filter="url(#sh)"/>
<rect x="{BX0-28}" y="{BY0-28}" width="{BX1-BX0+56}" height="{BY1-BY0+56}" rx="12" fill="url(#oakv)"/>
<rect x="{BX0-28}" y="{BY0-28}" width="{BX1-BX0+56}" height="28" rx="12" fill="url(#oak)"/><g transform="translate(0 {BY0-28})">{wood if K["grain"] else ""}</g>
<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" fill="url(#slate)"/>
<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="6"/>{smudge}
<rect x="{BX0-40}" y="{BY1}" width="{BX1-BX0+80}" height="44" rx="6" fill="url(#oak)"/><rect x="{BX0-40}" y="{BY1}" width="{BX1-BX0+80}" height="6" fill="#E0BD92"/>
<g transform="translate(640 {BY1-8})"><rect width="92" height="14" rx="6" fill="{W_}"/><rect width="92" height="14" rx="6" fill="url(#stick)"/></g>
<g transform="translate(748 {BY1-7}) rotate(-4)"><rect width="56" height="13" rx="6" fill="{PK}"/><rect width="56" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(818 {BY1-8})"><rect width="44" height="13" rx="6" fill="{YL}"/><rect width="44" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(874 {BY1-7}) rotate(3)"><rect width="38" height="13" rx="6" fill="{LM}"/><rect width="38" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(150 {BY1-26})"><rect width="150" height="28" rx="5" fill="#C8B79A"/><rect y="22" width="150" height="10" rx="3" fill="#3E4642"/></g></svg>
<!--CHALK--><div class="chalk"><svg class="fx" width="1080" height="1440">{K["top"]()}{K["bottom"]()}{K.get("sides", lambda: "")()}{chalk_svg}</svg>{chalk_html}</div>
<div class="paper">{paper_html}</div><!--END--></body>'''
    if wall: doc = classroom(doc)
    return doc

def date_tag(x, y, right=True):
    side = f'right:{x}px' if right else f'left:{x}px'
    return f'<div class="tagd" style="{side};top:{y}px">{TOMORROW.month} 月 {TOMORROW.day} 日 星期{WD[TOMORROW.weekday()]} · 晴<small>值日：南伴球</small></div>'

def how(verb='报名'):
    return f'<div class="how">{verb}：浏览器打开 <b>{SITE}/g/</b> + 球局码<small>上一期 {LAST[0]} 局在找人，最后成了 {LAST[1]} 局。· 示意数据</small></div><div class="wm">南伴球<small>NANBANQIU</small></div>'


# ================= 主题皮肤（每周一换）=================
# 装饰只放在顶部带（y < 186）、底部带（y > 1268）和边框内侧，不碰内容区；都标 class="art"，压住文字会被出图检查拦下。
import math
def _g(x): return f'<g class="art">{x}</g>'
def _rng(seed): r = random.Random(seed); return r

def _leaf(x, y, L, ang, c, op=.45):
    a = math.radians(ang); ex, ey = x + L * math.cos(a), y + L * math.sin(a); nx, ny = -math.sin(a) * L * .28, math.cos(a) * L * .28
    mx, my = (x + ex) / 2, (y + ey) / 2
    return (f'<path d="M{x:.0f} {y:.0f} Q{mx+nx:.0f} {my+ny:.0f} {ex:.0f} {ey:.0f} Q{mx-nx:.0f} {my-ny:.0f} {x:.0f} {y:.0f}Z" fill="{c}" fill-opacity="{op}" stroke="{c}" stroke-width="2.6"/>'
            f'<path d="M{x:.0f} {y:.0f} L{ex:.0f} {ey:.0f}" stroke="{c}" stroke-width="1.6" opacity=".8"/>')

def _flower(x, y, r, c, core=YL):
    p = ''.join(f'<ellipse cx="{x + r*math.cos(math.radians(k*72)):.1f}" cy="{y + r*math.sin(math.radians(k*72)):.1f}" rx="{r*.75:.1f}" ry="{r*.5:.1f}" transform="rotate({k*72} {x + r*math.cos(math.radians(k*72)):.1f} {y + r*math.sin(math.radians(k*72)):.1f})" fill="{c}" fill-opacity=".5" stroke="{c}" stroke-width="2"/>' for k in range(5))
    return p + f'<circle cx="{x}" cy="{y}" r="{r*.45:.1f}" fill="{core}"/>'

def _star(x, y, s, c): return f'<path d="M{x} {y-s} Q{x+s*.18} {y-s*.18} {x+s} {y} Q{x+s*.18} {y+s*.18} {x} {y+s} Q{x-s*.18} {y+s*.18} {x-s} {y} Q{x-s*.18} {y-s*.18} {x} {y-s}Z" fill="{c}"/>'

def meadow_top():
    sun = f'<circle cx="118" cy="138" r="24" fill="{YL}" fill-opacity=".55" stroke="{YL}" stroke-width="3"/>' + ''.join(f'<path d="M{118+32*math.cos(math.radians(k*45)):.0f} {138+32*math.sin(math.radians(k*45)):.0f} l{12*math.cos(math.radians(k*45)):.0f} {12*math.sin(math.radians(k*45)):.0f}" stroke="{YL}" stroke-width="3" stroke-linecap="round"/>' for k in range(8))
    vine = f'<path d="M190 128 C 330 98, 430 168, 560 128 S 820 96, 1000 132" stroke="{LM}" stroke-width="3" fill="none" opacity=".8"/>'
    r = _rng(3); lv = ''.join(_leaf(x, 128 + 20 * math.sin(x / 70), r.randint(22, 32), r.choice((-60, -120, 60, 120)), r.choice((LM, '#8FD18B'))) for x in range(220, 1000, 52))
    fl = _flower(470, 140, 9, PK) + _flower(760, 112, 8, W_) + _flower(930, 128, 9, PK)
    return _g(sun + vine + lv + fl)
def meadow_bottom():
    r = _rng(9); g = ''.join(f'<path d="M{x} 1318 q{r.randint(-6,6)} -{r.randint(18,40)} {r.randint(-8,8)} -{r.randint(26,46)}" stroke="{r.choice((LM, "#8FD18B", "#6FBF73"))}" stroke-width="2.6" fill="none"/>' for x in range(70, 1012, 9))
    d = ''.join(_flower(x, 1290, 7, W_) for x in (120, 330, 560, 820, 960)) + ''.join(_flower(x, 1296, 6, PK) for x in (220, 690))
    return _g(g + d)

def night_top():
    pts = [(70 + i * 62, 112 + 46 * 4 * (i / 15) * (1 - i / 15)) for i in range(16)]
    wire = f'<path d="M70 112 Q 540 204 1010 112" stroke="{W_}" stroke-width="2" fill="none" opacity=".7"/>'
    bulbs = ''.join(f'<circle cx="{x:.0f}" cy="{y+14:.0f}" r="16" fill="{YL}" opacity=".18"/><ellipse cx="{x:.0f}" cy="{y+14:.0f}" rx="7" ry="9" fill="{YL}" fill-opacity=".7" stroke="{YL}" stroke-width="2"/><path d="M{x-4:.0f} {y+3:.0f} h8" stroke="{W_}" stroke-width="3"/>' for x, y in pts[1:-1])
    r = _rng(5); st = ''.join(_star(r.randint(90, 990), r.randint(98, 176), r.choice((5, 6, 8)), r.choice((W_, BL, YL))) for _ in range(9))
    moon = f'<path d="M972 104 a 26 26 0 1 0 22 40 a 20 20 0 1 1 -22 -40Z" fill="{YL}" fill-opacity=".6" stroke="{YL}" stroke-width="2.5"/>'
    return _g(wire + bulbs + st + moon)
def night_bottom():
    r = _rng(7); x = 70; sk = ''
    while x < 1010:
        w = r.randint(28, 60); h = r.randint(12, 40)
        sk += f'<rect x="{x}" y="{1318-h}" width="{w}" height="{h}" fill="none" stroke="{W_}" stroke-width="2" opacity=".55"/>' + ''.join(f'<rect x="{x+6+k*10}" y="{1318-h+6}" width="4" height="5" fill="{YL}" opacity=".7"/>' for k in range(max(1, (w-8)//10)) if r.random() < .5)
        x += w + r.randint(0, 6)
    spire = f'<path d="M700 1318 V1272 L710 1250 L720 1272 V1318" fill="none" stroke="{W_}" stroke-width="2.4" opacity=".7"/>'
    return _g(sk) + _g(spire)          # 尖塔单独一组：它最高，放在页脚文字之间的空档

def garden_corner(x, y, flip=1, vflip=1, seed=1):
    r = _rng(seed); out = ''
    for k in range(9):
        ang = (r.randint(-10, 80) if flip > 0 else r.randint(100, 190)) * (1 if vflip > 0 else -1)
        out += _leaf(x + flip * r.randint(0, 40), y + vflip * r.randint(0, 20), r.randint(40, 78), ang, r.choice((LM, '#7FC8A9', '#B9E07A', BL)), .4)
    out += _flower(x + flip * 70, y + vflip * 46, 11, PK) + _flower(x + flip * 120, y + vflip * 22, 8, W_) + _flower(x + flip * 30, y + vflip * 70, 7, YL, PK)
    return out
def garden_top(): return _g(garden_corner(76, 100, 1, 1, 2)) + _g(garden_corner(1004, 100, -1, 1, 4))
def garden_bottom():
    r = _rng(8); out = ''
    for x0, fl in ((76, 1), (1004, -1)):
        for k in range(7): out += _leaf(x0 + fl * r.randint(0, 120), 1314, r.randint(30, 50), (r.randint(-150, -100) if fl > 0 else r.randint(-80, -30)), r.choice((LM, '#7FC8A9', '#B9E07A')), .4)
        out += _flower(x0 + fl * 60, 1288, 8, PK) + _flower(x0 + fl * 150, 1296, 6, W_)
    return _g(out)

def doodle_top():
    plane = f'<path d="M110 168 C 200 100, 260 190, 340 132 S 420 110, 440 120" stroke="{W_}" stroke-width="2.4" fill="none" stroke-dasharray="5 8"/><g transform="translate(462 118) rotate(-14)"><path d="M0 0 L-44 -14 L-30 4Z M0 0 L-30 4 L-34 18Z" fill="none" stroke="{W_}" stroke-width="2.6" stroke-linejoin="round"/></g>'
    cloud = lambda x, y: f'<path d="M{x} {y} q -4 -22 18 -24 q 8 -20 30 -10 q 22 -8 26 14 q 18 4 10 20 Z" fill="none" stroke="{W_}" stroke-width="2.6" stroke-linejoin="round"/>'
    racket = f'<g transform="translate(860 140) rotate(40)"><ellipse rx="20" ry="27" fill="none" stroke="{W_}" stroke-width="2.6"/><path d="M0 27 V58" stroke="{W_}" stroke-width="4" stroke-linecap="round"/>{"".join(f"<path d='M{x} -24 V24' stroke='{W_}' stroke-width='1' opacity='.6'/>" for x in (-10, 0, 10))}</g><circle cx="914" cy="116" r="10" fill="none" stroke="{LM}" stroke-width="2.6"/>'
    return _g(plane + cloud(600, 150) + cloud(720, 120) + racket + _star(980, 150, 9, W_) + _star(540, 110, 6, LM))
def doodle_bottom():
    return _g(f'<path d="M80 1300 H1000" stroke="{W_}" stroke-width="2" stroke-dasharray="2 10" stroke-linecap="round" opacity=".7"/>' + ''.join(f'<path d="M{x} 1300 q -6 -14 -14 -16 M{x} 1300 q 6 -16 14 -18 M{x} 1300 v-20" stroke="{LM}" stroke-width="2.2" fill="none"/>' for x in (180, 420, 660, 900)))

RED, GOLD = '#E8735C', '#E9C46A'
def guofeng_top():
    cloud = lambda x, y, s: f'<g transform="translate({x} {y}) scale({s})" fill="none" stroke="{GOLD}" stroke-width="2.6" stroke-linecap="round"><path d="M0 0 c 0 -18 26 -18 26 0 c 0 -24 36 -24 36 0 c 0 -14 22 -14 22 2 M-6 8 H96"/><path d="M14 8 c 0 10 14 10 14 0" /></g>'
    lantern = lambda x, l: f'<path d="M{x} 92 V{92+l}" stroke="{GOLD}" stroke-width="2"/><ellipse cx="{x}" cy="{92+l+24}" rx="20" ry="24" fill="{RED}" fill-opacity=".55" stroke="{RED}" stroke-width="2.6"/><path d="M{x} {92+l} v48 M{x-12} {92+l+6} q-6 18 0 36 M{x+12} {92+l+6} q6 18 0 36" stroke="{GOLD}" stroke-width="1.6" fill="none"/><path d="M{x} {92+l+48} v14" stroke="{RED}" stroke-width="3"/>'
    branch = f'<path d="M1012 104 C 930 112, 880 150, 800 140 S 700 120, 660 132" stroke="#B58A6B" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M880 128 q -20 -18 -50 -20 M760 136 q 0 20 -24 30" stroke="#B58A6B" stroke-width="3" fill="none"/>' + ''.join(_flower(x, y, 7, PK, W_) for x, y in ((960, 112), (900, 140), (830, 108), (790, 150), (720, 128), (668, 132))) + ''.join(f'<circle cx="{x}" cy="{y}" r="3.4" fill="{PK}"/>' for x, y in ((940, 132), (852, 146), (744, 116)))
    return _g(lantern(118, 18) + lantern(196, 4)) + _g(cloud(300, 150, 1) + cloud(470, 124, .8)) + _g(branch)
def guofeng_bottom():
    return _g(''.join(f'<path d="M{x} 1306 c 20 -18 40 -18 60 0 s 40 18 60 0" stroke="{GOLD}" stroke-width="2.4" fill="none" opacity=".75"/>' for x in range(80, 960, 120)))

def vine_sides(c1=LM, c2='#7FC8A9', seed=11):
    r = _rng(seed); out = ''
    for x, fl in ((76, 1), (1004, -1)):
        for y0, y1 in ((200, 540), (1110, 1270)):
            seg = f'<path d="M{x} {y0} C {x+fl*10} {y0+(y1-y0)*.3:.0f}, {x-fl*8} {y0+(y1-y0)*.6:.0f}, {x} {y1}" stroke="{c1}" stroke-width="2.4" fill="none" opacity=".8"/>'
            for y in range(y0 + 16, y1, 34): seg += _leaf(x, y, r.randint(14, 18), (r.choice((-40, 40)) if fl > 0 else r.choice((140, 220))), r.choice((c1, c2)), .45)
            out += _g(seg)          # 每段单独一组，出图检查按各自的外框算
    return out

def seal():
    x, y = SEAL_AT[0]
    return _g(f'<g transform="translate({x} {y}) rotate(-6)"><rect width="76" height="76" rx="6" fill="{RED}" fill-opacity=".75" stroke="{RED}" stroke-width="3"/><text x="38" y="34" text-anchor="middle" font-family="{WK}" font-weight="700" font-size="26" fill="#F6EBDD">南伴</text><text x="38" y="64" text-anchor="middle" font-family="{WK}" font-weight="700" font-size="26" fill="#F6EBDD">球局</text></g>')

SKINS = {
  'fair':    dict(name='赶集', tmode='hatch',  board=('#36685A', '#2F5A4B', '#244A3D'), frame=('#C79A6A', '#B0814F', '#8E6339'), grain=True,  title=LM, top=bunting,      bottom=lambda: ''),
  'meadow':  dict(name='春日', tmode='hatch',  board=('#3A6E58', '#315F4C', '#264C3D'), frame=('#D4B48A', '#BE9566', '#9B7244'), grain=True,  title=YL, top=meadow_top,   bottom=meadow_bottom, sides=lambda: vine_sides(LM, '#8FD18B', 3),
                  css='.box{border-style:dashed!important;border-width:3px!important}'),
  'night':   dict(name='夜场', tmode='neon',   board=('#2E3533', '#252B2A', '#1A1F1E'), frame=('#C9CED1', '#9AA2A6', '#6E777B'), grain=False, title=YL, top=night_top,    bottom=night_bottom,
                  css='.box{border:6px double rgba(244,242,234,.75)!important;border-radius:6px!important}'),
  'garden':  dict(name='花园', tmode='multi',  board=('#356A5C', '#2D5B4F', '#224740'), frame=('#E2CCA8', '#CDB088', '#A8875F'), grain=True,  title=PK, top=garden_top,   bottom=garden_bottom, sides=lambda: vine_sides(PK, '#7FC8A9', 5),
                  css='.box{border:4px dotted rgba(245,163,181,.9)!important;border-radius:34px!important}'),
  'doodle':  dict(name='线描', tmode='hollow', board=('#2C3431', '#232A28', '#1A201E'), frame=('#3B3F3E', '#2A2D2C', '#1C1E1D'), grain=False, title=LM, top=doodle_top,   bottom=doodle_bottom,
                  css='.box{border:2.5px dashed rgba(244,242,234,.8)!important;border-radius:4px 30px 6px 24px!important}'),
  'guofeng': dict(name='国风', tmode='seal',   board=('#2F4A42', '#273F38', '#1D312B'), frame=('#7A4A30', '#653B24', '#4A2A18'), grain=True,  title=RED, top=guofeng_top, bottom=guofeng_bottom, sides=seal,
                  css='.box{border:3px solid rgba(233,196,106,.85)!important;border-radius:0!important;outline:1.5px solid rgba(233,196,106,.5);outline-offset:-12px} .tab{color:#E9C46A!important}'),
}
SKIN_ORDER = ['fair', 'meadow', 'night', 'garden', 'doodle', 'guofeng']
CONCEPT_BY_WEEKDAY = ['roll', 'seats', 'notes', 'roll', 'notes', 'seats', 'notes']   # 周一…周日（发帖当天）

def pick(day):
    """发帖日 → (皮肤, 创意)。皮肤按 ISO 周轮换（周一换），创意按星期轮换。"""
    import datetime as _d
    wk = day.isocalendar()[1]
    return SKIN_ORDER[wk % len(SKIN_ORDER)], CONCEPT_BY_WEEKDAY[day.weekday()]


# ================= 教室墙面场景（黑板挂在墙上）=================
SLOGANS = [('好好打球', '天天向上'), ('分秒必争', '一分不让'), ('团结友爱', '主动捡球')]
STICKERS = [('主动捡球', '是一种素养', '准时到场', '是一种习惯'), ('输球不摔拍', '是一种修养', '夸对手好球', '是一种风度'), ('先热身', '是一种智慧', '带新球', '是一种体面')]
WALL_PICK = [None]   # 指定第几句标语 / 墙贴（None = 按周轮换）
SC = .86; TX, TY = round((1080 - 1080 * SC) / 2), 150 - round(64 * .86)   # 黑板缩放后挂的位置（.86：最小 14 号字缩放后仍 ≥ 12 号——Chromium 中文最小字号）

def _clock(cx, cy, r, hh, mm):
    ticks = ''.join(f'<path d="M{cx+(r-6)*math.sin(math.radians(k*30)):.1f} {cy-(r-6)*math.cos(math.radians(k*30)):.1f} L{cx+(r-(14 if k%3==0 else 10))*math.sin(math.radians(k*30)):.1f} {cy-(r-(14 if k%3==0 else 10))*math.cos(math.radians(k*30)):.1f}" stroke="#222" stroke-width="{3 if k%3==0 else 1.6}"/>' for k in range(12))
    nums = ''.join(f'<text x="{cx+(r-26)*math.sin(math.radians(n*30)):.1f}" y="{cy-(r-26)*math.cos(math.radians(n*30))+7:.1f}" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="17" fill="#222">{n}</text>' for n in (12, 3, 6, 9))
    ha = (hh % 12 + mm / 60) * 30; ma = mm * 6
    hand = lambda a, L, w: f'<path d="M{cx} {cy} L{cx+L*math.sin(math.radians(a)):.1f} {cy-L*math.cos(math.radians(a)):.1f}" stroke="#1A1A1A" stroke-width="{w}" stroke-linecap="round"/>'
    return (f'<circle cx="{cx+3}" cy="{cy+5}" r="{r+6}" fill="#000" opacity=".18" filter="url(#wsh)"/><circle cx="{cx}" cy="{cy}" r="{r+6}" fill="#3A3A3A"/><circle cx="{cx}" cy="{cy}" r="{r}" fill="#FBFAF6"/>'
            + ticks + nums + hand(ha, r * .5, 6) + hand(ma, r * .75, 3.5) + f'<path d="M{cx} {cy+14} L{cx} {cy-r*.8:.0f}" stroke="#D3262E" stroke-width="1.6" transform="rotate(200 {cx} {cy})"/><circle cx="{cx}" cy="{cy}" r="5" fill="#D3262E"/>')

def classroom(doc):
    """把 framed 出来的整页改成「教室墙」：黑板缩放挂在中间，上面标语 + 挂钟，下面墙贴 + 书架。"""
    import datetime
    wk = TOMORROW.isocalendar()[1]; i = WALL_PICK[0] if WALL_PICK[0] is not None else wk; a, b = SLOGANS[i % len(SLOGANS)]; st = STICKERS[i % len(STICKERS)]
    first = '07:30'
    try:
        from timetable import GAMES; first = min(g[0] for g in GAMES)
    except Exception: pass
    hh, mm = int(first[:2]), int(first[3:])
    cards = lambda t: ''.join(f'<i>{ch}</i>' for ch in t)
    cols = ['#E4572E', '#F2A541', '#3BA55C', '#2E86DE', '#9B59B6', '#E84393', '#16A085']
    color_txt = lambda t, o: ''.join(f'<b style="color:{cols[(i+o) % len(cols)]}">{ch}</b>' for i, ch in enumerate(t))
    r = _rng(wk); books = ''; x = 0
    while x < 1080:
        w = r.randint(16, 30); h = r.randint(66, 98); c = r.choice(['#C0392B', '#2E86DE', '#F1C40F', '#27AE60', '#8E44AD', '#E67E22', '#ECF0F1', '#34495E', '#D35400', '#16A085'])
        books += f'<rect x="{x}" y="{1440-h}" width="{w-2}" height="{h}" fill="{c}"/><rect x="{x+3}" y="{1440-h+10}" width="{w-8}" height="5" fill="#fff" opacity=".45"/>'
        x += w
        if r.random() < .08: x += 26
    shelf = (f'<rect x="0" y="1326" width="1080" height="114" fill="#E9E4DA"/>{books}'
             + ''.join(f'<rect x="{x}" y="1326" width="10" height="114" fill="#D9D2C4"/>' for x in range(0, 1081, 216))
             + '<rect x="0" y="1320" width="1080" height="12" fill="#D5CCBB"/><rect x="0" y="1320" width="1080" height="3" fill="#fff" opacity=".6"/>')
    wall = f'''<svg style="position:absolute;left:0;top:0" width="1080" height="1440"><defs><filter id="wsh" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1440"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="wall2"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .35  0 0 0 0 .3  0 0 0 .1 0"/></filter></defs>
<rect width="1080" height="1440" filter="url(#wall2)"/>{_clock(540, 92, 50, hh, mm)}{shelf}</svg>
<div class="slog l">{cards(a)}</div><div class="slog r">{cards(b)}</div>
<div class="stk"><span>{color_txt(st[0], 0)}<em>{st[1]}</em></span><span>{color_txt(st[2], 3)}<em>{st[3]}</em></span></div>'''
    css = f'''<style>.stage{{position:absolute;left:0;top:0;width:1080px;height:1440px;transform:translate({TX}px,{TY}px) scale({SC});transform-origin:0 0}}
.slog{{position:absolute;top:44px;display:flex;gap:10px}} .slog.l{{left:34px}} .slog.r{{right:34px}}
.slog i{{width:94px;height:94px;display:flex;align-items:center;justify-content:center;font-style:normal;font-family:{SERIF};font-weight:900;font-size:62px;color:#D3262E;background:#FFFDF8;border:2px solid #E7DED0;box-shadow:0 4px 8px rgba(0,0,0,.15)}}
.stk{{position:absolute;left:0;right:0;top:1272px;display:flex;justify-content:center;gap:56px;font-family:{SANS};font-size:28px}}
.stk b{{font-weight:900}} .stk em{{font-style:normal;color:#6B6458;font-size:22px;margin-left:8px}}</style>'''
    doc = doc.replace('<!--CHALK-->', '').replace('</body>', '')
    head, _, rest = doc.partition('<body>')
    body_svg_start = rest.index('<svg class="fx"')
    inner = rest[body_svg_start:].replace('<!--END-->', '')
    return head + css + '<body>' + wall + '<div class="stage">' + inner + '</div></body>'
