"""放大的黑板报内容（约 1000×1000）：上方标题区，下方点名册占满整宽、字号放大。anime / angle 共用。"""
import random
from common import *
from chalkbase import WK
from timetable import GAMES, spots, level_word
W_, LM, PK, YL, BL = '#F4F2EA', '#D4F25A', '#F5A3B5', '#F6DB6E', '#9ED3F0'
def need(g): return CAP[g[4]] - g[7]

def inner(tabbg):
    random.seed(4); rows = ''
    groups = [('上 午', [g for g in GAMES if int(g[0][:2]) < 12]), ('下 午', [g for g in GAMES if 12 <= int(g[0][:2]) < 17]), ('放学别走', [g for g in GAMES if int(g[0][:2]) >= 17])]
    for label, gs in groups:
        rows += f'<div class="bg-grp {"pink" if label == "放学别走" else ""}">{label}</div>'
        for g in gs:
            cells = ''.join((f'<i class="got" style="color:{random.choice([W_, W_, PK, BL])}"><span style="transform:rotate({random.randint(-10,10)}deg)">到</span></i>' if k < g[7] else '<i class="open"></i>') for k in range(CAP[g[4]]))
            rows += f'<div class="bg-row"><b class="t">{g[0]}</b><div class="v"><b>{esc(g[2])}</b><s>{esc(g[3])} · {TYPE[g[4]]} · {level_word(g[5], g[6])} · 球局码 {g[9]}</s></div><div class="cells">{cells}</div><b class="n">缺 {need(g)}</b></div>'
    return f'''<div class="bg">
<div class="bg-iss">明天点名 · 墨尔本班 · 第 {ISSUE} 期　　{TOMORROW.month} 月 {TOMORROW.day} 日 星期{WD[TOMORROW.weekday()]} · 晴　　值日：南伴球</div>
<h1 class="bg-h">还有谁<em>没到？</em></h1>
<div class="bg-sub">明天 {len(GAMES)} 节课，<span class="kn">{spots()}</span> 个位置还没人喊「到」。</div>
<div class="bg-roll"><div class="bg-tab" style="background:{tabbg}">点名册</div>{rows}</div>
<div class="bg-how">喊到：浏览器打开 <b>{SITE}/g/</b> + 球局码</div></div>'''

CSS = f'''
.bg{{position:absolute;inset:0;filter:url(#chalk);color:{W_};font-family:{WK}}}
.bg-iss{{position:absolute;left:36px;right:36px;top:24px;font-size:18px;letter-spacing:3px;opacity:.72}}
.bg-h{{position:absolute;left:32px;top:58px;font-size:104px;line-height:1.1;letter-spacing:4px;font-weight:700}} .bg-h em{{font-style:normal;color:{LM}}}
.bg-sub{{position:absolute;left:38px;top:180px;font-size:30px}} .kn{{color:{LM};font-size:44px;font-weight:700}}
.bg-roll{{position:absolute;left:28px;right:28px;top:252px;bottom:72px;border:2.5px solid rgba(244,242,234,.78);border-radius:18px;padding:26px 22px 8px}}
.bg-tab{{position:absolute;left:26px;top:-19px;padding:0 14px;font-size:26px;font-weight:700;color:{YL};letter-spacing:6px}}
.bg-grp{{font-size:18px;letter-spacing:8px;opacity:.78;height:32px;padding-top:4px;border-bottom:1.5px dashed rgba(244,242,234,.3)}} .bg-grp.pink{{color:{PK};opacity:1}}
.bg-row{{display:grid;grid-template-columns:104px 1fr 196px 70px;align-items:center;height:70px;border-bottom:1.5px solid rgba(244,242,234,.13)}}
.bg-row .t{{font-size:32px}} .bg-row .v{{min-width:0}} .bg-row .v b{{display:block;font-size:28px;white-space:nowrap}} .bg-row .v s{{display:block;font-size:17px;opacity:.65;white-space:nowrap;text-decoration:none;margin-top:2px}}
.bg-row .cells{{display:flex;gap:8px}} .bg-row .cells i{{width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:24px;font-style:normal}}
.bg-row .got{{border:2px solid rgba(244,242,234,.45)}} .bg-row .open{{border:2.6px dashed {LM}}} .bg-row .n{{color:{LM};font-size:26px;text-align:right}}
.bg-how{{position:absolute;left:38px;bottom:24px;font-size:26px}} .bg-how b{{color:{LM}}}
'''
CHALK_FILTER = '''<svg width="0" height="0" style="position:absolute"><defs><filter id="chalk" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="2" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3 0 0 0 2.55" result="holes"/>
 <feComposite in="SourceGraphic" in2="holes" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="w"/>
 <feDisplacementMap in="c" in2="w" scale="2" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".3"/></filter></defs></svg>'''
