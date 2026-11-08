"""明日球局 · 「斜角」版：从教室侧后方看过去——前墙斜对镜头，黑板占画面主体（轻透视，字仍好读）；
右侧一排亮窗，阳光斜落在地上；课桌一排排延伸；马卡龙配色（青绿墙、珊瑚墙裙）。"""
import math
from common import *
from chalkbase import FONT_DIR, WK
import cinema
from timetable import spots
EXPECT = lambda: ['还有谁', f'{spots()}', '7Kq2', '放学别走']
HEADLINE = lambda: (str(spots()), '.kn')
W, H = 1080, 1440
ROT = 9          # 前墙转角（度）：越大越立体，越小越好读

def html():
    import bigboard as bb
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>*{{margin:0;padding:0;box-sizing:border-box}}{bb.CSS}
body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:{WK};background:#74C2B7}}
.scene{{position:absolute;inset:0;perspective:2200px;perspective-origin:70% 48%}}
.front{{position:absolute;left:-10px;top:0;width:1100px;height:1440px;transform-origin:0 50%;transform:rotateY({ROT}deg);background:linear-gradient(180deg,#86D0C6 0%,#76C3B8 100%)}}
.slog{{position:absolute;top:50px;display:flex;gap:8px}} .slog.l{{right:596px}} .slog.r{{left:596px}}
.slog i{{font-style:normal;width:78px;height:78px;display:flex;align-items:center;justify-content:center;font-family:{SERIF};font-weight:900;font-size:50px;color:#D03A2E;background:#FFFBF2;box-shadow:0 3px 0 rgba(0,0,0,.1)}}
.clock{{position:absolute;left:504px;top:46px}}
.board{{position:absolute;left:46px;top:172px;width:1010px;height:1070px;background:linear-gradient(160deg,#3F7158 0%,#356650 55%,#2F5C48 100%);border:14px solid #F2F2EE;box-shadow:inset 0 0 0 2px #CFCFC8,0 10px 18px rgba(30,60,55,.28)}}
.tray{{position:absolute;left:30px;right:30px;top:1242px;height:18px;background:linear-gradient(180deg,#F7F7F3,#C9CBC5);box-shadow:0 6px 8px rgba(30,60,55,.2)}}
.tray i{{position:absolute;top:-8px;height:9px;border-radius:4px}}
.subt{{position:absolute;left:0;right:0;top:1294px;text-align:center;font-family:{SANS};font-weight:700;font-size:36px;letter-spacing:4px;color:#fff;text-shadow:0 2px 0 #3E8E83}}
.cred{{position:absolute;left:0;right:0;top:1360px;text-align:center;font-family:{NUM};font-size:13px;letter-spacing:7px;color:#1F5E56}}
.sunw{{position:absolute;inset:0;background:linear-gradient(110deg,rgba(255,240,200,.0) 55%,rgba(255,240,200,.28) 100%);mix-blend-mode:screen;pointer-events:none}}
</style><body>{bb.CHALK_FILTER}
<div class="scene"><div class="front">
 <div class="slog l">{"".join(f"<i>{c}</i>" for c in "好好打球")}</div><svg class="clock" width="84" height="84" viewBox="498 62 84 84">{cinema.clock_svg(540, 104, 36)}</svg><div class="slog r">{"".join(f"<i>{c}</i>" for c in "天天向上")}</div>
 <div class="board">{bb.inner('#356650')}</div>
 <div class="tray"><i style="left:80px;width:110px;height:18px;top:-16px;border-radius:3px;background:#C9B999"></i><i style="left:640px;width:72px;background:#fff"></i><i style="left:730px;width:44px;background:#F5A3B5"></i></div>
 <div class="subt">「放学别走，球场见。」</div><div class="cred">NANBANQIU · 示意数据</div></div></div>
<div class="sunw"></div></body>'''

def desk(x, y, s):
    w, d = 220 * s, 60 * s
    top = f'<path d="M{x} {y} L{x+w} {y-12*s} L{x+w+30*s} {y-12*s+d} L{x+30*s} {y+d}Z" fill="#F6D27A"/><path d="M{x+30*s} {y+d} L{x+w+30*s} {y-12*s+d} L{x+w+30*s} {y-4*s+d} L{x+30*s} {y+8*s+d}Z" fill="#D9A84E"/>'
    legs = ''.join(f'<rect x="{lx:.0f}" y="{y+d:.0f}" width="{6*s:.0f}" height="{120*s:.0f}" fill="#A9ADB2"/>' for lx in (x + 40 * s, x + w + 10 * s))
    cx = x + 70 * s; cy = y + d + 40 * s
    cy = y - 70 * s
    chair = f'<rect x="{cx:.0f}" y="{cy:.0f}" width="{120*s:.0f}" height="{70*s:.0f}" rx="{10*s:.0f}" fill="#F08A6E"/><rect x="{cx:.0f}" y="{cy:.0f}" width="{120*s:.0f}" height="{14*s:.0f}" rx="{7*s:.0f}" fill="#F7B19C"/>'
    return f'<g class="art">{chair}{legs}{top}</g>'

def rows():
    out = ''
    for x, y, s in ((120, 1050, .55), (420, 1046, .55), (680, 1050, .5), (30, 1140, .78), (420, 1136, .78), (780, 1150, .7), (-90, 1270, 1.15), (450, 1262, 1.15)):
        out += desk(x, y, s)
    return out
