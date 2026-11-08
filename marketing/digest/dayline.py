"""明日时刻表 · 「一天」版：背景是明天从清晨到夜里的天色，球局卡片沿时间轴排开；空位画成小网球。"""
from common import *
from timetable import GAMES, spots, level_word
EXPECT = lambda: [f'{spots()}个空位', f'{len(GAMES)}局', '7Kq2']
HEADLINE = lambda: (str(spots()), '.big')
DEEP, CLAY = '#0B3B2A', '#C2410C'

def mini_ball(i, r=13):
    return f'<svg width="{2*r+4}" height="{2*r+4}" viewBox="{-r-2} {-r-2} {2*r+4} {2*r+4}">{ball("m" + str(i), 0, 0, r)}</svg>'

def icon(kind):   # 时间轴上的日出 / 太阳 / 月亮
    if kind == 'am': return f'<svg width="40" height="40" viewBox="-20 -20 40 40"><circle r="19" fill="#FFF7E6"/><path d="M-11 5 A11 11 0 0 1 11 5Z" fill="#F2B134"/><path d="M-14 5H14" stroke="{DEEP}" stroke-width="2" stroke-linecap="round"/>' + ''.join(f'<path d="M{8*math.cos(a):.1f} {5-8*math.sin(a):.1f} L{13*math.cos(a):.1f} {5-13*math.sin(a):.1f}" stroke="#F2B134" stroke-width="2" stroke-linecap="round" transform="translate(0 -6)"/>' for a in (0.5, 1.57, 2.64)) + '</svg>'
    if kind == 'pm': return f'<svg width="40" height="40" viewBox="-20 -20 40 40"><circle r="19" fill="#FFF7E6"/><circle r="8" fill="#E8643C"/>' + ''.join(f'<path d="M{11*math.cos(a):.1f} {11*math.sin(a):.1f} L{15*math.cos(a):.1f} {15*math.sin(a):.1f}" stroke="#E8643C" stroke-width="2" stroke-linecap="round"/>' for a in [k * math.pi / 4 for k in range(8)]) + '</svg>'
    return f'<svg width="40" height="40" viewBox="-20 -20 40 40"><circle r="19" fill="{DEEP}"/><path d="M4 -9 A10 10 0 1 0 6 9 A8 8 0 1 1 4 -9Z" fill="#F7EBD6"/></svg>'
import math
SEC = [('am', '上午', 0, 12), ('pm', '下午', 12, 17), ('ev', '晚上', 17, 24)]

def html():
    cards, bi = '', 0
    for kind, zh, h0, h1 in SEC:
        gs = [g for g in GAMES if h0 <= int(g[0][:2]) < h1]
        for j, (t0, t1, v, sb, ty, lo, hi, have, tg, code) in enumerate(gs):
            cap = CAP[ty]; need = cap - have
            balls = ''
            for k in range(cap):
                if k < have: balls += '<i></i>'
                else: balls += mini_ball(bi); bi += 1
            chip = f'<u>{tg}</u>' if tg == '新手友好' else ''
            meta = ' · '.join(x for x in (sb, TYPE[ty], tg if tg != '新手友好' else '') if x)
            mark = f'<div class="ic">{icon(kind)}<span>{zh}</span></div>' if j == 0 else ''
            cards += f'''<div class="card {kind}">{mark}<div class="t"><b>{t0}</b><s>至 {t1}</s></div>
<div class="v"><b>{esc(v)}{chip}</b><s>{esc(meta)}</s></div>
<div class="l"><b>{level_word(lo, hi)}</b><s>UTR {lo:.1f}–{hi:.1f}</s></div>
<div class="n"><span>{balls}</span><s class="{"last" if need == 1 else ""}">{"最后 1 位" if need == 1 else f"缺 {need} 位"}</s></div>
<div class="c">{code}</div></div>'''
    import random; random.seed(3)
    stars = ''.join(f'<circle cx="{random.randint(20,1060)}" cy="{random.randint(1268,1430)}" r="{random.choice((1,1,1.4,2))}" fill="#F7EBD6" opacity="{random.uniform(.25,.7):.2f}"/>' for _ in range(46))
    fly = f'''<svg class="fly" width="1080" height="440" viewBox="0 0 1080 440"><defs>{lib.COMMON}<linearGradient id="trail" x1="0" x2="1"><stop offset="0" stop-color="{DEEP}" stop-opacity="0"/><stop offset="1" stop-color="{DEEP}" stop-opacity=".45"/></linearGradient></defs>
<path d="M720 440 C 760 330, 800 260, 866 226" fill="none" stroke="url(#trail)" stroke-width="2.5" stroke-dasharray="2 12" stroke-linecap="round"/>
<g opacity=".25" stroke="{DEEP}" stroke-width="3" stroke-linecap="round"><path d="M838 188 l-44 -2"/><path d="M842 212 l-60 4"/><path d="M848 236 l-42 8"/></g>
{ball("fly", 910, 212, 58, rot=-40)}</svg>'''
    return f'''<!doctype html><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}} s,u{{text-decoration:none}}
body{{width:1080px;height:1440px;overflow:hidden;font-family:{SANS};color:{DEEP};position:relative;
 background:linear-gradient(180deg,#FBDDBD 0%,#F8ECD6 22%,#EEF1DE 44%,#E3ECD8 60%,#F3D9B6 76%,#E9A87E 84%,#2E4A3A 90%,#0B2E22 94%,#06201A 100%)}}
.grain{{position:absolute;inset:0;opacity:.16;mix-blend-mode:multiply}}
.fly{{position:absolute;left:0;top:0}}
.head{{position:absolute;left:76px;top:78px;right:84px}}
.tag{{font-size:17px;letter-spacing:9px;font-weight:500;opacity:.65}}
.demo{{position:absolute;right:0;top:-8px;font-size:15px;letter-spacing:3px;border:1.5px solid currentColor;border-radius:17px;padding:4px 13px;opacity:.45}}
.hero{{display:flex;align-items:flex-end;gap:22px;margin-top:6px}}
.big{{font-family:{NUM};font-weight:800;font-size:236px;line-height:.8;letter-spacing:-10px;color:{DEEP}}}
.hero h1{{font-family:{SERIF};font-weight:700;font-size:58px;line-height:70px;letter-spacing:2px;padding-bottom:6px}} .hero h1 em{{font-style:normal;color:{CLAY}}}
.lg{{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:15px;font-weight:400;letter-spacing:1px}} .lg i{{width:11px;height:11px;border-radius:50%;background:rgba(11,59,42,.25);margin-left:12px}} .meta .lg::before{{display:none}}
.meta{{margin-top:30px;align-items:center;font-size:22px;letter-spacing:2px;opacity:.7;display:flex}} .meta span+span::before{{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;margin:0 14px;vertical-align:5px}}
.list{{position:absolute;left:66px;right:72px;top:452px}}
.list::before{{content:'';position:absolute;left:34px;top:-20px;bottom:30px;border-left:2px dotted rgba(11,59,42,.3)}}
.card{{position:relative;margin:0 0 12px 88px;height:88px;border-radius:22px;background:rgba(255,253,248,.86);box-shadow:0 10px 28px -14px rgba(11,59,42,.35),0 1px 0 rgba(255,255,255,.9) inset;
 display:grid;grid-template-columns:132px 1fr 100px 150px 92px;align-items:center;padding:0 22px 0 26px;backdrop-filter:blur(6px)}}
.card.ev{{background:rgba(255,250,242,.9)}}
.ic{{position:absolute;left:-74px;top:24px;text-align:center;width:40px}} .ic svg{{display:block}} .ic span{{display:block;font-size:13px;font-weight:700;letter-spacing:1px;margin-top:4px;white-space:nowrap}}
.card s{{display:block;font-size:16px;color:rgba(11,59,42,.55);margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.t b{{font-family:{NUM};font-size:36px;font-weight:700;letter-spacing:-.5px;font-variant-numeric:tabular-nums;line-height:1}} .t s{{font-family:{NUM}}}
.v{{min-width:0;padding-right:12px}} .v b{{font-size:26px;font-weight:700;display:flex;align-items:center;gap:9px;white-space:nowrap;line-height:1.1}}
.v u{{font-size:13px;font-weight:700;background:#C6EA3D;border-radius:6px;padding:3px 8px;letter-spacing:1px}}
.l b{{font-size:21px}} .l s{{font-family:{NUM};font-size:14px}}
.n span{{display:flex;align-items:center;gap:2px;height:30px}} .n i{{width:14px;height:14px;margin:0 7px;border-radius:50%;background:rgba(11,59,42,.2)}}
.n s{{font-weight:700;color:{DEEP};font-size:17px;margin-top:2px}} .n s.last{{color:{CLAY}}}
.c{{justify-self:end;font-family:{NUM};font-weight:700;font-size:19px;letter-spacing:.5px;color:#C6EA3D;background:{DEEP};border-radius:12px;padding:8px 12px}}
.night{{position:absolute;left:0;right:0;bottom:0;height:178px}}
.foot{{position:absolute;left:84px;right:84px;bottom:34px;display:flex;align-items:center;gap:26px;color:#F7EBD6}}
.cta{{flex:1}} .cta b{{display:block;font-size:27px;font-weight:700}} .cta code{{font-family:{NUM};color:#C6EA3D}}
.cta s{{display:block;font-size:17px;opacity:.65;margin-top:9px}}
.qr{{font-size:12px;text-align:center;opacity:.85}} .qr svg{{display:block;margin-bottom:4px}}
.wm{{font-weight:700;font-size:30px;letter-spacing:9px;text-align:right}} .wm i{{display:block;font-style:normal;font-weight:400;font-size:11px;letter-spacing:5px;opacity:.6;margin-top:4px}}
</style><body>{GRAIN_SVG}{fly}
<div class="head"><div class="tag">TOMORROW · MELBOURNE · NO.{ISSUE}</div><div class="demo">示意数据</div>
<div class="hero"><div class="big">{spots()}</div><h1>个空位，<br><em>明天等人来。</em></h1></div>
<div class="meta"><span>{DATE_ZH}</span><span>{len(GAMES)} 局</span><span>{WEATHER.replace(' · ', ' ')}</span><span>日落 {SUNSET}</span><b class="lg">{mini_ball('lg', 10)}空位<i></i>已有人</b></div></div>
<div class="list">{cards}</div>
<svg class="night" width="1080" height="178" viewBox="0 1262 1080 178">{stars}</svg>
<div class="foot"><div class="cta"><b>浏览器打开 <code>{SITE}/g/球局码</code></b><s>上一期 {LAST[0]} 局在找人，最后成了 {LAST[1]} 局。</s></div>
<div class="qr">{qr_svg(92)}微信长按识别</div><div class="wm">南伴球<i>NANBANQIU</i></div></div></body>'''
