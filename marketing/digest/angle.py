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
ROT = 14          # 前墙转角（度）：越大越立体，越小越好读

def html():
    board_css = cinema.html().split('<style>')[1].split('</style>')[0]
    keep = '\n'.join(l for l in board_css.split('\n') if any(l.startswith(p) for p in ('.chalk', '.iss', 'h1', '.sub', '.date', '.how', '.roll', '.tab', '.grp', '.row', '.t{', '.cells', '.n{', '.tray', '*{', 's,em')))
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>{keep}
body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;font-family:{WK};background:#F4F1EA}}
.L{{position:absolute;inset:0}}
.scene{{position:absolute;inset:0;perspective:1700px;perspective-origin:62% 46%}}
.front{{position:absolute;left:-30px;top:96px;width:1060px;height:930px;transform-origin:0 50%;transform:rotateY({ROT}deg);background:linear-gradient(180deg,#7FCBC1 0%,#74C2B7 70%)}}
.front .dado{{position:absolute;left:0;right:0;top:830px;bottom:0;background:#EE9A86}} .front .dado::before{{content:'';position:absolute;left:0;right:0;top:0;height:12px;background:#FBEFE8}}
.slog{{position:absolute;top:28px;display:flex;gap:8px}} .slog.l{{right:576px}} .slog.r{{left:576px}} .slog.r i:last-child{{margin-right:0}}
.slog i{{font-style:normal;width:76px;height:76px;display:flex;align-items:center;justify-content:center;font-family:{SERIF};font-weight:900;font-size:50px;color:#D03A2E;background:#FFFBF2;box-shadow:0 3px 0 rgba(0,0,0,.1)}}
.clock{{position:absolute;left:488px;top:20px}}
.bwrap{{position:absolute;left:44px;top:146px;width:1000px;height:630px}}
.board{{position:absolute;inset:0;background:linear-gradient(160deg,#3F7158 0%,#356650 55%,#2F5C48 100%);border:14px solid #F2F2EE;box-shadow:inset 0 0 0 2px #CFCFC8,0 8px 14px rgba(30,60,55,.25)}}
.board .tab{{background:#356650}}
.tray{{left:-14px;right:-14px;bottom:-30px;height:16px;background:linear-gradient(180deg,#F7F7F3,#C9CBC5)}}
.cab{{position:absolute;left:44px;top:812px;width:1000px;height:18px;background:#C98E5C;box-shadow:0 120px 0 0 #E2B37F}}
.cab::after{{content:'';position:absolute;left:0;right:0;top:18px;height:120px;background:repeating-linear-gradient(90deg,#E2B37F 0 6px,#D9A06A 6px 110px)}}
.cab i{{display:none}}
.flag{{position:absolute;left:880px;top:30px;width:120px;height:76px;background:#E33A30;clip-path:polygon(0 0,100% 18%,0 100%);box-shadow:none}} .flag::before{{content:'';position:absolute;left:-6px;top:-10px;width:5px;height:110px;background:#C9A15A}}
.flag b{{position:absolute;left:8px;top:28px;font-family:{SANS};font-size:13px;color:#FFE27A;letter-spacing:1px}}
.sun{{mix-blend-mode:screen}}
.subt{{position:absolute;left:0;right:150px;top:928px;text-align:center;font-family:{SANS};font-weight:700;font-size:36px;letter-spacing:4px;color:#fff;text-shadow:0 2px 0 #C45A46}}
.cred{{position:absolute;left:0;right:150px;top:990px;text-align:center;font-family:{NUM};font-size:13px;letter-spacing:7px;color:#9A4A3A}}
.cred b{{background:rgba(255,250,244,.88);padding:4px 12px;border-radius:12px;font-weight:600}}
</style><body>
<svg class="L" width="{W}" height="{H}">
 <rect width="{W}" height="{H}" fill="#F1E6DA"/>
 <!-- 天花板 + 灯 -->
 <path d="M0 0 H1080 V60 L900 150 H0Z" fill="#F7F5F0"/>{''.join(f'<path d="M{x} {y} l{w} {-w*.12:.0f} l0 10 l{-w} {w*.12:.0f}Z" fill="#FFFFFF" stroke="#DADAD4"/>' for x, y, w in ((150, 70, 230), (520, 40, 180), (860, 30, 120)))}
 <!-- 右侧窗墙（透视） -->
 <path d="M890 150 L1080 60 L1080 1120 L890 1000Z" fill="#7FCBC1"/>
 <path d="M890 908 L1080 960 L1080 1120 L890 1000Z" fill="#EE9A86"/>
 {''.join(f'<path d="M{x0} {y0} L{x1} {y1} L{x1} {y2} L{x0} {y3}Z" fill="#FFF6DD" stroke="#FFFFFF" stroke-width="8"/>' for x0, y0, x1, y1, y2, y3 in ((915, 260, 1065, 200, 860, 900),))}
 <path d="M990 230 V880" stroke="#fff" stroke-width="6"/><path d="M915 560 L1065 540" stroke="#fff" stroke-width="6"/>
 <!-- 地面 + 阳光 -->
 <path d="M0 1000 H890 L1080 1120 V1440 H0Z" fill="#E9E3DA"/>
 <g class="sun" fill="#FFF3D2" opacity=".75">{''.join(f'<path d="M{x} {y} l{w} {-30} l{-260} {150} l{-w} {30}Z"/>' for x, y, w in ((760, 1060, 110), (880, 1040, 110), (600, 1150, 140), (760, 1124, 140), (420, 1290, 170), (620, 1256, 170)))}</g>
</svg>
<div class="scene"><div class="front"><div class="dado"></div>
 <div class="slog l">{"".join(f"<i>{c}</i>" for c in "好好打球")}</div><svg class="clock" width="84" height="84" viewBox="498 62 84 84">{cinema.clock_svg(540, 104, 36)}</svg><div class="slog r">{"".join(f"<i>{c}</i>" for c in "天天向上")}</div>
 <div class="bwrap"><div class="board">{cinema.board_inner()}</div></div>
 <div class="cab">{''.join('<i></i>' for _ in range(9))}</div></div></div>
<svg class="L" width="{W}" height="{H}"><defs>{lib.COMMON}</defs>{rows()}</svg>
<div class="subt">「放学别走，球场见。」</div>
<div class="cred"><b>NANBANQIU · {SITE}/g/ + 球局码 · 示意数据</b></div></body>'''

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
