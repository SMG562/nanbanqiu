"""明日球局 · 「黑板报」挂板版：墙上挂一块带原木框和粉笔槽的墨绿黑板，顶部粉笔彩旗；
大标题「体育课。」彩色粉笔描边；右上方彩色粉笔画的球拍和网球（排线上色 + 高光 + 速度线 + 星星）；
下半部分一个「明日课表」框，上午 / 下午两栏。"""
import random, math
from chalkbase import FONT_DIR, WK, CN
from common import *
from timetable import GAMES, spots, level_word
EXPECT = lambda: [f'{spots()}', '个空位', '7Kq2', '体育课']
HEADLINE = lambda: (str(spots()), '.kn')
W_, LM, PK, YL, BL = '#F4F2EA', '#D4F25A', '#F5A3B5', '#F6DB6E', '#9ED3F0'
BX0, BY0, BX1, BY1 = 64, 92, 1016, 1318          # 黑板内框

def need(g): return CAP[g[4]] - g[7]

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
            out += ''.join(f'<path d="M{ax+10+k*9:.0f} {ay+4+k*.5:.0f} l{8:.0f} {22-k*3:.0f}" stroke="{c}" stroke-width="1.6" opacity=".6"/>' for k in range(4))
    return out

def hero():
    cx, cy, r = 818, 334, 92
    hatch = f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#hl)" opacity=".8"/>'          # 排线用纹理填，外框和看到的一致
    racket = f'''<g transform="translate(922 300) rotate(32) scale(.84)">
 <clipPath id="rh"><ellipse rx="86" ry="116"/></clipPath>
 <g clip-path="url(#rh)" stroke="{W_}" stroke-width="1.6" opacity=".55">{''.join(f'<path d="M{x} -130 V130"/>' for x in range(-80, 90, 16))}{''.join(f'<path d="M-100 {y} H100"/>' for y in range(-110, 120, 16))}</g>
 <ellipse rx="86" ry="116" fill="none" stroke="{PK}" stroke-width="9"/><ellipse rx="86" ry="116" fill="none" stroke="{W_}" stroke-width="2" opacity=".6" transform="scale(.93)"/>
 <path d="M-30 110 L-12 168 M30 110 L12 168" stroke="{PK}" stroke-width="7" stroke-linecap="round"/>
 <rect x="-14" y="166" width="28" height="118" rx="10" fill="{BL}" fill-opacity=".5" stroke="{BL}" stroke-width="3"/>
 {''.join(f'<path d="M-14 {176+k*20} l28 12" stroke="{W_}" stroke-width="2" opacity=".7"/>' for k in range(5))}</g>'''
    ball = f'''<defs><clipPath id="bc"><circle cx="{cx}" cy="{cy}" r="{r}"/></clipPath>
 <radialGradient id="bs" cx="35%" cy="30%" r="75%"><stop offset=".55" stop-color="#1F3D33" stop-opacity="0"/><stop offset="1" stop-color="#1F3D33" stop-opacity=".55"/></radialGradient></defs>
<ellipse cx="{cx+10}" cy="{cy+r+18}" rx="{r*.85:.0f}" ry="14" fill="{W_}" opacity=".18"/>
<circle cx="{cx}" cy="{cy}" r="{r}" fill="{LM}" fill-opacity=".42"/><g clip-path="url(#bc)">{hatch}<circle cx="{cx}" cy="{cy}" r="{r}" fill="url(#bs)"/>
 <path d="M{cx-62} {cy-80} C {cx-18} {cy-36}, {cx-18} {cy+36}, {cx-62} {cy+80} M{cx+62} {cy-80} C {cx+18} {cy-36}, {cx+18} {cy+36}, {cx+62} {cy+80}" stroke="{W_}" stroke-width="9" fill="none" stroke-linecap="round" transform="rotate(-24 {cx} {cy})"/></g>
<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{YL}" stroke-width="4"/>
<path d="M{cx-58} {cy-44} A {r-22} {r-22} 0 0 1 {cx-20} {cy-72}" stroke="{W_}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".85"/>'''
    streaks = ''.join(f'<path d="M{cx-r+14-k*4} {cy-62+k*18} l{-L*.62:.0f} {-L*.78:.0f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round"/>' for k, L, c, w in ((0, 90, YL, 5), (1, 120, W_, 3.5), (2, 70, YL, 3)))
    star = lambda x, y, s, c: f'<path d="M{x} {y-s} Q{x+s*.18} {y-s*.18} {x+s} {y} Q{x+s*.18} {y+s*.18} {x} {y+s} Q{x-s*.18} {y+s*.18} {x-s} {y} Q{x-s*.18} {y-s*.18} {x} {y-s}Z" fill="{c}"/>'
    stars = star(620, 214, 13, BL) + star(975, 486, 10, YL) + star(740, 470, 7, W_)
    return f'<g class="art">{racket}</g><g class="art">{streaks}</g><g class="art">{ball}</g>{stars}'

def html():
    random.seed(7)
    col = lambda gs: ''.join(f'''<div class="it"><b class="t">{g[0]}</b><div class="v"><b>{esc(g[2])}</b><s>{esc(g[3])} · {TYPE[g[4]]} · {level_word(g[5], g[6])}</s>
<div class="sp">{''.join('<i class="on"></i>' if k >= g[7] else '<i></i>' for k in range(CAP[g[4]]))}<em>{"最后 1 位" if need(g) == 1 else f"缺 {need(g)} 位"}</em><u>{g[9]}</u></div></div></div>''' for g in gs)
    am = [g for g in GAMES if int(g[0][:2]) < 12]; pm = [g for g in GAMES if int(g[0][:2]) >= 12]
    wood = ''.join(f'<path d="M{x} 0 q 30 {random.randint(-6,6)} 60 0 t 60 0" stroke="#7A5233" stroke-opacity=".25" fill="none"/>' for x in range(0, 1080, 120))
    smudge = ''.join(f'<ellipse cx="{random.randint(BX0,BX1)}" cy="{random.randint(BY0,BY1)}" rx="{random.randint(120,320)}" ry="{random.randint(30,90)}" fill="#fff" opacity="{random.uniform(.015,.035):.3f}" filter="url(#bl)"/>' for _ in range(12))
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em,i,u{{text-decoration:none;font-style:normal}}
body{{width:1080px;height:1440px;overflow:hidden;position:relative;font-family:{WK};color:{W_};background:linear-gradient(180deg,#EFE9DE,#E4DCCD)}}
.fx{{position:absolute;inset:0}} .chalk{{position:absolute;inset:0;filter:url(#chalk)}}
.date{{position:absolute;right:130px;top:550px;font-size:21px;padding:0 14px;background:#2F5A4B;letter-spacing:2px}} .date small{{font-size:18px;opacity:.7;margin-left:10px}}
.pre{{position:absolute;left:96px;top:196px;font-size:58px;font-weight:700;letter-spacing:4px}}
.sub{{position:absolute;left:100px;top:478px;font-size:34px;letter-spacing:2px}} .kn{{color:{LM};font-size:48px;font-weight:700;padding:0 4px}}
.box{{position:absolute;left:96px;right:96px;top:566px;height:584px;border:3px solid rgba(244,242,234,.85);border-radius:26px}}
.tab{{position:absolute;left:36px;top:-24px;padding:0 18px;font-size:30px;font-weight:700;background:#2F5A4B;color:{YL};letter-spacing:6px}}
.cols{{position:absolute;inset:34px 30px 18px;display:grid;grid-template-columns:1fr 1fr;gap:0 40px}}
.cols>div{{position:relative}} .cols>div+div::before{{content:'';position:absolute;left:-21px;top:6px;bottom:6px;border-left:2px dashed rgba(244,242,234,.35)}}
.ch{{font-size:20px;letter-spacing:8px;color:{PK};margin-bottom:6px}}
.it{{display:grid;grid-template-columns:116px 1fr;padding:17px 0 19px;border-bottom:1.5px solid rgba(244,242,234,.16)}} .it:last-child{{border:0}}
.t{{font-size:38px;line-height:1.1}} .v b{{display:block;font-size:27px;white-space:nowrap}} .v s{{display:block;font-size:16px;opacity:.65;margin-top:2px;white-space:nowrap}}
.sp{{display:flex;align-items:center;gap:7px;margin-top:8px}} .sp i{{width:15px;height:15px;border-radius:50%;background:rgba(244,242,234,.5)}} .sp i.on{{background:none;border:2.4px solid {LM}}}
.sp em{{color:{LM};font-size:20px;margin-left:6px}} .sp u{{margin-left:auto;font-size:20px;opacity:.85;letter-spacing:1px}}
.how{{position:absolute;left:100px;top:1196px;font-size:26px}} .how b{{color:{LM}}} .how small{{display:block;font-size:18px;opacity:.6;margin-top:4px}}
.wm{{position:absolute;right:100px;top:1192px;text-align:right;font-weight:700;font-size:36px;letter-spacing:9px}} .wm small{{display:block;font-weight:400;font-size:13px;letter-spacing:4px;opacity:.55}}
.iss{{position:absolute;left:372px;top:236px;font-size:17px;letter-spacing:5px;opacity:.6}}
.demo{{position:absolute;right:100px;top:1276px;font-size:13px;letter-spacing:4px;opacity:.45}}
</style><body>
<svg class="fx" width="1080" height="1440"><defs>
<filter id="chalk" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="2" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3 0 0 0 2.55" result="holes"/>
 <feComposite in="SourceGraphic" in2="holes" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="w"/>
 <feDisplacementMap in="c" in2="w" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".35"/></filter>
<filter id="bl" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1480" height="1840"><feGaussianBlur stdDeviation="36"/></filter>
<filter id="sh" filterUnits="userSpaceOnUse" x="-100" y="-100" width="1280" height="1640"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="wall"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .35  0 0 0 0 .3  0 0 0 .12 0"/></filter>
<linearGradient id="oak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C79A6A"/><stop offset=".5" stop-color="#B0814F"/><stop offset="1" stop-color="#8E6339"/></linearGradient>
<linearGradient id="oakv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C79A6A"/><stop offset=".5" stop-color="#B0814F"/><stop offset="1" stop-color="#9A6D41"/></linearGradient>
<radialGradient id="slate" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#36685A"/><stop offset=".6" stop-color="#2F5A4B"/><stop offset="1" stop-color="#244A3D"/></radialGradient>
<linearGradient id="stick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient>
<pattern id="hl" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="9" fill="{LM}" fill-opacity=".7"/><path d="M0 0 V9" stroke="{LM}" stroke-width="4"/></pattern></defs>
<rect width="1080" height="1440" filter="url(#wall)"/>
<rect x="{BX0-8}" y="{BY0+16}" width="{BX1-BX0+16}" height="{BY1-BY0+70}" rx="10" fill="#000" opacity=".28" filter="url(#sh)"/>
<rect x="{BX0-28}" y="{BY0-28}" width="{BX1-BX0+56}" height="{BY1-BY0+56}" rx="12" fill="url(#oakv)"/>
<rect x="{BX0-28}" y="{BY0-28}" width="{BX1-BX0+56}" height="28" rx="12" fill="url(#oak)"/>
<g transform="translate(0 {BY0-28})">{wood}</g>
<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" fill="url(#slate)"/>
<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="6"/>
{smudge}
<rect x="{BX0-40}" y="{BY1}" width="{BX1-BX0+80}" height="44" rx="6" fill="url(#oak)"/><rect x="{BX0-40}" y="{BY1}" width="{BX1-BX0+80}" height="6" fill="#E0BD92"/>
<g transform="translate(640 {BY1-8})"><rect width="92" height="14" rx="6" fill="{W_}"/><rect width="92" height="14" rx="6" fill="url(#stick)"/></g>
<g transform="translate(748 {BY1-7}) rotate(-4)"><rect width="56" height="13" rx="6" fill="{PK}"/><rect width="56" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(818 {BY1-8})"><rect width="44" height="13" rx="6" fill="{YL}"/><rect width="44" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(874 {BY1-7}) rotate(3)"><rect width="38" height="13" rx="6" fill="{LM}"/><rect width="38" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(150 {BY1-26})"><rect width="150" height="28" rx="5" fill="#C8B79A"/><rect y="22" width="150" height="10" rx="3" fill="#3E4642"/></g>
</svg>
<div class="chalk"><svg class="fx" width="1080" height="1440"><g class="art">{bunting()}</g>{hero()}
<text x="90" y="430" font-family="{WK}" font-weight="700" font-size="156" letter-spacing="8" fill="url(#hl)" stroke="{W_}" stroke-width="11" stroke-linejoin="round" paint-order="stroke">体育课。</text></svg>
<div class="demo">示意数据</div>

<div class="pre">明天，有</div><div class="iss">第 {ISSUE} 期</div>
<div class="sub">墨尔本还有 <span class="kn">{spots()}</span> 个空位，自愿报名。</div>
<div class="box" style="z-index:0"><div class="tab">明日课表</div><div class="cols"><div><div class="ch">上 午</div>{col(am)}</div><div><div class="ch">下午 · 晚上</div>{col(pm)}</div></div></div>
<div class="date" style="z-index:1">{TOMORROW.month} 月 {TOMORROW.day} 日 星期{WD[TOMORROW.weekday()]} · 晴<small>值日：南伴球</small></div>
<div class="how">报名：浏览器打开 <b>{SITE}/g/</b> + 球局码<small>上一期 {LAST[0]} 局在找人，最后成了 {LAST[1]} 局。</small></div>
<div class="wm">南伴球<small>NANBANQIU</small></div></div></body>'''
