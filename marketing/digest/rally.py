"""明日时刻表 · 「Rally」版：一记挥拍把画面劈成两半——上半深绿夜场，下半满版荧光黄绿；
超粗前倾的空位数、穿过斜线的网球和速度线给画面动作；唯一的爆点色（珊瑚红）只给「还缺几位」。"""
from common import *
from timetable import GAMES, spots, level_word
EXPECT = lambda: [f'{spots()}', '个空位', '7Kq2']
HEADLINE = lambda: (str(spots()), '.big')
DEEP, LIME, HOT, CREAM = '#0B3B2A', '#C6EA3D', '#FF5A36', '#F7EBD6'
CUT = (0, 640, 1080, 470)           # 斜线：左边 y=640，右边 y=470

def art():
    x0, y0, x1, y1 = CUT; k = (y1 - y0) / (x1 - x0)
    bx, by = 860, y0 + k * 860       # 球正好压在斜线上
    streaks = ''.join(f'<path d="M{bx-70-d*1.2:.0f} {by-38-o:.0f} L{bx-70-d*1.2-L:.0f} {by-38-o-L*.26:.0f}" stroke="{c}" stroke-width="{w}" stroke-linecap="round" opacity="{op}"/>'
                      for d, o, L, w, c, op in [(0, -6, 230, 6, LIME, .9), (30, 22, 300, 4, CREAM, .5), (10, 50, 180, 3, LIME, .6), (60, -30, 150, 2, CREAM, .4), (90, 76, 110, 2, LIME, .35)])
    return f'''<svg class="artbg" width="1080" height="1440" viewBox="0 0 1080 1440"><defs>{lib.COMMON}
<linearGradient id="nite" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0E4A35"/><stop offset=".7" stop-color="{DEEP}"/><stop offset="1" stop-color="#062419"/></linearGradient>
<linearGradient id="lm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D4F04E"/><stop offset="1" stop-color="#BFE23A"/></linearGradient></defs>
<rect width="1080" height="1440" fill="url(#lm)"/>
<path d="M0 0 H1080 V{y1} L0 {y0} Z" fill="url(#nite)"/>
<g opacity=".08" stroke="{CREAM}" stroke-width="2"><path d="M40 0 V{y0}"/><path d="M1040 0 V{y1}"/><path d="M40 300 H1040"/></g>
{streaks}
<ellipse cx="{bx+30}" cy="{by+92}" rx="70" ry="12" fill="{DEEP}" opacity=".35" filter="url(#bl14)"/>
{ball("rally", round(bx), round(by), 86, rot=-50)}
<g stroke="{CREAM}" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M{bx+100:.0f} {by-70:.0f} l18 -16"/><path d="M{bx+112:.0f} {by-28:.0f} l26 -4"/><path d="M{bx+76:.0f} {by-100:.0f} l6 -24"/></g>
<path d="M0 1306 L1080 1262 V1440 H0 Z" fill="{DEEP}"/></svg>'''

def html():
    rows = ''
    for t0, t1, v, sb, ty, lo, hi, have, tg, code in GAMES:
        need = CAP[ty] - have
        meta = ' · '.join((sb, TYPE[ty], f'{level_word(lo, hi)} {lo:.1f}–{hi:.1f}'))
        nb = '<em>新手友好</em>' if tg == '新手友好' else ''
        rows += f'<div class="row"><div class="t">{t0}</div><div class="v"><b>{esc(v)}</b><s>{esc(meta)}{nb}</s></div><div class="n"><b>{need}</b><s>{"最后一位" if need == 1 else "空位"}</s></div><div class="c">{code}</div></div>'
    return f'''<!doctype html><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em{{text-decoration:none;font-style:normal}}
body{{width:1080px;height:1440px;overflow:hidden;font-family:{SANS};color:{DEEP};position:relative;background:{LIME}}}
.artbg{{position:absolute;inset:0}} .grain{{position:absolute;inset:0;opacity:.12;mix-blend-mode:overlay}}
.top{{position:absolute;left:72px;top:64px;font-family:{NUM};font-weight:600;font-size:14px;letter-spacing:6px;color:{CREAM};opacity:.7}}
.big{{position:absolute;left:44px;top:118px;font-family:{NUM};font-weight:900;font-size:360px;line-height:.73;letter-spacing:-18px;color:{LIME};transform:skewX(-11deg);transform-origin:left bottom}}
.h{{position:absolute;left:520px;top:150px;font-family:{SANS};font-weight:900;font-size:66px;line-height:84px;color:{CREAM};letter-spacing:2px}} .h em{{color:{LIME}}}
.d{{position:absolute;left:524px;top:336px;font-size:19px;letter-spacing:2px;color:{CREAM};opacity:.65}}
.list{{position:absolute;left:72px;right:72px;top:668px}}
.row{{display:grid;grid-template-columns:172px 1fr 128px 86px;align-items:center;height:74px;border-top:1.5px solid rgba(11,59,42,.22)}}
.row:first-child{{border-top:3px solid {DEEP}}}
.t{{font-family:{NUM};font-weight:900;font-size:40px;letter-spacing:-1px;transform:skewX(-11deg);font-variant-numeric:tabular-nums}}
.v b{{display:block;font-weight:900;font-size:25px}} .v s{{display:block;font-size:15px;letter-spacing:.5px;opacity:.68;margin-top:5px;font-weight:500}}
.v em{{margin-left:14px;font-weight:900;color:{DEEP}}} .v em::before{{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;background:{HOT};margin-right:6px;vertical-align:1px}}
.n{{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding-right:24px}} .n b{{font-family:{NUM};font-weight:900;font-size:46px;color:{HOT};transform:skewX(-11deg);line-height:1}} .n s{{font-size:13px;font-weight:700;width:30px;line-height:1.25}}
.c{{font-family:{NUM};font-weight:700;font-size:17px;letter-spacing:2px;text-align:right}}
.foot{{position:absolute;left:72px;right:72px;bottom:52px;display:flex;justify-content:space-between;align-items:flex-end;color:{CREAM}}}
.foot p{{font-size:18px;line-height:1.75;opacity:.9}} .foot p b{{font-family:{NUM};color:{LIME};font-weight:800;letter-spacing:.5px}} .foot p span{{opacity:.6;font-size:15px}}
.wm{{font-weight:900;font-size:26px;letter-spacing:10px;text-align:right}} .wm i{{display:block;font-style:normal;font-family:{NUM};font-weight:600;font-size:10px;letter-spacing:6px;opacity:.55;margin-top:8px}}
.demo{{position:absolute;right:72px;top:62px;font-size:11px;letter-spacing:4px;color:{CREAM};opacity:.5}}
</style><body>{art()}{GRAIN_SVG}
<div class="top">MELBOURNE · TOMORROW · NO.{ISSUE}</div><div class="demo">示意数据</div>
<div class="big">{spots()}</div>
<div class="h">个空位，<br><em>等你出汗。</em></div>
<div class="d">{DATE_ZH} · {len(GAMES)} 局 · {WEATHER.replace(' · ', ' ')}</div>
<div class="list">{rows}</div>
<div class="foot"><p>想上哪一局：打开 <b>{SITE}/g/</b> + 右边的球局码<br><span>上一期 {LAST[0]} 局在找人，成了 {LAST[1]} 局</span></p><div class="wm">南伴球<i>NANBANQIU</i></div></div></body>'''
