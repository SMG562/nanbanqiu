"""明日球局 · 「动画」版：日系动画背景画风的午后教室（平涂 + 柔和渐变、明亮暖色）。
黑板（点名册内容同 cinema.board_inner）、讲台、橙色课桌椅、米色地砖透视、被风吹起的白窗帘、窗格阳光（只落在墙、讲台、地面，不照黑板上的字）、黑板上磁铁贴着一张网球涂鸦。"""
import math, random
from common import *
from chalkbase import FONT_DIR, WK
import cinema
from timetable import spots
EXPECT = lambda: ['还有谁', f'{spots()}', '7Kq2', '放学别走']
HEADLINE = lambda: (str(spots()), '.kn')
W, H = 1080, 1440
BX, BY, BW, BH = 40, 190, 1000, 630          # 黑板外框

def floor():
    # 一点透视地砖：消失点在讲台后方
    vx, vy = 540, 560; y0 = 930; out = ''
    rows = [y0]
    for k in range(1, 12): rows.append(y0 + (H - y0) * ((k / 11) ** 1.6))
    for i in range(len(rows) - 1):
        for j in range(-14, 15):
            def X(y, jj): return vx + (jj * 70) * (y - vy) / (y0 - vy) / 2.2
            a, b = rows[i], rows[i + 1]
            c = '#F3D9B4' if (i + j) % 2 == 0 else '#EBC99D'
            out += f'<path d="M{X(a,j):.1f} {a:.1f} L{X(a,j+1):.1f} {a:.1f} L{X(b,j+1):.1f} {b:.1f} L{X(b,j):.1f} {b:.1f}Z" fill="{c}" stroke="#D9B488" stroke-width="1.2"/>'
    return out

def desk(x, y, w, flip=1):
    # 橙色课桌 + 椅子（平涂：亮面 / 侧面 / 铁腿）
    legs = ''.join(f'<rect x="{lx}" y="{y+56}" width="11" height="{H-y}" fill="#8D96A0"/><rect x="{lx+7}" y="{y+56}" width="4" height="{H-y}" fill="#6E7781"/>' for lx in (x + 30, x + w - 40))
    top = f'<path d="M{x} {y} L{x+w} {y} L{x+w+18*flip} {y+40} L{x+18*flip} {y+40}Z" fill="#F7A646"/><path d="M{x+18*flip} {y+40} L{x+w+18*flip} {y+40} L{x+w+18*flip} {y+56} L{x+18*flip} {y+56}Z" fill="#D9802C"/><path d="M{x} {y} L{x+w} {y}" stroke="#FFD08A" stroke-width="4"/>'
    box = f'<rect x="{x+26}" y="{y+56}" width="{w-30}" height="56" fill="#5E646B" opacity=".9"/>'
    cx = x + (w - 250) / 2 + 20 * flip
    chair = f'<rect x="{cx}" y="{y+120}" width="250" height="80" rx="16" fill="#F29A3A"/><rect x="{cx}" y="{y+120}" width="250" height="18" rx="9" fill="#FFC27A"/><rect x="{cx+20}" y="{y+196}" width="10" height="200" fill="#8D96A0"/><rect x="{cx+220}" y="{y+196}" width="10" height="200" fill="#8D96A0"/>'
    return legs + box + top + chair

def curtain():
    # 只在右上角飘起，下摆落在黑板右侧外面（不进黑板）
    return '''<g class="art"><path d="M1080 0 L1030 0 C 1040 40, 1030 80, 1010 110 C 1000 130, 1020 150, 1050 150 C 1066 150, 1074 148, 1080 146 Z" fill="#FFFFFF" opacity=".97"/>

</g>
<g class="art"><path d="M1048 190 C 1060 300, 1046 420, 1062 560 L1080 560 L1080 190Z" fill="#FFFFFF" opacity=".95"/><path d="M1058 200 C 1066 300, 1054 420, 1068 556" stroke="#DCE6EE" stroke-width="3" fill="none"/></g>'''

def doodle():
    # 黑板右上角磁铁贴着的一张涂鸦：网球 + 一行字
    return f'''<g class="art" transform="translate(540 936) rotate(-3) scale(.72)"><rect x="-58" y="0" width="116" height="138" fill="#FFFDF6" stroke="#E2D9C6" stroke-width="2"/>
<circle cx="0" cy="58" r="34" fill="#D7EE4E" stroke="#8FA324" stroke-width="3"/><path d="M-26 34 C -8 50, -8 66, -26 82 M26 34 C 8 50, 8 66, 26 82" stroke="#fff" stroke-width="5" fill="none"/>
<path d="M-40 112 h80" stroke="#E7A64E" stroke-width="4" stroke-linecap="round"/><text x="0" y="128" text-anchor="middle" font-family="{WK}" font-size="13" fill="#B4642A">明天见</text>
<circle cx="0" cy="2" r="9" fill="#E8484A"/><circle cx="-3" cy="-1" r="3" fill="#fff" opacity=".7"/></g>'''

def html():
    sun = '#FFF0C2'
    panes = ''.join(f'<path d="M{x} {y} L{x+w} {y} L{x+w-110} {y+h} L{x-110} {y+h}Z" fill="{sun}" opacity=".55"/>' for x, y, w, h in ((640, 838, 150, 82), (810, 838, 150, 82), (1000, 838, 120, 82)))
    floorsun = ''.join(f'<path d="M{x} {y} L{x+w} {y} L{x+w-260} {y+h} L{x-260} {y+h}Z" fill="#FFF6D8" opacity=".55"/>' for x, y, w, h in ((900, 940, 170, 150), (1100, 940, 170, 150), (760, 1110, 200, 190), (990, 1110, 200, 190)))
    board_css = cinema.html().split('<style>')[1].split('</style>')[0]
    keep = '\n'.join(l for l in board_css.split('\n') if any(l.startswith(p) for p in ('.chalk', '.iss', 'h1', '.sub', '.date', '.how', '.roll', '.tab', '.grp', '.row', '.t{', '.cells', '.n{', '.tray', '*{', 's,em')))
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>{keep}
body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:{WK};background:#FBEFD9}}
.L{{position:absolute;inset:0}}
.bwrap{{position:absolute;left:{BX}px;top:{BY}px;width:{BW}px;height:{BH}px}}
.board{{position:absolute;inset:0;background:linear-gradient(160deg,#4E8063 0%,#43735A 55%,#3B6851 100%);border:16px solid #B98A5A;box-shadow:inset 0 0 0 3px #8E6338,0 6px 0 #A07445}}
.board .tab{{background:#43735A}}
.tray{{left:-24px;right:-24px;bottom:-34px;height:18px;background:linear-gradient(180deg,#C99A69,#9F7246)}}
.tray u{{background:linear-gradient(180deg,#F0A04B,#C77A2E)!important}}
.slog{{position:absolute;top:66px;display:flex;gap:9px}} .slog.l{{right:606px}} .slog.r{{left:606px}}
.slog i{{font-style:normal;width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-family:{SERIF};font-weight:900;font-size:52px;color:#D03A2E;background:#FFFBF2;box-shadow:0 3px 0 #E8D5B5}}
.subt{{position:absolute;left:0;right:0;top:1186px;text-align:center;font-family:{SANS};font-weight:700;font-size:36px;letter-spacing:4px;color:#fff;text-shadow:0 2px 0 #C46B2A,0 0 10px rgba(180,90,30,.5)}}
.cred{{position:absolute;left:0;right:0;top:1246px;text-align:center;font-family:{NUM};font-size:13px;letter-spacing:7px;color:#8A4A1E}}
.cred b{{background:rgba(255,248,232,.85);padding:4px 12px;border-radius:12px;font-weight:600}}
</style><body>
<svg class="L" width="{W}" height="{H}"><defs><linearGradient id="wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F6E7CF"/><stop offset=".7" stop-color="#FBEFD9"/><stop offset="1" stop-color="#FFF5DE"/></linearGradient>
<radialGradient id="glow" cx="100%" cy="20%" r="70%"><stop offset="0" stop-color="#FFF4C9" stop-opacity=".9"/><stop offset="1" stop-color="#FFF4C9" stop-opacity="0"/></radialGradient></defs>
<rect width="{W}" height="930" fill="url(#wl)"/><rect width="{W}" height="34" fill="#E9D8BC"/><rect y="34" width="{W}" height="6" fill="#D8C3A1"/>
<rect y="900" width="{W}" height="30" fill="#D49A5C"/><rect y="900" width="{W}" height="5" fill="#E8B57C"/>
{floor()}{floorsun}{panes}
<rect width="{W}" height="{H}" fill="url(#glow)"/>
{cinema.clock_svg(540, 104, 40)}
</svg>
<div class="slog l">{"".join(f"<i>{c}</i>" for c in "好好打球")}</div><div class="slog r">{"".join(f"<i>{c}</i>" for c in "天天向上")}</div>
<div class="bwrap"><div class="board">{cinema.board_inner()}</div></div>
<svg class="L" width="{W}" height="{H}"><defs>{lib.COMMON}</defs>
<g><rect x="350" y="880" width="380" height="34" fill="#9A5B33"/><rect x="350" y="880" width="380" height="8" fill="#B8754A"/><rect x="370" y="914" width="340" height="190" fill="#7E4626"/><rect x="370" y="914" width="340" height="12" fill="#5F331B"/>
<path d="M600 914 L710 914 L710 1104 L540 1104Z" fill="#FFE9B8" opacity=".28"/><rect x="380" y="1104" width="22" height="30" fill="#5F331B"/><rect x="678" y="1104" width="22" height="30" fill="#5F331B"/></g>
{doodle()}{desk(-60, 1080, 380, 1)}{desk(760, 1080, 380, -1)}{curtain()}</svg>
<div class="subt">「放学别走，球场见。」</div>
<div class="cred"><b>NANBANQIU · {SITE}/g/ + 球局码 · 示意数据</b></div></body>'''
