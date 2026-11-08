"""明日球局 · 「邀请函」版（借鉴发布会邀请函的做法：一个有材质的主角符号 + 大留白 + 居中短句）。
主角：一根有光泽的多彩缎带一笔绕成的网球（带入场的尾巴）；标题「一拍即合。」。
spring = 亮白底彩色缎带；dusk = 黄昏山水 + 霓虹光圈网球 + 水面倒影。"""
from common import *
from timetable import GAMES, spots, level_word
import math
EXPECT = lambda: [f'{spots()}个空位', '7Kq2', '一拍即合']
HEADLINE = lambda: (str(spots()), '.k')
CX, CY, R = 540, 300, 158

def pt(deg): a = math.radians(deg); return CX + R * math.cos(a), CY + R * math.sin(a)
def geometry():
    ex, ey = pt(90); mx, my = pt(-80); sx, sy = pt(-220)           # 从正下方水平切入 → 逆时针绕一圈 → 左下方收尾，和尾巴留一点空隙
    loop = f'M150 500 C 250 440, 380 {ey:.1f}, {ex:.1f} {ey:.1f} A {R} {R} 0 0 0 {mx:.1f} {my:.1f} A {R} {R} 0 0 0 {sx:.1f} {sy:.1f}'
    k = R / 100
    def seam(sgn):   # lib.ball 的球缝曲线，放大、旋转
        pts = [(-67, -74), (-30, -34), (-30, 34), (-67, 74)]
        a = math.radians(-24); q = []
        for x, y in pts:
            x *= sgn * k; y *= k; q.append((CX + x * math.cos(a) - y * math.sin(a), CY + x * math.sin(a) + y * math.cos(a)))
        return 'M{:.1f} {:.1f} C {:.1f} {:.1f}, {:.1f} {:.1f}, {:.1f} {:.1f}'.format(*[c for p in q for c in p])
    return loop, seam(1), seam(-1)

GRAD = '''<linearGradient id="gL" gradientUnits="userSpaceOnUse" x1="150" y1="470" x2="700" y2="140"><stop offset="0" stop-color="#C6EA3D"/><stop offset=".35" stop-color="#3DDC97"/><stop offset=".7" stop-color="#2FB4FF"/><stop offset="1" stop-color="#7C6CFF"/></linearGradient>
<linearGradient id="gA" gradientUnits="userSpaceOnUse" x1="420" y1="160" x2="470" y2="450"><stop offset="0" stop-color="#FF5E9C"/><stop offset="1" stop-color="#FFB547"/></linearGradient>
<linearGradient id="gB" gradientUnits="userSpaceOnUse" x1="660" y1="160" x2="610" y2="450"><stop offset="0" stop-color="#FFD43B"/><stop offset="1" stop-color="#FF7A45"/></linearGradient>
<filter id="tube" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/>
 <feSpecularLighting in="b" surfaceScale="7" specularConstant=".85" specularExponent="24" lighting-color="#fff" result="s"><fePointLight x="420" y="40" z="300"/></feSpecularLighting>
 <feComposite in="s" in2="SourceAlpha" operator="in" result="s2"/><feComposite in="SourceGraphic" in2="s2" operator="arithmetic" k2="1" k3=".7"/></filter>
<filter id="soft" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="900"><feGaussianBlur stdDeviation="16"/></filter>
<filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="900"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="glow2" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="900"><feGaussianBlur stdDeviation="28"/></filter>'''

def hero(theme):
    loop, s1, s2 = geometry()
    strokes = lambda w, a, b, c, extra='': f'<g fill="none" stroke-linecap="round" {extra}><path d="{loop}" stroke="{a}" stroke-width="{w}"/><path d="{s1}" stroke="{b}" stroke-width="{w*.78:.1f}"/><path d="{s2}" stroke="{c}" stroke-width="{w*.78:.1f}"/></g>'
    if theme == 'spring':
        return f'''<svg class="hero" width="1080" height="600" viewBox="0 0 1080 600"><defs>{GRAD}</defs>
<g transform="translate(0 26)" opacity=".16" filter="url(#soft)">{strokes(26, '#3a4a40', '#3a4a40', '#3a4a40')}</g>
<g filter="url(#tube)">{strokes(26, 'url(#gL)', 'url(#gA)', 'url(#gB)')}</g></svg>'''
    # 黄昏：霓虹光圈 = 外层彩色大光晕 + 中层光 + 白色灯芯；水面倒影是一团横向拉长的光
    return f'''<svg class="hero" width="1080" height="900" viewBox="0 0 1080 900"><defs>{GRAD}
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5E6B93"/><stop offset=".55" stop-color="#C9A3BE"/><stop offset="1" stop-color="#F0C2C4"/></linearGradient>
<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C6A86"/><stop offset=".35" stop-color="#3D3A55"/><stop offset="1" stop-color="#14151F"/></linearGradient>
<radialGradient id="wglow"><stop offset="0" stop-color="#D8ECFF" stop-opacity=".55"/><stop offset="1" stop-color="#D8ECFF" stop-opacity="0"/></radialGradient>
<linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8A87A6"/><stop offset="1" stop-color="#6D6A88"/></linearGradient>
<linearGradient id="hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B3F52"/><stop offset="1" stop-color="#1C1E29"/></linearGradient></defs>
<rect width="1080" height="440" fill="url(#sky)"/><rect y="440" width="1080" height="460" fill="url(#lake)"/>
<path d="M0 300 C 160 250, 300 280, 420 330 S 560 360, 640 345 S 900 270, 1080 300 L1080 440 L0 440Z" fill="url(#far)" opacity=".8"/>
<path d="M0 170 C 90 150, 170 175, 260 230 S 420 360, 520 440 L0 440Z" fill="url(#hill)"/>
<path d="M1080 210 C 980 200, 900 240, 820 300 S 650 410, 560 440 L1080 440Z" fill="url(#hill)"/>
<path d="M0 440 H1080" stroke="#F3D3D0" stroke-opacity=".35"/>
<ellipse cx="540" cy="600" rx="340" ry="40" fill="url(#wglow)"/>
<g transform="translate(0 880) scale(1 -1)" opacity=".18" filter="url(#glow)">{strokes(16, 'url(#gL)', 'url(#gA)', 'url(#gB)')}</g>
<g filter="url(#glow2)" opacity=".9">{strokes(40, 'url(#gL)', 'url(#gA)', 'url(#gB)')}</g>
<g filter="url(#glow)">{strokes(18, 'url(#gL)', 'url(#gA)', 'url(#gB)')}</g>
{strokes(6, '#FFFFFF', '#FFFFFF', '#FFFFFF')}</svg>'''

def html(theme='spring'):
    D = theme == 'dusk'
    ink, mute, line = ('#FFFFFF', 'rgba(255,255,255,.62)', 'rgba(255,255,255,.14)') if D else ('#1D1D1F', '#6E6E73', '#E3E3E6')
    rows = ''
    for t0, t1, v, sb, ty, lo, hi, have, tg, code in GAMES:
        need = CAP[ty] - have
        meta = f'{sb} · {TYPE[ty]} · {level_word(lo, hi)}' + (' · 新手友好' if tg == '新手友好' else '')
        rows += f'<div class="row"><b class="t">{t0}</b><div class="v"><b>{esc(v)}</b><s>{esc(meta)}</s></div><b class="n">{"最后 1 位" if need == 1 else f"缺 {need} 位"}</b><s class="c">{code}</s></div>'
    return f'''<!doctype html><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}} s{{text-decoration:none}}
body{{width:1080px;height:1440px;overflow:hidden;font-family:{NUM},{SANS};color:{ink};position:relative;-webkit-font-smoothing:antialiased;
 background:{'#14151F' if D else 'radial-gradient(120% 70% at 50% 18%, #FFFFFF 0%, #F5F5F7 60%, #EFEFF2 100%)'}}}
.hero{{position:absolute;left:0;top:{'0' if D else '40px'}}}
.top{{position:absolute;left:0;right:0;top:56px;text-align:center;font-size:14px;letter-spacing:6px;color:{mute};font-weight:500}}
h1{{position:absolute;left:0;right:0;top:{'652px' if D else '630px'};text-align:center;font-family:{SANS};font-weight:700;font-size:84px;letter-spacing:6px;line-height:1}}
.p{{position:absolute;left:0;right:0;top:{'766px' if D else '746px'};text-align:center;font-family:{SANS};font-size:25px;line-height:1.65;color:{ink};opacity:.88}}
.k{{font-family:{NUM};font-weight:600}}
.list{{position:absolute;left:150px;right:150px;top:{'866px' if D else '852px'}}}
.row{{display:grid;grid-template-columns:104px 1fr 112px 64px;align-items:center;height:{'52px' if D else '56px'};border-top:1px solid {line}}}
.row:last-child{{border-bottom:1px solid {line}}}
.t{{font-weight:500;font-size:24px;font-variant-numeric:tabular-nums;letter-spacing:-.2px}}
.v{{display:flex;align-items:baseline;gap:12px;min-width:0;white-space:nowrap}} .v b{{font-weight:600;font-size:20px}} .v s{{font-family:{SANS};font-size:14px;color:{mute};overflow:hidden;text-overflow:ellipsis}}
.n{{font-family:{SANS};font-weight:700;font-size:17px;text-align:right;padding-right:16px;background:linear-gradient(90deg,#FF5E9C,#FF8A3D);-webkit-background-clip:text;background-clip:text;color:transparent}}
.c{{font-size:15px;letter-spacing:1.5px;color:{mute};text-align:right;font-weight:500}}
.foot{{position:absolute;left:0;right:0;bottom:58px;text-align:center;font-family:{SANS};font-size:16px;color:{mute};line-height:1.9}}
.foot b{{display:block;font-size:20px;letter-spacing:10px;color:{ink};font-weight:700;margin-top:10px}}
.demo{{position:absolute;right:36px;top:56px;font-family:{SANS};font-size:11px;letter-spacing:3px;color:{mute}}}
</style><body>{hero(theme)}
<div class="top">MELBOURNE · TOMORROW</div><div class="demo">示意数据</div>
<h1>一拍即合。</h1>
<div class="p">明天，墨尔本还有 <span class="k">{spots()}</span> 个空位。<br>挑一局，打开 {SITE}/g/ 加上球局码。</div>
<div class="list">{rows}</div>
<div class="foot">{DATE_ZH} · {WEATHER.replace(' · ', ' ')} · 上一期 {LAST[0]} 局成了 {LAST[1]} 局<b>南伴球</b></div></body>'''
