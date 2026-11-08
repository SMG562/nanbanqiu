"""明日球局 · 「黑板」版：明天，有体育课。
球局表写成小时候黑板上的课程表（第一节、午休、晚自习），右上角是老师写的日期、天气和「值日」；
粉笔字用 SVG 颗粒滤镜做出真实质感，黑板有擦痕和上节课的残影；底部一条金属粉笔槽代替木框。
字体：霞鹜文楷（LXGW WenKai，OFL 开源）。"""
import os, random
from common import *
from timetable import GAMES, spots, level_word
EXPECT = lambda: [f'{spots()}个空位', '7Kq2', '体育课']
HEADLINE = lambda: (str(spots()), '.kn')
FONT_DIR = os.environ.get('DIGEST_FONTS', '/tmp/digest_fonts')      # lxgw-wenkai-webfont 解压目录（package/）
WK = "'LXGW WenKai',serif"
CN = '一二三四五六七八九十'
WHITE, LIME, PINK, BLUE = '#F1F0E8', '#D4F25A', '#F5B8C4', '#A9D8F0'

def ring(open_, i):   # 空位 = 黄绿粉笔圈（等人填）；已有人 = 白粉笔涂满的圈
    rot = (i * 37) % 360
    if open_: return f'<svg width="29" height="29" viewBox="-15 -15 30 30"><path d="M-11 1 C-11 -8 -3 -12 4 -11 C11 -9 13 -1 11 5 C8 12 -4 13 -9 7" fill="none" stroke="{LIME}" stroke-width="2.6" stroke-linecap="round" transform="rotate({rot})"/></svg>'
    return f'<svg width="29" height="29" viewBox="-15 -15 30 30"><circle r="9" fill="{WHITE}" opacity=".55"/><path d="M-7 -3 L5 -8 M-8 3 L8 -4 M-5 8 L8 2" stroke="{WHITE}" stroke-width="2" stroke-linecap="round" opacity=".8"/></svg>'

def html():
    random.seed(11); rows = ''; n = 0; i = 0
    def divider(t): return f'<div class="div"><span></span><b>{t}</b><span></span></div>'
    for label, h0, h1 in (('', 0, 12), ('午　休', 12, 17), ('晚 自 习', 17, 24)):
        gs = [g for g in GAMES if h0 <= int(g[0][:2]) < h1]
        if not gs: continue
        if label: rows += divider(label)
        for t0, t1, v, sb, ty, lo, hi, have, tg, code in gs:
            need = CAP[ty] - have; n += 1
            rr = ''.join(ring(k >= have, i := i + 1) for k in range(CAP[ty]))
            nb = '<em>新手友好</em>' if tg == '新手友好' else ''
            rows += f'''<div class="row"><b class="no">第{CN[n-1]}节</b><b class="t">{t0}</b>
<div class="v"><b>{esc(v)}</b><s>{esc(sb)} · {TYPE[ty]} · {level_word(lo, hi)}{nb}</s></div>
<div class="n"><span>{rr}</span><b>{"最后 1 位" if need == 1 else f"缺 {need} 位"}</b></div><b class="c">{code}</b></div>'''
    smudge = ''.join(f'<ellipse cx="{random.randint(0,1080)}" cy="{random.randint(0,1340)}" rx="{random.randint(120,380)}" ry="{random.randint(40,120)}" fill="#fff" opacity="{random.uniform(.012,.035):.3f}" transform="rotate({random.randint(-20,20)})" filter="url(#bl)"/>' for _ in range(16))
    swipes = ''.join(f'<path d="M{x} {y} q 160 -50 330 6" stroke="#fff" stroke-width="{random.randint(40,70)}" stroke-linecap="round" fill="none" opacity="{random.uniform(.018,.04):.3f}" filter="url(#bl2)"/>' for x, y in [(80, 520), (560, 300), (120, 1180), (620, 980), (300, 760)])
    ghost = f'<g font-family="{WK}" fill="#fff" opacity=".05" filter="url(#bl1)"><text x="700" y="520" font-size="44" transform="rotate(-6 700 520)">15 · 30 · 40</text><text x="90" y="1250" font-size="38" transform="rotate(4 90 1250)">Deuce</text><text x="760" y="1290" font-size="30">平分后连赢两分</text></g>'
    return f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-bold.css"><link rel="stylesheet" href="file://{FONT_DIR}/lxgwwenkai-regular.css">
<style>
*{{margin:0;padding:0;box-sizing:border-box}} s,em{{text-decoration:none;font-style:normal}}
body{{width:1080px;height:1440px;overflow:hidden;position:relative;font-family:{WK};color:{WHITE};
 background:radial-gradient(90% 70% at 50% 42%, #2C3B34 0%, #23312B 55%, #18221E 100%)}}
.fx{{position:absolute;inset:0}}
.chalk{{filter:url(#chalk)}}
.top{{position:absolute;left:84px;top:70px;font-size:20px;letter-spacing:6px;opacity:.75}}
.date{{position:absolute;right:84px;top:62px;text-align:right;font-size:26px;line-height:1.55}} .date i{{font-style:normal;color:{BLUE}}} .date small{{display:block;font-size:20px;opacity:.75;margin-top:2px}}
h1{{position:absolute;left:80px;top:136px;font-weight:700;font-size:100px;line-height:1.1;letter-spacing:4px}} h1 em{{color:{LIME}}}
.uline{{position:absolute;left:186px;top:362px}}
.sub{{position:absolute;left:86px;top:404px;font-size:32px;letter-spacing:2px}} .k{{color:{LIME};font-weight:700;font-size:40px;padding:0 6px;position:relative}}
.k svg{{position:absolute;left:-12px;top:-6px}}
.tbl{{position:absolute;left:72px;right:72px;top:486px}}
.hd{{display:grid;grid-template-columns:96px 128px 1fr 244px 90px;font-size:17px;opacity:.55;letter-spacing:3px;padding:0 0 10px;border-bottom:2px solid rgba(241,240,232,.55)}}
.row{{display:grid;grid-template-columns:96px 128px 1fr 244px 90px;align-items:center;height:66px;border-bottom:1.5px solid rgba(241,240,232,.2)}}
.no{{font-size:22px;opacity:.7;font-weight:400}} .t{{font-size:36px;letter-spacing:.5px}}
.v b{{display:block;font-size:28px;font-weight:700;white-space:nowrap}} .v s{{display:block;font-size:18px;opacity:.62;margin-top:3px;white-space:nowrap}} .v em{{color:{PINK};margin-left:12px;opacity:1}}
.n{{display:flex;align-items:center;gap:10px}} .n span{{display:flex;gap:0;width:116px}} .n b{{color:{LIME};font-size:23px;white-space:nowrap}}
.c{{text-align:right;font-size:26px;letter-spacing:1px}}
.div{{display:flex;align-items:center;gap:18px;height:42px;font-size:19px;letter-spacing:6px;opacity:.6;border-bottom:1.5px solid rgba(241,240,232,.2)}} .div span{{flex:1;border-top:2px dashed rgba(241,240,232,.35)}}
.how{{position:absolute;left:84px;top:1196px;font-size:27px;line-height:1.6}} .how b{{color:{LIME}}} .how small{{display:block;font-size:20px;opacity:.6}}
.wm{{position:absolute;right:84px;top:1204px;text-align:right;font-weight:700;font-size:40px;letter-spacing:10px}} .wm small{{display:block;font-weight:400;font-size:15px;letter-spacing:4px;opacity:.55;margin-top:2px}}
.demo{{position:absolute;left:84px;top:104px;font-size:14px;letter-spacing:4px;opacity:.4}}
</style><body>
<svg class="fx" width="1080" height="1440"><defs>
<filter id="chalk" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="2" result="n"/>
 <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3 0 0 0 2.55" result="holes"/>
 <feComposite in="SourceGraphic" in2="holes" operator="in" result="c"/><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="5" result="w"/>
 <feDisplacementMap in="c" in2="w" scale="2.2" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation=".35"/></filter>
<filter id="bl" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1480" height="1840"><feGaussianBlur stdDeviation="40"/></filter>
<filter id="bl2" filterUnits="userSpaceOnUse" x="-200" y="-200" width="1480" height="1840"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="bl1" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1440"><feGaussianBlur stdDeviation="1.4"/></filter>
<filter id="dust"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="1" seed="9"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.4 1.25"/></filter>
<linearGradient id="tray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9AA19E"/><stop offset=".25" stop-color="#C9CECB"/><stop offset=".6" stop-color="#7E8582"/><stop offset="1" stop-color="#4B514E"/></linearGradient>
<linearGradient id="stick" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
</defs>
{smudge}{swipes}{ghost}
<rect width="1080" height="1440" filter="url(#dust)" opacity=".05"/>
<rect x="0" y="1356" width="1080" height="84" fill="#141B18"/>
<rect x="0" y="1348" width="1080" height="34" fill="url(#tray)"/><rect x="0" y="1348" width="1080" height="2" fill="#E8ECEA" opacity=".6"/>
<g transform="translate(700 1340)"><rect x="0" y="-2" width="96" height="14" rx="6" fill="{WHITE}"/><rect x="0" y="-2" width="96" height="14" rx="6" fill="url(#stick)"/></g>
<g transform="translate(812 1342) rotate(-3)"><rect x="0" y="-2" width="58" height="13" rx="6" fill="{LIME}"/><rect x="0" y="-2" width="58" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(884 1340)"><rect x="0" y="-2" width="40" height="13" rx="6" fill="{PINK}"/><rect x="0" y="-2" width="40" height="13" rx="6" fill="url(#stick)"/></g>
<g transform="translate(120 1316)"><rect width="150" height="30" rx="5" fill="#C8B79A"/><rect y="24" width="150" height="10" rx="3" fill="#3E4642"/><rect y="20" width="150" height="5" fill="#fff" opacity=".25"/></g>
<ellipse cx="560" cy="1354" rx="200" ry="5" fill="#fff" opacity=".18" filter="url(#bl2)"/>
</svg>
<div class="chalk">
<div class="top">MELBOURNE · 第 {ISSUE} 期</div><div class="demo">示意数据</div>
<div class="date">{TOMORROW.month} 月 {TOMORROW.day} 日　星期{WD[TOMORROW.weekday()]}<br><i>晴</i> 22°C　微风<small>值日：南伴球</small></div>
<h1>明天，<br><em>有体育课。</em></h1>
<svg class="uline" width="460" height="30"><path d="M6 18 C 120 6, 300 6, 420 14" stroke="{LIME}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M40 26 C 160 18, 300 18, 420 22" stroke="{LIME}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/></svg>
<svg style="position:absolute;left:770px;top:196px" width="230" height="170" viewBox="0 0 230 170"><circle cx="160" cy="70" r="46" fill="none" stroke="{LIME}" stroke-width="4"/><path d="M128 37 C 150 60, 150 82, 128 104 M192 37 C 170 60, 170 82, 192 104" stroke="{LIME}" stroke-width="3" fill="none"/><g stroke="{WHITE}" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M98 52 L 30 40"/><path d="M96 74 L 14 74"/><path d="M100 96 L 40 110"/></g><path d="M120 150 q 40 -14 80 0" stroke="{WHITE}" stroke-width="2.5" fill="none" opacity=".5"/></svg>
<div class="sub">墨尔本还有 <span class="k"><span class="kn">{spots()}</span><svg width="78" height="62" viewBox="0 0 78 62"><path d="M8 34 C 4 12, 40 2, 62 12 C 78 22, 72 50, 44 56 C 20 60, 6 48, 12 28" fill="none" stroke="{WHITE}" stroke-width="2.4" opacity=".75"/></svg></span> 个空位，自愿报名。</div>
<div class="tbl"><div class="hd"><span>节次</span><span>时间</span><span>球场 · 打法 · 水平</span><span>空位</span><span style="text-align:right">球局码</span></div>{rows}</div>
<div class="how">报名方法：浏览器打开 <b>{SITE}/g/</b> + 球局码<small>上一期 {LAST[0]} 局在找人，最后成了 {LAST[1]} 局。</small></div>
<div class="wm">南伴球<small>NANBANQIU</small></div>
</div></body>'''
