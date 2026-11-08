"""立式小黑板（挂板）共用底子：墙面 + 原木框 + 墨绿黑板 + 粉笔槽（粉笔、板擦）+ 可选粉笔彩旗 + 粉笔颗粒滤镜。
framed(chalk_svg, chalk_html, css, paper_html='')：chalk_* 走粉笔滤镜；paper_html 是贴在黑板上的实物（纸条等），不走滤镜。"""
import random
from chalkbase import FONT_DIR, WK
from common import *
W_, LM, PK, YL, BL = '#F4F2EA', '#D4F25A', '#F5A3B5', '#F6DB6E', '#9ED3F0'
SLATE = '#2F5A4B'
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
    return f'<text x="{x}" y="{y}" font-family="{WK}" font-weight="700" font-size="{size}" letter-spacing="6" fill="{fill}" stroke="{stroke}" stroke-width="{size*.068:.1f}" stroke-linejoin="round" paint-order="stroke">{text}</text>'

def framed(chalk_svg, chalk_html, css='', paper_html='', seed=7):
    random.seed(seed)
    wood = ''.join(f'<path d="M{x} 0 q 30 {random.randint(-6,6)} 60 0 t 60 0" stroke="#7A5233" stroke-opacity=".25" fill="none"/>' for x in range(0, 1080, 120))
    smudge = ''.join(f'<ellipse cx="{random.randint(BX0,BX1)}" cy="{random.randint(BY0,BY1)}" rx="{random.randint(120,320)}" ry="{random.randint(30,90)}" fill="#fff" opacity="{random.uniform(.015,.035):.3f}" filter="url(#bl)"/>' for _ in range(12))
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em,i,u{{text-decoration:none;font-style:normal}}
body{{width:1080px;height:1440px;overflow:hidden;position:relative;font-family:{WK};color:{W_};background:linear-gradient(180deg,#EFE9DE,#E4DCCD)}}
.fx{{position:absolute;inset:0}} .chalk{{position:absolute;inset:0;filter:url(#chalk)}} .paper{{position:absolute;inset:0}}
.lime{{color:{LM}}} .pink{{color:{PK}}}
.how{{position:absolute;left:100px;top:1200px;font-size:26px}} .how b{{color:{LM}}} .how small{{display:block;font-size:18px;opacity:.6;margin-top:4px}}
.wm{{position:absolute;right:100px;top:1196px;text-align:right;font-weight:700;font-size:36px;letter-spacing:9px}} .wm small{{display:block;font-weight:400;font-size:13px;letter-spacing:4px;opacity:.55}}
.demo{{position:absolute;right:100px;top:1278px;font-size:13px;letter-spacing:4px;opacity:.45}}
.tagd{{position:absolute;font-size:21px;padding:0 14px;background:{SLATE};letter-spacing:2px}} .tagd small{{font-size:18px;opacity:.7;margin-left:10px}}
{css}
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
<radialGradient id="slate" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#36685A"/><stop offset=".6" stop-color="{SLATE}"/><stop offset="1" stop-color="#244A3D"/></radialGradient>
<linearGradient id="stick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#000" stop-opacity=".15"/></linearGradient>
<pattern id="hl" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="9" fill="{LM}" fill-opacity=".7"/><path d="M0 0 V9" stroke="{LM}" stroke-width="4"/></pattern>
<pattern id="hp" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="9" height="9" fill="{PK}" fill-opacity=".6"/><path d="M0 0 V9" stroke="{PK}" stroke-width="4"/></pattern></defs>
<rect width="1080" height="1440" filter="url(#wall)"/>
<rect x="{BX0-8}" y="{BY0+16}" width="{BX1-BX0+16}" height="{BY1-BY0+70}" rx="10" fill="#000" opacity=".28" filter="url(#sh)"/>
<rect x="{BX0-28}" y="{BY0-28}" width="{BX1-BX0+56}" height="{BY1-BY0+56}" rx="12" fill="url(#oakv)"/>
<rect x="{BX0-28}" y="{BY0-28}" width="{BX1-BX0+56}" height="28" rx="12" fill="url(#oak)"/><g transform="translate(0 {BY0-28})">{wood}</g>
<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" fill="url(#slate)"/>
<rect x="{BX0}" y="{BY0}" width="{BX1-BX0}" height="{BY1-BY0}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="6"/>{smudge}
<rect x="{BX0-40}" y="{BY1}" width="{BX1-BX0+80}" height="44" rx="6" fill="url(#oak)"/><rect x="{BX0-40}" y="{BY1}" width="{BX1-BX0+80}" height="6" fill="#E0BD92"/>
<g transform="translate(640 {BY1-8})"><rect width="92" height="14" rx="6" fill="{W_}"/><rect width="92" height="14" rx="6" fill="url(#stick)"/></g>
<g transform="translate(748 {BY1-7}) rotate(-4)"><rect width="56" height="13" rx="6" fill="{PK}"/><rect width="56" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(818 {BY1-8})"><rect width="44" height="13" rx="6" fill="{YL}"/><rect width="44" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(874 {BY1-7}) rotate(3)"><rect width="38" height="13" rx="6" fill="{LM}"/><rect width="38" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(150 {BY1-26})"><rect width="150" height="28" rx="5" fill="#C8B79A"/><rect y="22" width="150" height="10" rx="3" fill="#3E4642"/></g></svg>
<div class="chalk"><svg class="fx" width="1080" height="1440">{chalk_svg}</svg>{chalk_html}<div class="demo">示意数据</div></div>
<div class="paper">{paper_html}</div></body>'''

def date_tag(x, y, right=True):
    side = f'right:{x}px' if right else f'left:{x}px'
    return f'<div class="tagd" style="{side};top:{y}px">{TOMORROW.month} 月 {TOMORROW.day} 日 星期{WD[TOMORROW.weekday()]} · 晴<small>值日：南伴球</small></div>'

def how(verb='报名'):
    return f'<div class="how">{verb}：浏览器打开 <b>{SITE}/g/</b> + 球局码<small>上一期 {LAST[0]} 局在找人，最后成了 {LAST[1]} 局。</small></div><div class="wm">南伴球<small>NANBANQIU</small></div>'
