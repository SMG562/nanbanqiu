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

def board_inner():
    random.seed(4); rows = ''
    groups = [('上 午', [g for g in GAMES if int(g[0][:2]) < 12]), ('下 午', [g for g in GAMES if 12 <= int(g[0][:2]) < 17]), ('放学别走', [g for g in GAMES if int(g[0][:2]) >= 17])]
    for label, gs in groups:
        rows += f'<div class="grp {"pink" if label == "放学别走" else ""}">{label}</div>'
        for g in gs:
            cells = ''.join((f'<i class="got" style="color:{random.choice([W_, W_, PK, BL])}"><span style="transform:rotate({random.randint(-12,12)}deg)">到</span></i>' if k < g[7] else '<i class="open"></i>') for k in range(CAP[g[4]]))
            rows += f'<div class="row"><b class="t">{g[0]}</b><div class="v"><b>{esc(g[2])}</b><s>{esc(g[3])} · {TYPE[g[4]]} · {level_word(g[5], g[6])} · {g[9]}</s></div><div class="cells">{cells}</div><b class="n">缺 {need(g)}</b></div>'
    return f'''<div class="chalk">
<div class="iss">明天点名 · 墨尔本班 · 第 {ISSUE} 期</div>
<h1>还有谁<br><em>没到？</em></h1>
<div class="sub">明天 {len(GAMES)} 节课，<br><span class="kn">{spots()}</span> 个位置还没人喊「到」。</div>
<div class="date">{TOMORROW.month} 月 {TOMORROW.day} 日 星期{WD[TOMORROW.weekday()]} · 晴<br>值日：南伴球</div>
<div class="how">喊到：浏览器打开<br><b>{SITE}/g/</b> + 球局码</div>
<div class="roll"><div class="tab">点名册</div>{rows}</div></div>
<div class="tray"><i style="left:520px;width:70px"></i><i style="left:610px;width:44px;background:{PK}"></i><i style="left:672px;width:36px;background:{YL}"></i><u></u></div>'''

def html():
    r = random.Random(9)
    W, H = 1080, 1440
    # 真黑板：擦过的弧形痕、没擦净的旧字、粉笔槽里的粉笔灰
    smear = ''.join(f'<path d="M{x} {y} q {w/2:.0f} {-r.randint(30,70)} {w} 0" stroke="#fff" stroke-width="{r.randint(50,90)}" stroke-linecap="round" fill="none" opacity="{r.uniform(.025,.05):.3f}"/>' for x, y, w in ((40, 160, 300), (300, 420, 360), (560, 120, 340), (120, 520, 280), (620, 470, 300)))
    ghost = f'<g fill="#fff" opacity=".045" font-family="{WK}" font-size="40"><text x="30" y="574" transform="rotate(-2 30 574)">期中考试 第三单元</text></g>'
    dust = ''.join(f'<circle cx="{r.uniform(20,950):.0f}" cy="{r.uniform(594,604):.0f}" r="{r.uniform(.8,2):.1f}" fill="#fff" opacity="{r.uniform(.15,.5):.2f}"/>' for _ in range(160))
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em,i,u{{text-decoration:none;font-style:normal}}
body{{width:{W}px;height:{H}px;overflow:hidden;position:relative;background:#E6DED0;font-family:{WK}}}
.layer{{position:absolute;inset:0;pointer-events:none}}
.wall{{background:linear-gradient(180deg,#D8CFBF 0%,#E7DFD0 24%,#E9E1D2 60%)}}
.ceil{{position:absolute;left:0;right:0;top:0;height:40px;background:linear-gradient(180deg,#C2B9A9,#D6CDBD);box-shadow:0 2px 4px rgba(0,0,0,.06)}}
.dado{{position:absolute;left:0;right:0;top:1010px;bottom:0;background:linear-gradient(180deg,#6F9A88 0%,#628C7B 50%,#557D6D 100%)}}
.dado::before{{content:'';position:absolute;left:0;right:0;top:0;height:8px;background:#88AE9F}}
.floor{{position:absolute;left:0;right:0;top:1330px;bottom:0;background:linear-gradient(180deg,#9C8F7C,#8A7E6C)}} .floor::before{{content:'';position:absolute;left:0;right:0;top:0;height:14px;background:#4E6E61}}
.slog{{position:absolute;top:92px;display:flex;gap:9px}} .slog.l{{right:606px}} .slog.r{{left:606px}}
.slog i{{width:80px;height:80px;display:flex;align-items:center;justify-content:center;font-family:{SERIF};font-weight:900;font-size:52px;color:#C2252C;background:#FAF6EE;box-shadow:0 3px 5px rgba(60,40,20,.16)}}
/* 黑板：嵌在墙上的哑光石板，细铝框，下边一条粉笔槽 */
.bwrap{{position:absolute;left:50px;top:300px;width:980px;height:612px}}
.board{{position:absolute;inset:0;background:radial-gradient(95% 85% at 50% 45%,#2A4339 0%,#233A31 60%,#1D3229 100%);border:8px solid #A7ADB0;box-shadow:0 0 0 1px #868D91,0 3px 0 rgba(0,0,0,.12)}}
.btex{{position:absolute;inset:0}}
.chalk{{position:absolute;inset:0;filter:url(#chalk);color:{W_}}}
.iss{{position:absolute;left:34px;top:26px;font-size:17px;letter-spacing:5px;opacity:.7}}
h1{{position:absolute;left:30px;top:58px;font-size:90px;line-height:1.04;letter-spacing:4px;font-weight:700}} h1 em{{color:{LM}}}
.sub{{position:absolute;left:36px;top:270px;font-size:24px;line-height:1.5}} .kn{{color:{LM};font-size:34px;font-weight:700}}
.date{{position:absolute;left:36px;top:364px;font-size:17px;line-height:1.6;opacity:.7}}
.how{{position:absolute;left:36px;top:446px;font-size:21px;line-height:1.5}} .how b{{color:{LM}}}
.roll{{position:absolute;left:372px;right:24px;top:32px;bottom:30px;border:2.5px solid rgba(244,242,234,.75);border-radius:16px;padding:22px 18px 6px}}
.tab{{position:absolute;left:24px;top:-17px;padding:0 12px;font-size:22px;font-weight:700;color:{YL};background:#243B32;letter-spacing:5px}}
.grp{{font-size:15px;letter-spacing:6px;opacity:.75;height:24px;border-bottom:1.5px dashed rgba(244,242,234,.28)}} .grp.pink{{color:{PK};opacity:1}}
.row{{display:grid;grid-template-columns:70px 1fr 150px 48px;align-items:center;height:53px;border-bottom:1.5px solid rgba(244,242,234,.12)}}
.t{{font-size:22px}} .v{{min-width:0}} .v b{{display:block;font-size:19px;white-space:nowrap}} .v s{{display:block;font-size:14px;opacity:.6;white-space:nowrap;overflow:hidden}}
.cells{{display:flex;gap:6px}} .cells i{{width:31px;height:31px;display:flex;align-items:center;justify-content:center;font-size:19px}} .got{{border:1.6px solid rgba(244,242,234,.42)}} .open{{border:2.2px dashed {LM}}}
.n{{color:{LM};font-size:18px;text-align:right}}
.tray{{position:absolute;left:-8px;right:-8px;bottom:-24px;height:16px;background:linear-gradient(180deg,#C5CBCE,#8F979B);box-shadow:0 4px 5px rgba(0,0,0,.18)}}
.tray i{{position:absolute;top:-6px;height:8px;border-radius:4px;background:{W_}}} .tray u{{position:absolute;left:110px;top:-15px;width:104px;height:17px;border-radius:3px;background:linear-gradient(180deg,#C7B796,#A69577)}}
/* 傍晚：整面墙一层很淡的暖光，从左上来，没有形状；四周轻轻压暗 */
.warm{{background:linear-gradient(115deg,rgba(255,196,130,.30) 0%,rgba(255,206,150,.12) 40%,rgba(255,210,160,0) 70%);mix-blend-mode:soft-light}}
.cool{{background:linear-gradient(180deg,rgba(0,0,0,0) 60%,rgba(20,40,45,.18) 100%);mix-blend-mode:multiply}}
.vig{{background:radial-gradient(115% 90% at 50% 42%,transparent 58%,rgba(20,16,12,.32) 100%)}}
.grain{{opacity:.07;mix-blend-mode:overlay}}
.subt{{position:absolute;left:0;right:0;top:1186px;text-align:center;font-family:{SANS};font-weight:500;font-size:33px;letter-spacing:3px;color:#FFFDF5;text-shadow:0 1px 4px rgba(0,0,0,.7)}}
.cred{{position:absolute;left:0;right:0;top:1250px;text-align:center;font-family:{NUM};font-size:13px;letter-spacing:7px;color:rgba(255,253,245,.8);text-shadow:0 1px 3px rgba(0,0,0,.6)}}
</style><body>
<svg width="0" height="0" style="position:absolute"><defs>
<filter id="chalk" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="2" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3 0 0 0 2.55" result="holes"/>
 <feComposite in="SourceGraphic" in2="holes" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="w"/>
 <feDisplacementMap in="c" in2="w" scale="2" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".3"/></filter>
<filter id="sb"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="slate"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/></filter></defs></svg>
<div class="layer wall"></div><div class="ceil"></div><div class="dado"></div><div class="floor"></div>
<svg class="layer" width="{W}" height="{H}"><defs>{lib.COMMON}</defs>{clock_svg(540, 132, 42)}</svg>
<div class="slog l">{''.join(f'<i>{c}</i>' for c in '好好打球')}</div><div class="slog r">{''.join(f'<i>{c}</i>' for c in '天天向上')}</div>
<div class="bwrap"><div class="board">
 <svg class="btex" width="964" height="596"><rect width="964" height="596" filter="url(#slate)"/><g filter="url(#sb)">{smear}</g>{ghost}{dust}</svg>
 {board_inner()}</div></div>
<div class="layer warm"></div><div class="layer cool"></div><div class="layer vig"></div>
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
