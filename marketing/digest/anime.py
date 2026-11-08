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
    chair = f'<rect x="{cx}" y="{y-110}" width="250" height="110" rx="16" fill="#F29A3A"/><rect x="{cx}" y="{y-110}" width="250" height="18" rx="9" fill="#FFC27A"/><rect x="{cx+20}" y="{y-4}" width="10" height="60" fill="#8D96A0"/><rect x="{cx+220}" y="{y-4}" width="10" height="60" fill="#8D96A0"/>'
    return chair + legs + box + top

def curtain():
    # 只在右上角飘起，下摆落在黑板右侧外面（不进黑板）
    return '''<g class="art"><path d="M1080 0 L1030 0 C 1040 40, 1030 80, 1010 110 C 1000 130, 1020 150, 1050 150 C 1066 150, 1074 148, 1080 146 Z" fill="#FFFFFF" opacity=".97"/>

</g>
<g class="art"><path d="M1048 190 C 1060 300, 1046 420, 1062 560 L1080 560 L1080 190Z" fill="#FFFFFF" opacity=".95"/><path d="M1058 200 C 1066 300, 1054 420, 1068 556" stroke="#DCE6EE" stroke-width="3" fill="none"/></g>'''

def doodle():
    # 黑板右上角磁铁贴着的一张涂鸦：网球 + 一行字
    return f'''<g class="art" transform="translate(540 900) rotate(-3) scale(.62)"><rect x="-58" y="0" width="116" height="138" fill="#FFFDF6" stroke="#E2D9C6" stroke-width="2"/>
<circle cx="0" cy="58" r="34" fill="#D7EE4E" stroke="#8FA324" stroke-width="3"/><path d="M-26 34 C -8 50, -8 66, -26 82 M26 34 C 8 50, 8 66, 26 82" stroke="#fff" stroke-width="5" fill="none"/>
<path d="M-40 112 h80" stroke="#E7A64E" stroke-width="4" stroke-linecap="round"/><text x="0" y="128" text-anchor="middle" font-family="{WK}" font-size="13" fill="#B4642A">明天见</text>
<circle cx="0" cy="2" r="9" fill="#E8484A"/><circle cx="-3" cy="-1" r="3" fill="#fff" opacity=".7"/></g>'''

def cabinets():
    # 后墙下的一排储物柜（格子柜），柜顶放着书包和一罐网球
    out = '<rect x="40" y="868" width="1000" height="16" fill="#B07C4E"/><rect x="40" y="884" width="1000" height="150" fill="#E7C08E"/>'
    for k in range(8):
        x = 52 + k * 124
        out += f'<rect x="{x}" y="896" width="112" height="60" rx="4" fill="#D9A86F"/><rect x="{x}" y="964" width="112" height="60" rx="4" fill="#D9A86F"/><circle cx="{x+56}" cy="926" r="4" fill="#9B6A3C"/><circle cx="{x+56}" cy="994" r="4" fill="#9B6A3C"/>'
    out += '<path d="M120 868 q -6 -50 30 -56 h 60 q 30 6 26 56Z" fill="#4C7FB5"/><rect x="140" y="830" width="70" height="26" rx="5" fill="#3D6B9C"/>'
    out += '<rect x="820" y="806" width="44" height="62" rx="8" fill="#E9EEF0" stroke="#B9C3C8" stroke-width="2"/><rect x="820" y="822" width="44" height="22" fill="#E45B4B"/><circle cx="842" cy="806" r="18" fill="#DDEB5A" opacity=".0"/>'
    return out

def html():
    import bigboard as bb
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>*{{margin:0;padding:0;box-sizing:border-box}}{bb.CSS}
body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:{WK};background:#FBEFD9}}
.L{{position:absolute;inset:0}}
.slog{{position:absolute;top:58px;display:flex;gap:9px}} .slog.l{{right:606px}} .slog.r{{left:606px}}
.slog i{{font-style:normal;width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-family:{SERIF};font-weight:900;font-size:52px;color:#D03A2E;background:#FFFBF2;box-shadow:0 3px 0 #E8D5B5}}
.board{{position:absolute;left:30px;top:184px;width:1020px;height:1060px;background:linear-gradient(160deg,#4E8063 0%,#43735A 55%,#3B6851 100%);border:16px solid #B98A5A;box-shadow:inset 0 0 0 3px #8E6338,0 6px 0 #A07445}}
.tray{{position:absolute;left:10px;right:10px;top:1244px;height:20px;background:linear-gradient(180deg,#C99A69,#9F7246);box-shadow:0 6px 8px rgba(120,80,40,.25)}}
.tray i{{position:absolute;top:-8px;height:9px;border-radius:4px}}
.subt{{position:absolute;left:0;right:0;top:1300px;text-align:center;font-family:{SANS};font-weight:700;font-size:36px;letter-spacing:4px;color:#fff;text-shadow:0 2px 0 #C46B2A}}
.cred{{position:absolute;left:0;right:0;top:1366px;text-align:center;font-family:{NUM};font-size:13px;letter-spacing:7px;color:#8A4A1E}}
</style><body>{bb.CHALK_FILTER}
<svg class="L" width="{W}" height="{H}"><defs><linearGradient id="wl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F6E7CF"/><stop offset=".7" stop-color="#FBEFD9"/><stop offset="1" stop-color="#FFF5DE"/></linearGradient>
<radialGradient id="glow" cx="100%" cy="20%" r="70%"><stop offset="0" stop-color="#FFF4C9" stop-opacity=".9"/><stop offset="1" stop-color="#FFF4C9" stop-opacity="0"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#wl)"/><rect width="{W}" height="30" fill="#E9D8BC"/><rect width="{W}" height="{H}" fill="url(#glow)"/>
{cinema.clock_svg(540, 98, 40)}</svg>
<div class="slog l">{"".join(f"<i>{c}</i>" for c in "好好打球")}</div><div class="slog r">{"".join(f"<i>{c}</i>" for c in "天天向上")}</div>
<div class="board">{bb.inner('#43735A')}</div>
<div class="tray"><i style="left:90px;width:110px;height:18px;top:-16px;border-radius:3px;background:#F0A04B"></i><i style="left:640px;width:72px;background:#fff"></i><i style="left:730px;width:44px;background:#F5A3B5"></i><i style="left:792px;width:36px;background:#F6DB6E"></i></div>
<svg class="L" width="{W}" height="{H}">{curtain()}</svg>
<div class="subt">「放学别走，球场见。」</div><div class="cred">NANBANQIU · 示意数据</div></body>'''
