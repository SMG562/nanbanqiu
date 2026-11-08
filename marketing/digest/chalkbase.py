"""黑板底子（几版黑板报共用）：石板色、擦痕、粉笔灰、上节课残影、金属粉笔槽、粉笔颗粒滤镜、霞鹜文楷。"""
import os, random
from common import *
FONT_DIR = os.environ.get('DIGEST_FONTS', '/tmp/digest_fonts')
WK = "'LXGW WenKai',serif"
WHITE, LIME, PINK, BLUE = '#F1F0E8', '#D4F25A', '#F5B8C4', '#A9D8F0'
CN = '一二三四五六七八九十'
CIRC = '①②③④⑤⑥⑦⑧⑨⑩'

def date_block():
    return f'<div class="date">{TOMORROW.month} 月 {TOMORROW.day} 日　星期{WD[TOMORROW.weekday()]}<br><i>晴</i> 22°C　微风<small>值日：南伴球</small></div>'

def board(body, css='', seed=11, ghosts=(('15 · 30 · 40', 700, 520, 44, -6), ('Deuce', 90, 1250, 38, 4))):
    random.seed(seed)
    smudge = ''.join(f'<ellipse cx="{random.randint(0,1080)}" cy="{random.randint(0,1340)}" rx="{random.randint(120,380)}" ry="{random.randint(40,120)}" fill="#fff" opacity="{random.uniform(.012,.035):.3f}" transform="rotate({random.randint(-20,20)})" filter="url(#bl)"/>' for _ in range(16))
    swipes = ''.join(f'<path d="M{random.randint(40,700)} {random.randint(200,1250)} q 160 -50 330 6" stroke="#fff" stroke-width="{random.randint(40,70)}" stroke-linecap="round" fill="none" opacity="{random.uniform(.018,.04):.3f}" filter="url(#bl2)"/>' for _ in range(5))
    ghost = ''.join(f'<text x="{x}" y="{y}" font-size="{s}" transform="rotate({r} {x} {y})">{t}</text>' for t, x, y, s, r in ghosts)
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em,i{{text-decoration:none;font-style:normal}}
body{{width:1080px;height:1440px;overflow:hidden;position:relative;font-family:{WK};color:{WHITE};background:radial-gradient(90% 70% at 50% 42%, #2C3B34 0%, #23312B 55%, #18221E 100%)}}
.fx{{position:absolute;inset:0}} .chalk{{filter:url(#chalk);position:absolute;inset:0}} .lime{{color:{LIME}}} .pink{{color:{PINK}}}
.top{{position:absolute;left:84px;top:70px;font-size:20px;letter-spacing:6px;opacity:.75}}
.demo{{position:absolute;left:84px;top:104px;font-size:14px;letter-spacing:4px;opacity:.4}}
.date{{position:absolute;right:84px;top:62px;text-align:right;font-size:26px;line-height:1.55}} .date i{{color:{BLUE}}} .date small{{display:block;font-size:20px;opacity:.75;margin-top:2px}}
.wm{{position:absolute;right:84px;bottom:150px;text-align:right;font-weight:700;font-size:40px;letter-spacing:10px}} .wm small{{display:block;font-weight:400;font-size:15px;letter-spacing:4px;opacity:.55;margin-top:2px}}
{css}
</style><body>
<svg class="fx" width="1080" height="1440"><defs>
<filter id="chalk" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="2" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3 0 0 0 2.55" result="holes"/>
 <feComposite in="SourceGraphic" in2="holes" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="w"/>
 <feDisplacementMap in="c" in2="w" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".35"/></filter>
<filter id="bl" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1480" height="1840"><feGaussianBlur stdDeviation="40"/></filter>
<filter id="bl2" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1480" height="1840"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="bl1" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1440"><feGaussianBlur stdDeviation="1.4"/></filter>
<filter id="dust"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="9"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.4 1.25"/></filter>
<linearGradient id="tray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9AA19E"/><stop offset=".25" stop-color="#C9CECB"/><stop offset=".6" stop-color="#7E8582"/><stop offset="1" stop-color="#4B514E"/></linearGradient>
<linearGradient id="stick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient></defs>
{smudge}{swipes}<g font-family="{WK}" fill="#fff" opacity=".05" filter="url(#bl1)">{ghost}</g>
<rect width="1080" height="1440" filter="url(#dust)" opacity=".05"/>
<rect x="0" y="1356" width="1080" height="84" fill="#141B18"/>
<rect x="0" y="1348" width="1080" height="34" fill="url(#tray)"/><rect x="0" y="1348" width="1080" height="2" fill="#E8ECEA" opacity=".6"/>
<g transform="translate(700 1340)"><rect y="-2" width="96" height="14" rx="6" fill="{WHITE}"/><rect y="-2" width="96" height="14" rx="6" fill="url(#stick)"/></g>
<g transform="translate(812 1342) rotate(-3)"><rect y="-2" width="58" height="13" rx="6" fill="{LIME}"/><rect y="-2" width="58" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(884 1340)"><rect y="-2" width="40" height="13" rx="6" fill="{PINK}"/><rect y="-2" width="40" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(120 1316)"><rect width="150" height="30" rx="5" fill="#C8B79A"/><rect y="24" width="150" height="10" rx="3" fill="#3E4642"/><rect y="20" width="150" height="5" fill="#fff" opacity=".25"/></g>
<ellipse cx="560" cy="1354" rx="200" ry="5" fill="#fff" opacity=".18" filter="url(#bl2)"/></svg>
<div class="chalk"><div class="demo">示意数据</div>{body}</div></body>'''
