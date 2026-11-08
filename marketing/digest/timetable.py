"""明日时刻表 v2：HTML/CSS 排版（换行、截断、对齐交给浏览器），深 / 浅两套主题。"""
from common import *
GAMES = [  # 开始, 结束, 球场短名, 区, 类型, 水平下限, 上限, 已有人数, 标签, 球局码
    ('07:30', '09:00', 'Kooyong LTC', 'Kooyong', 'd', 3.0, 4.0, 2, '场地已订', '7Kq2'),
    ('08:00', '10:00', 'Fawkner Park', 'South Yarra', 's', 4.0, 5.0, 1, '', 'B5g1'),
    ('09:30', '11:30', 'Box Hill TC', 'Box Hill', 'r', 2.0, 3.0, 1, '新手友好', 'Hn4x'),
    ('10:00', '12:00', 'Caulfield Park', 'Caulfield North', 'd', 3.5, 4.5, 1, '', 'Q8rT'),
    ('14:00', '16:00', 'Glen Waverley TC', 'Glen Waverley', 'd', 3.0, 4.0, 3, '开新球', 'm2Vd'),
    ('16:30', '18:00', 'Albert Park LTC', 'Albert Park', 's', 4.5, 5.5, 1, '', 'Zc7p'),
    ('18:30', '20:30', 'Melbourne Park', 'Melbourne', 'd', 3.5, 4.5, 2, '场地已订', 'Wy3k'),
    ('19:00', '21:00', 'Doncaster TC', 'Doncaster', 'd', 2.5, 3.5, 2, '新手友好', 'Jf6s'),
]
SECTIONS = [('上午', 'MORNING', 0, 12), ('下午', 'AFTERNOON', 12, 17), ('晚上', 'EVENING', 17, 24)]
THEMES = {
    'dark':  dict(bg='radial-gradient(120% 90% at 25% 0%, #11523B 0%, #0B3B2A 55%, #05241A 100%)', ink='#F7EBD6', accent='#C6EA3D', mute='rgba(247,235,214,.55)', line='rgba(247,235,214,.12)', chip='#C6EA3D', chipInk='#0B3B2A', grain='overlay', gop=.14, dot='rgba(247,235,214,.28)'),
    'light': dict(bg='linear-gradient(180deg,#F8EEDA 0%,#F1E2C3 100%)', ink='#0B3B2A', accent='#C2410C', mute='rgba(11,59,42,.58)', line='rgba(11,59,42,.12)', chip='#0B3B2A', chipInk='#C6EA3D', grain='multiply', gop=.20, dot='rgba(11,59,42,.18)'),
}
def spots(): return sum(CAP[g[4]] - g[7] for g in GAMES)
EXPECT = lambda: [f'{spots()}个空位', f'{len(GAMES)}局在找人', '7Kq2']        # 数字核对：图里必须读得出这些

HEADLINE = lambda: (str(spots()), 'h1 .num')     # 标题里的空位数：按它在页面上的实际位置截图 OCR

def html(theme='dark'):
    T = THEMES[theme]; spot_on = '#C6EA3D' if theme == 'dark' else '#176B4D'
    rows = ''
    for zh, en, h0, h1 in SECTIONS:
        gs = [g for g in GAMES if h0 <= int(g[0][:2]) < h1]
        if not gs: continue
        rows += f'<div class="sec"><b>{zh}</b><i>{en}</i><span></span></div>'
        for t0, t1, v, sb, ty, lo, hi, have, tg, code in gs:
            cap = CAP[ty]; need = cap - have
            dots = ''.join(f'<em class="{"on" if k >= have else ""}"></em>' for k in range(cap))
            chip = f'<u>{tg}</u>' if tg == '新手友好' else ''
            meta = ' · '.join(x for x in (sb, TYPE[ty], tg if tg != '新手友好' else '') if x)
            need_t = '最后 1 位' if need == 1 else f'缺 {need} 位'
            rows += f'''<div class="row"><div class="t"><b>{t0}</b><s>至 {t1}</s></div>
<div class="v"><b>{esc(v)}{chip}</b><s>{esc(meta)}</s></div>
<div class="l"><b>{level_word(lo, hi)}</b><s>UTR {lo:.1f}–{hi:.1f}</s></div>
<div class="n"><span>{dots}</span><s>{need_t}</s></div>
<div class="c"><s>球局码</s><b>{code}</b></div></div>'''
    return f'''<!doctype html><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{width:1080px;height:1440px;overflow:hidden;background:{T['bg']};color:{T['ink']};font-family:{SANS};position:relative}}
.grain{{position:absolute;inset:0;opacity:{T['gop']};mix-blend-mode:{T['grain']};pointer-events:none}}
.wrap{{position:absolute;inset:0;padding:88px 84px 0}}
.tag{{font-size:17px;letter-spacing:9px;opacity:.7;font-weight:500}} .tag+i{{display:block;width:66px;height:3px;background:{T['accent']};margin-top:16px}}
.demo{{position:absolute;right:84px;top:76px;font-size:16px;letter-spacing:3px;border:1.5px solid currentColor;border-radius:17px;padding:5px 14px;opacity:.5}}
h1{{font-family:{SERIF};font-weight:700;font-size:72px;line-height:88px;letter-spacing:3px;margin-top:30px}} h1 em{{font-style:normal;color:{T['accent']}}}
h1 .num{{font-family:{NUM};font-weight:700;letter-spacing:0}}
.sub{{margin-top:22px;font-size:23px;letter-spacing:2px;color:{T['mute']};display:flex}} .sub span+span::before{{content:'';display:inline-block;width:5px;height:5px;border-radius:50%;background:currentColor;margin:0 16px;vertical-align:5px;opacity:.7}}
.legend{{display:flex;justify-content:flex-end;gap:18px;font-size:15px;color:{T['mute']};margin:20px 0 -6px}} .legend em{{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-1px;background:{T['dot']}}} .legend em.on{{background:{spot_on}}}
.sec{{display:flex;align-items:baseline;gap:14px;margin-top:14px;height:44px}} .sec b{{font-family:{SERIF};font-size:25px;color:{T['accent']}}} .sec i{{font-style:normal;font-size:12px;letter-spacing:6px;color:{T['mute']}}} .sec span{{flex:1;border-top:1px solid {T['line']};transform:translateY(-6px)}}
.row{{display:grid;grid-template-columns:150px 1fr 118px 118px 86px;align-items:center;height:78px;border-bottom:1px solid {T['line']}}} .row:last-child{{border:0}}
.row s{{text-decoration:none;display:block;font-size:17px;color:{T['mute']};margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
.t b{{font-family:{NUM};font-size:40px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-.5px;line-height:1}} .t s{{font-family:{NUM};font-variant-numeric:tabular-nums}}
.v{{min-width:0;padding-right:16px}} .v b{{font-size:28px;font-weight:700;display:flex;align-items:center;gap:10px;white-space:nowrap;line-height:1.1}}
.v u{{text-decoration:none;font-size:14px;font-weight:700;background:{T['chip']};color:{T['chipInk']};border-radius:6px;padding:3px 8px;letter-spacing:1px}}
.l b{{font-size:22px;font-weight:700}} .l s{{font-family:{NUM};font-variant-numeric:tabular-nums;font-size:15px}}
.n span{{display:flex;gap:7px}} .n em{{width:15px;height:15px;border-radius:50%;background:{T['dot']}}} .n em.on{{background:{spot_on}}} .n s{{font-weight:700;color:{T['accent']};font-size:18px}}
.c{{text-align:right}} .c s{{font-size:12px;letter-spacing:2px;margin:0 0 3px}} .c b{{font-family:{NUM};font-size:22px;font-weight:600;letter-spacing:.5px}}
.foot{{position:absolute;left:84px;right:84px;bottom:0;height:206px;border-top:1px solid {T['line']};display:flex;align-items:center;gap:28px}}
.cta{{flex:1}} .cta b{{display:block;font-family:{SERIF};font-size:28px;font-weight:700}} .cta code{{font-family:{NUM};font-weight:600;color:{T['accent']}}}
.cta s{{text-decoration:none;display:block;font-size:18px;color:{T['mute']};margin-top:10px;line-height:1.55}}
.qr{{text-align:center;font-size:13px;color:{T['mute']};letter-spacing:1px}} .qr svg{{display:block;margin-bottom:6px}}
.wm{{text-align:right;font-weight:700;font-size:30px;letter-spacing:9px}} .wm i{{display:block;font-style:normal;font-weight:400;font-size:11px;letter-spacing:5px;opacity:.6;margin-top:4px}}
</style><body>{GRAIN_SVG}<div class="wrap">
<div class="tag">TOMORROW · MELBOURNE · NO.{ISSUE}</div><i></i><div class="demo">示意数据</div>
<h1>明天，<br><em>还有 <span class="num">{spots()}</span> 个空位。</em></h1>
<div class="sub"><span>{DATE_ZH}</span><span>{len(GAMES)} 局在找人</span><span>{WEATHER.replace(' · ', ' ')}</span><span>日落 {SUNSET}</span></div>
<div class="legend"><span><em class="on"></em>空位</span><span><em></em>已有人</span></div>
{rows}
<div class="foot"><div class="cta"><b>浏览器打开 <code>{SITE}/g/球局码</code></b>
<s>直接看这一局、申请加入，不登录也能先看。<br>上一期 {LAST[0]} 局在找人，最后成了 {LAST[1]} 局。</s></div>
<div class="qr">{qr_svg(104, light='#FBF4E3')}微信长按识别</div>
<div class="wm">南伴球<i>NANBANQIU</i></div></div></div></body>'''
def svg(): return html('dark')
