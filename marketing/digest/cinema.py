"""明日球局 · 「电影镜头」版：从教室后排看后墙上的黑板报。
竖版 3:4 电影构图：上——标语 + 挂钟（下午 4:50，快放学）；中——横版墨绿黑板（铝框、粉笔槽，镜头略侧拍）+ 绿色墙裙；
光——左侧窗外低角度夕阳，窗格影子斜落在墙和黑板上，光柱里有浮尘；前景——虚化的课桌椅、挂着网球拍的书包、桌角一颗网球；
调色——暖高光 / 青暗部 + 暗角 + 胶片颗粒；底部电影字幕「放学别走，球场见。」"""
import random, math
from chalkbase import FONT_DIR, WK
from common import *
from timetable import GAMES, spots, level_word
EXPECT = lambda: ['还有谁', f'{spots()}', '7Kq2', '放学别走']
HEADLINE = lambda: (str(spots()), '.kn')
W_, LM, PK, YL, BL = '#F4F2EA', '#D4F25A', '#F5A3B5', '#F6DB6E', '#9ED3F0'

def need(g): return CAP[g[4]] - g[7]

def board_html():
    random.seed(4); rows = ''
    groups = [('上 午', [g for g in GAMES if int(g[0][:2]) < 12]), ('下 午', [g for g in GAMES if 12 <= int(g[0][:2]) < 17]), ('放学别走', [g for g in GAMES if int(g[0][:2]) >= 17])]
    for label, gs in groups:
        rows += f'<div class="grp {"pink" if label == "放学别走" else ""}">{label}</div>'
        for g in gs:
            cells = ''.join((f'<i class="got" style="color:{random.choice([W_, W_, PK, BL])}"><span style="transform:rotate({random.randint(-12,12)}deg)">到</span></i>' if k < g[7] else '<i class="open"></i>') for k in range(CAP[g[4]]))
            rows += f'<div class="row"><b class="t">{g[0]}</b><div class="v"><b>{esc(g[2])}</b><s>{esc(g[3])} · {TYPE[g[4]]} · {level_word(g[5], g[6])} · {g[9]}</s></div><div class="cells">{cells}</div><b class="n">缺 {need(g)}</b></div>'
    return f'''<div class="board"><div class="chalk">
<div class="iss">明天点名 · 墨尔本班 · 第 {ISSUE} 期</div>
<h1>还有谁<br><em>没到？</em></h1>
<div class="sub">明天 {len(GAMES)} 节课，<br><span class="kn">{spots()}</span> 个位置还没人喊「到」。</div>
<div class="date">{TOMORROW.month} 月 {TOMORROW.day} 日 星期{WD[TOMORROW.weekday()]} · 晴<br>值日：南伴球</div>
<div class="how">喊到：浏览器打开<br><b>{SITE}/g/</b> + 球局码</div>
<div class="roll"><div class="tab">点名册</div>{rows}</div></div>
<div class="tray"><i style="left:520px;width:70px"></i><i style="left:610px;width:44px;background:{PK}"></i><i style="left:672px;width:36px;background:{YL}"></i><u></u></div></div>'''

def html():
    r = random.Random(9)
    # 浮尘：集中在光柱里
    dust = ''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r.choice((1,1.3,1.6,2,2.6))}" fill="#FFF3D6" opacity="{r.uniform(.25,.8):.2f}"/>'
                   for x, y in ((lambda t, u: (20 + t * 380 + u * 70, 40 + t * 680 + u * 40))(r.random(), r.uniform(-1, 1)) for _ in range(110)))
    # 前景：虚化的课桌椅（两排）、书包 + 球拍、桌角网球
    desks = ''
    for (x, y, w, h, c) in ((-80, 1180, 640, 56, '#4A3829'), (600, 1196, 600, 56, '#4A3829'), (60, 1330, 620, 80, '#2E241B'), (720, 1340, 520, 80, '#2E241B')):
        desks += f'<path d="M{x} {y} L{x+w} {y} L{x+w+34} {y+h} L{x-34} {y+h}Z" fill="{c}"/><path d="M{x} {y} L{x+w} {y}" stroke="#E8B77A" stroke-width="3" opacity=".55"/>'
        desks += f'<path d="M{x-34} {y+h} L{x+w+34} {y+h} L{x+w+34} {y+h+14} L{x-34} {y+h+14}Z" fill="#1E1812"/><rect x="{x+16}" y="{y+h+14}" width="13" height="220" fill="#16181A"/><rect x="{x+w-30}" y="{y+h+14}" width="13" height="220" fill="#16181A"/>'
    chair = f'<rect x="760" y="1010" width="210" height="150" rx="14" fill="#2B2119"/><rect x="772" y="1160" width="12" height="200" fill="#121416"/><rect x="946" y="1160" width="12" height="200" fill="#121416"/>'
    bag = f'<path d="M780 1040 q -24 80 4 200 h 160 q 24 -130 -6 -200 Z" fill="#1F3A55"/><path d="M806 1064 h 104 v 50 h -104 Z" fill="#183049"/><path d="M790 1040 q 70 -40 140 0" stroke="#152A40" stroke-width="10" fill="none"/>'
    strings = ''.join(f'<path d="M{x} -80 V80" stroke="#C9CED2" stroke-width="2" opacity=".55"/>' for x in range(-48, 50, 12)) + ''.join(f'<path d="M-60 {y} H60" stroke="#C9CED2" stroke-width="2" opacity=".55"/>' for y in range(-72, 76, 12))
    racket = f'<g transform="translate(700 1110) rotate(-22)"><clipPath id="rk"><ellipse rx="58" ry="78"/></clipPath><g clip-path="url(#rk)">{strings}</g><ellipse rx="58" ry="78" fill="none" stroke="#2A2F33" stroke-width="12"/><path d="M-10 76 L-4 118 M10 76 L4 118" stroke="#2A2F33" stroke-width="9"/><rect x="-9" y="116" width="18" height="140" rx="8" fill="#141719"/></g>'
    tball = ball('fg', 200, 1150, 36, rot=-30) + '<path d="M176 1124 A 36 36 0 0 1 228 1122" stroke="#FFE7B0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>'
    W, H = 1080, 1440
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em,i,u{{text-decoration:none;font-style:normal}}
body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;background:#E9E2D4;font-family:{WK}}}
.layer{{position:absolute;inset:0}}
/* 墙：上部米白粉墙，下部绿色墙裙 */
.wall{{background:linear-gradient(180deg,#D9D1C2 0%,#E8E0D0 30%,#E4DCCB 58%,#DCD3C1 63%)}}
.dado{{position:absolute;left:0;right:0;top:978px;bottom:0;background:linear-gradient(180deg,#6E9C8A,#5D8A79 40%,#4E7667)}} .dado::before{{content:'';position:absolute;left:0;right:0;top:0;height:10px;background:#8DB3A4;box-shadow:0 2px 0 rgba(0,0,0,.08)}} .dado::after{{content:'';position:absolute;left:80px;right:60px;top:10px;height:60px;background:linear-gradient(180deg,rgba(20,30,25,.28),transparent)}}
.ceil{{position:absolute;left:0;right:0;top:0;height:46px;background:linear-gradient(180deg,#BDB4A4,#D2C9B8)}} .lamp{{position:absolute;top:46px;left:330px;width:420px;height:16px;border-radius:3px;background:linear-gradient(180deg,#F4F4F0,#C9C9C2);box-shadow:0 6px 10px rgba(0,0,0,.12)}}
/* 标语 */
.slog{{position:absolute;top:96px;display:flex;gap:9px}} .slog.l{{left:56px}} .slog.r{{right:56px}}
.slog i{{width:84px;height:84px;display:flex;align-items:center;justify-content:center;font-family:{SERIF};font-weight:900;font-size:56px;color:#C9242C;background:#FBF8F1;box-shadow:0 5px 9px rgba(60,40,20,.22)}}
/* 黑板：真实横版，镜头略侧拍 */
.bwrap{{position:absolute;left:52px;top:300px;width:976px;height:620px;perspective:2000px}}
.board{{position:absolute;inset:0;transform:rotateY(-7deg);transform-origin:30% 50%;background:radial-gradient(90% 80% at 45% 45%,#3A6F5E 0%,#2F5D4E 55%,#264D41 100%);
 border:13px solid #B9C0C4;border-radius:4px;box-shadow:0 0 0 2px #8E979C,0 28px 40px -14px rgba(40,30,20,.55),inset 0 0 40px rgba(0,0,0,.35)}}
.board::after{{content:'';position:absolute;inset:0;background:radial-gradient(60% 50% at 30% 40%,rgba(255,255,255,.05),transparent 70%),repeating-linear-gradient(100deg,rgba(255,255,255,.018) 0 60px,transparent 60px 140px)}}
.chalk{{position:absolute;inset:0;filter:url(#chalk);color:{W_}}}
.iss{{position:absolute;left:34px;top:24px;font-size:17px;letter-spacing:5px;opacity:.75}}
h1{{position:absolute;left:30px;top:56px;font-size:92px;line-height:1.02;letter-spacing:4px}} h1 em{{color:{LM}}}
.sub{{position:absolute;left:36px;top:268px;font-size:24px;line-height:1.5}} .kn{{color:{LM};font-size:34px;font-weight:700}}
.date{{position:absolute;left:36px;top:362px;font-size:17px;line-height:1.6;opacity:.75}}
.how{{position:absolute;left:36px;top:440px;font-size:21px;line-height:1.5}} .how b{{color:{LM}}}
.roll{{position:absolute;left:372px;right:24px;top:32px;bottom:34px;border:2.5px solid rgba(244,242,234,.8);border-radius:18px;padding:22px 18px 6px}}
.tab{{position:absolute;left:24px;top:-17px;padding:0 12px;font-size:22px;font-weight:700;color:{YL};background:#2F5D4E;letter-spacing:5px}}
.grp{{font-size:15px;letter-spacing:6px;opacity:.8;height:24px;border-bottom:1.5px dashed rgba(244,242,234,.3)}} .grp.pink{{color:{PK};opacity:1}}
.row{{display:grid;grid-template-columns:70px 1fr 150px 48px;align-items:center;height:53px;border-bottom:1.5px solid rgba(244,242,234,.13)}}
.t{{font-size:22px}} .v{{min-width:0}} .v b{{display:block;font-size:19px;white-space:nowrap}} .v s{{display:block;font-size:14px;opacity:.62;white-space:nowrap;overflow:hidden;text-overflow:clip}}
.cells{{display:flex;gap:6px}} .cells i{{width:31px;height:31px;display:flex;align-items:center;justify-content:center;font-size:19px}} .got{{border:1.6px solid rgba(244,242,234,.45)}} .open{{border:2.2px dashed {LM}}}
.n{{color:{LM};font-size:18px;text-align:right}}
.tray{{position:absolute;left:-13px;right:-13px;bottom:-30px;height:17px;background:linear-gradient(180deg,#D6DBDE,#9AA3A8);border-radius:2px;box-shadow:0 6px 8px rgba(0,0,0,.25)}}
.tray i{{position:absolute;top:-7px;height:9px;border-radius:4px;background:{W_}}} .tray u{{position:absolute;left:120px;top:-16px;width:110px;height:18px;border-radius:3px;background:linear-gradient(180deg,#C9B999,#A8977A)}}
/* 光与镜头 */
.sun{{mix-blend-mode:screen}} .shade{{mix-blend-mode:multiply}}
.fg{{filter:blur(8px) brightness(.85)}}
.grade{{background:linear-gradient(180deg,rgba(255,170,90,.14),rgba(255,190,120,0) 40%,rgba(10,40,50,.45) 100%);mix-blend-mode:soft-light}}
.vig{{background:radial-gradient(110% 85% at 46% 40%,transparent 50%,rgba(8,10,12,.62) 100%)}}
.grain{{opacity:.10;mix-blend-mode:overlay}}
.subt{{position:absolute;left:0;right:0;top:1296px;text-align:center;font-family:{SANS};font-weight:500;font-size:34px;letter-spacing:3px;color:#FFFDF5;text-shadow:0 2px 6px rgba(0,0,0,.85),0 0 2px rgba(0,0,0,.9)}}
.cred{{position:absolute;left:0;right:0;top:1360px;text-align:center;font-family:{NUM};font-size:13px;letter-spacing:7px;color:rgba(255,253,245,.75);text-shadow:0 1px 3px rgba(0,0,0,.8)}}
.demo{{position:absolute;right:30px;top:60px;font-size:12px;letter-spacing:4px;color:rgba(60,50,40,.55);font-family:{SANS}}}
</style><body>
<svg width="0" height="0" style="position:absolute"><defs>
<filter id="chalk" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="2" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3 0 0 0 2.55" result="holes"/>
 <feComposite in="SourceGraphic" in2="holes" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="w"/>
 <feDisplacementMap in="c" in2="w" scale="2" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".3"/></filter></defs></svg>
<div class="layer wall"></div><div class="ceil"></div><div class="lamp"></div><div class="dado"></div>
<svg class="layer" width="{W}" height="{H}"><defs>{lib.COMMON}</defs>{clock_svg()}</svg>
<div class="slog l">{''.join(f'<i>{c}</i>' for c in '好好打球')}</div><div class="slog r">{''.join(f'<i>{c}</i>' for c in '天天向上')}</div>
<div class="bwrap">{board_html()}</div>
<!-- 一扇四格窗的夕阳投影，像追光一样落在「还有谁没到？」上；其余留在柔和的阴影里 -->
<div class="layer" style="background:radial-gradient(70% 55% at 22% 38%,transparent 40%,rgba(40,28,18,.18) 100%);mix-blend-mode:multiply"></div>
<svg class="layer sun" width="{W}" height="{H}"><defs><filter id="sl" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><feGaussianBlur stdDeviation="6"/></filter>
 <filter id="sl2" filterUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><feGaussianBlur stdDeviation="22"/></filter>
 <linearGradient id="beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD9A6" stop-opacity=".5"/><stop offset=".7" stop-color="#FFC27A" stop-opacity=".08"/><stop offset="1" stop-color="#FFC27A" stop-opacity="0"/></linearGradient></defs>
 <path d="M-60 -60 L300 -60 L560 700 L300 760Z" fill="url(#beam)" filter="url(#sl2)"/>
 <g filter="url(#sl)" fill="#FFCF94" opacity=".46">{win_panes()}</g>{dust}</svg>
<svg class="layer fg" width="{W}" height="{H}"><defs>{lib.COMMON}</defs>{desks}{chair}{bag}{racket}{tball}</svg>
<div class="layer grade"></div><div class="layer vig"></div>
<svg class="layer grain" width="{W}" height="{H}"><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="11"/><feColorMatrix type="saturate" values="0"/></filter><rect width="{W}" height="{H}" filter="url(#gr)"/></svg>
<div class="subt">「放学别走，球场见。」</div>
<div class="cred">NANBANQIU · {SITE}/g/ + 球局码 · 示意数据</div></body>'''

def win_panes():
    # 窗投影：2 列 × 2 行四格，平行四边形（光从左上斜下），格之间留窗框的影子
    out = ''; ox, oy = 70, 330; pw, ph, gap, sh = 150, 170, 16, 64
    for c in range(2):
        for r_ in range(2):
            x = ox + c * (pw + gap) + r_ * sh; y = oy + r_ * (ph + gap)
            out += f'<path d="M{x} {y} L{x+pw} {y-18} L{x+pw+sh} {y+ph-18} L{x+sh} {y+ph}Z"/>'
    return out

def clock_svg(cx=540, cy=150, rr=46, hh=16, mm=50):
    ticks = ''.join(f'<path d="M{cx+(rr-5)*math.sin(math.radians(k*30)):.1f} {cy-(rr-5)*math.cos(math.radians(k*30)):.1f} L{cx+(rr-(12 if k%3==0 else 9))*math.sin(math.radians(k*30)):.1f} {cy-(rr-(12 if k%3==0 else 9))*math.cos(math.radians(k*30)):.1f}" stroke="#222" stroke-width="{2.6 if k%3==0 else 1.4}"/>' for k in range(12))
    ha = (hh % 12 + mm / 60) * 30; ma = mm * 6
    hand = lambda a, L, w: f'<path d="M{cx} {cy} L{cx+L*math.sin(math.radians(a)):.1f} {cy-L*math.cos(math.radians(a)):.1f}" stroke="#1A1A1A" stroke-width="{w}" stroke-linecap="round"/>'
    return (f'<circle cx="{cx+4}" cy="{cy+7}" r="{rr+6}" fill="#000" opacity=".2" filter="url(#bl6)"/><circle cx="{cx}" cy="{cy}" r="{rr+6}" fill="#3A3A3A"/><circle cx="{cx}" cy="{cy}" r="{rr}" fill="#FBFAF6"/>'
            + ticks + hand(ha, rr * .5, 5.5) + hand(ma, rr * .76, 3.2) + f'<circle cx="{cx}" cy="{cy}" r="4.5" fill="#C9242C"/>')
