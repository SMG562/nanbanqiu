"""明日时刻表 · 编辑排版版（减法）：不用卡片、色块、标签、图标，只靠字号、字重、留白和细线建立层次。
两套气质：noir（纯黑 + 侧光网球，唯一强调色只给空位数）· atelier（象牙纸 + 墨黑衬线，唯一颜色是一颗小球）。"""
from common import *
from timetable import GAMES, spots, level_word
EXPECT = lambda: [f'{spots()}', '个空位', '7Kq2']
HEADLINE = lambda: (str(spots()), '.big')
SEC = [('上午', 0, 12), ('下午', 12, 17), ('晚上', 17, 24)]
T = {
  'noir':    dict(bg='#0A0A0A', ink='#F5F5F2', mute='rgba(245,245,242,.46)', faint='rgba(245,245,242,.13)', acc='#C6EA3D', big=f"{NUM}", bigw=200, h=SANS, hw=300, grain='overlay', gop=.10),
  'atelier': dict(bg='#F3EFE7', ink='#141414', mute='rgba(20,20,20,.5)', faint='rgba(20,20,20,.16)', acc='#141414', big=SERIF, bigw=300, h=SERIF, hw=400, grain='multiply', gop=.14),
}

def hero(theme):
    if theme == 'noir':   # 产品照式：大球从右上角探进来，右上方主光、左下方隐入黑暗
        return f'''<svg class="hero" width="1080" height="640" viewBox="0 0 1080 640"><defs>{lib.COMMON}
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#C6EA3D" stop-opacity=".22"/><stop offset="1" stop-color="#C6EA3D" stop-opacity="0"/></radialGradient>
<radialGradient id="shade" cx="78%" cy="18%" r="85%"><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".78"/><stop offset="1" stop-color="#000" stop-opacity=".95"/></radialGradient></defs>
<circle cx="900" cy="150" r="420" fill="url(#glow)"/>
{ball("hero", 900, 150, 300, rot=-58)}
<circle cx="900" cy="150" r="301" fill="url(#shade)"/></svg>'''
    return f'<svg class="dot" width="56" height="56" viewBox="-28 -28 56 56">{ball("dot", 0, 0, 25, rot=-35)}</svg>'

def html(theme='noir'):
    c = T[theme]; rows = ''
    for zh, h0, h1 in SEC:
        gs = [g for g in GAMES if h0 <= int(g[0][:2]) < h1]
        if not gs: continue
        rows += f'<div class="sec">{zh}</div>'
        for t0, t1, v, sb, ty, lo, hi, have, tg, code in gs:
            need = CAP[ty] - have
            meta = ' · '.join(x for x in (sb, TYPE[ty], f'{level_word(lo, hi)} {lo:.1f}–{hi:.1f}') if x)
            nb = f'<em>新手友好</em>' if tg == '新手友好' else ''
            rows += f'<div class="row"><div class="t">{t0}</div><div class="v"><b>{esc(v)}</b><s>{esc(meta)}{nb}</s></div><div class="n">{need}<s>{"空位" if need > 1 else "最后一位"}</s></div><div class="c">{code}</div></div>'
    return f'''<!doctype html><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em{{text-decoration:none;font-style:normal}}
body{{width:1080px;height:1440px;overflow:hidden;background:{c['bg']};color:{c['ink']};font-family:{SANS};position:relative;-webkit-font-smoothing:antialiased}}
.grain{{position:absolute;inset:0;opacity:{c['gop']};mix-blend-mode:{c['grain']}}}
.hero{{position:absolute;right:0;top:0}} .dot{{position:absolute;left:0;top:0}}
.top{{position:absolute;left:80px;top:72px;right:80px;display:flex;justify-content:space-between;font-family:{NUM};font-size:13px;letter-spacing:5px;color:{c['mute']}}}
.big{{position:absolute;left:66px;top:150px;font-family:{c['big']};font-weight:{c['bigw']};font-size:270px;line-height:.74;letter-spacing:{'-14px' if theme=='noir' else '-6px'};color:{c['ink']}}}
.h{{position:absolute;left:80px;top:404px;font-family:{c['h']};font-weight:{c['hw']};font-size:44px;letter-spacing:4px}}
.d{{position:absolute;left:80px;top:470px;font-size:18px;letter-spacing:3px;color:{c['mute']}}}
.list{{position:absolute;left:80px;right:80px;top:546px}}
.sec{{font-size:12px;letter-spacing:6px;color:{c['mute']};margin:16px 0 0;padding-bottom:9px;border-bottom:1px solid {c['ink']}}}
.sec:first-child{{margin-top:0}}
.row{{display:grid;grid-template-columns:168px 1fr 120px 92px;align-items:center;height:70px;border-bottom:1px solid {c['faint']}}}
.t{{font-family:{NUM};font-weight:300;font-size:38px;letter-spacing:-.5px;font-variant-numeric:tabular-nums}}
.v b{{display:block;font-weight:500;font-size:24px;letter-spacing:.3px}} .v s{{display:block;font-size:14px;letter-spacing:1px;color:{c['mute']};margin-top:6px}}
.v em{{color:{c['acc'] if theme=='noir' else c['ink']};margin-left:14px;{'' if theme=='noir' else 'font-weight:700;'}}}
.n{{font-family:{NUM};font-weight:300;font-size:38px;color:{c['acc']};text-align:right;padding-right:28px;line-height:1}} .n s{{display:block;font-family:{SANS};font-size:11px;letter-spacing:3px;color:{c['mute']};margin-top:6px}}
.c{{font-family:{NUM};font-size:15px;letter-spacing:3px;text-align:right;color:{c['mute']}}}
.foot{{position:absolute;left:80px;right:80px;bottom:58px;display:flex;justify-content:space-between;align-items:flex-end}}
.foot p{{font-size:16px;letter-spacing:2px;color:{c['mute']};line-height:1.9}} .foot p b{{color:{c['ink']};font-weight:500;font-family:{NUM};letter-spacing:1px}}
.wm{{font-weight:{'500' if theme=='noir' else '700'};font-size:22px;letter-spacing:12px;text-align:right}} .wm i{{display:block;font-style:normal;font-family:{NUM};font-size:10px;letter-spacing:6px;color:{c['mute']};margin-top:8px}}
.stop{{display:inline-block;position:relative;width:62px;height:56px;margin-left:10px}} .stop .dot{{top:auto;bottom:-2px}}
.demo{{position:absolute;left:80px;bottom:30px;font-size:11px;letter-spacing:4px;color:{c['mute']}}}
</style><body>{GRAIN_SVG}{hero(theme) if theme == 'noir' else ''}
<div class="top">{'<span>MELBOURNE　·　NO.' + str(ISSUE) + '</span>' if theme == 'noir' else '<span>MELBOURNE</span><span>NO.' + str(ISSUE) + '</span>'}</div>
<div class="big">{spots()}{'' if theme == 'noir' else '<span class="stop">' + hero(theme) + '</span>'}</div>
<div class="h">个空位，明天见。</div>
<div class="d">{DATE_ZH}　　{len(GAMES)} 局　　{WEATHER.replace(' · ', ' ')}</div>
<div class="list">{rows}</div>
<div class="foot"><p>想加入哪一局，打开 <b>{SITE}/g/</b> 加右边的球局码<br>上一期 {LAST[0]} 局在找人，成了 {LAST[1]} 局</p><div class="wm">南伴球<i>NANBANQIU</i></div></div>
<div class="demo">示意数据</div></body>'''
