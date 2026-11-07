from lib import *
from gf import *

META = dict(
    id=96, slug='snow-gate', title='雪初霁', lines=['雪初霁，', '能打一局无。'],
    style=['古风', '写实光影'], tone='亮色', demo=False,
    concept='雪后初晴：朱红宫墙覆着白雪，月洞门里是雪中的松和远山；一枝红梅横在前面，球拍像一柄剑斜倚在雪里，一颗球半埋在雪中。化用白居易「能饮一杯无」',
    use='古风系列：雪停天晴，约一局',
)


def svg():
    rnd = random.Random(96)
    wy0, wy1 = 560, 1030          # 墙的上沿、下沿（地面）
    gx, gy, gr = 640, 830, 210   # 月洞门
    # 墙后：浅蓝天
    # 墙顶瓦檐 + 积雪
    coping = f'''<rect x="-20" y="{wy0-46}" width="1120" height="40" fill="#3E4654"/>
{''.join(f'<rect x="{x}" y="{wy0-46}" width="14" height="40" fill="#525B6B"/>' for x in range(-20, 1100, 30))}
<rect x="-20" y="{wy0-8}" width="1120" height="14" fill="#2F3540"/>
<path d="M-20 {wy0-44} {' '.join(f'Q{x+30} {wy0-76 - rnd.uniform(0, 10):.0f} {x+60} {wy0-50}' for x in range(-20, 1100, 60))} L1100 {wy0-40} L-20 {wy0-40}Z" fill="#FFFFFF"/>
<path d="M-20 {wy0-42} H1100" stroke="#D5E2F2" stroke-width="3"/>'''
    # 月洞门里的景：雪松与远山
    inside = f'''<clipPath id="gc96"><circle cx="{gx}" cy="{gy}" r="{gr}"/></clipPath>
<g clip-path="url(#gc96)">
<rect x="{gx-gr}" y="{gy-gr}" width="{2*gr}" height="{2*gr}" fill="url(#in96)"/>
<path d="M{gx-gr} {gy+20} L{gx-120} {gy-60} L{gx-40} {gy} L{gx+60} {gy-90} L{gx+gr} {gy+10} V{gy+gr} H{gx-gr}Z" fill="#C9D9EA"/>
<path d="M{gx-120} {gy-60} L{gx-90} {gy-30} L{gx-150} {gy-30}Z M{gx+60} {gy-90} L{gx+95} {gy-55} L{gx+25} {gy-55}Z" fill="#FFFFFF"/>
{''.join(f'<path d="M{x} {gy+gr} L{x} {gy+40-h}" stroke="#2F4A3E" stroke-width="5"/>' + ''.join(f'<path d="M{x-w} {y} L{x} {y-34} L{x+w} {y}Z" fill="#2F5A47"/><path d="M{x-w} {y} Q{x} {y-14} {x+w} {y} Q{x} {y-6} {x-w} {y}Z" fill="#FFFFFF"/>' for y, w in [(gy+40-h+60+k*38, 22+k*8) for k in range(4)]) for x, h in [(gx-60, 150), (gx+80, 110), (gx+150, 60)])}
<rect x="{gx-gr}" y="{gy+150}" width="{2*gr}" height="80" fill="#F7FAFF"/>
</g>
<circle cx="{gx}" cy="{gy}" r="{gr}" fill="none" stroke="#E7D7C2" stroke-width="16"/>
<circle cx="{gx}" cy="{gy}" r="{gr+8}" fill="none" stroke="#9A2C22" stroke-width="2"/>'''
    # 红梅：一枝从左上横过来
    branch = '<path d="M-30 300 C140 330 260 380 380 470 C440 515 520 520 600 500" stroke="#3B2A22" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M230 370 C260 320 300 300 340 296" stroke="#3B2A22" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M420 492 C440 560 470 590 500 600" stroke="#3B2A22" stroke-width="6" fill="none" stroke-linecap="round"/>'
    snow_on_branch = '<path d="M60 308 C140 318 200 340 260 368" stroke="#FFFFFF" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M320 432 C360 458 390 476 420 486" stroke="#FFFFFF" stroke-width="5" fill="none" stroke-linecap="round"/>'
    def plum(x, y, r):
        p = ''.join(f'<circle cx="{x + r*.55*math.cos(math.radians(a)):.1f}" cy="{y + r*.55*math.sin(math.radians(a)):.1f}" r="{r*.5:.1f}" fill="#D7352B"/>' for a in range(-90, 270, 72))
        return f'<g>{p}<circle cx="{x}" cy="{y}" r="{r*.3:.1f}" fill="#F2C14E"/>{"".join(f"<circle cx=\'{x + r*.4*math.cos(a):.1f}\' cy=\'{y + r*.4*math.sin(a):.1f}\' r=\'1.6\' fill=\'#7A2018\'/>" for a in [k*1.05 for k in range(6)])}</g>'
    plums = ''.join(plum(x, y, r) for x, y, r in [(120, 318, 14), (200, 340, 12), (300, 300, 13), (345, 300, 10), (390, 470, 15), (470, 512, 12), (560, 506, 14), (500, 598, 11), (260, 380, 10)])
    buds = ''.join(f'<circle cx="{x}" cy="{y}" r="5" fill="#B82A22"/>' for x, y in [(160, 326), (430, 498), (590, 500), (330, 296)])
    # 球拍：斜倚在墙边雪里，像一柄剑
    rk = f'''<g transform="translate(300 1040) rotate(-16)">
<ellipse cx="0" cy="-470" rx="82" ry="108" fill="none" stroke="#18332A" stroke-width="13"/>
<clipPath id="rk96"><ellipse cx="0" cy="-470" rx="76" ry="102"/></clipPath>
<g clip-path="url(#rk96)" stroke="#EDE6D8" stroke-width="2">{''.join(f'<path d="M{x} -580 V-360"/>' for x in range(-80, 82, 15))}{''.join(f'<path d="M-90 {y} H90"/>' for y in range(-575, -360, 15))}</g>
<path d="M-44 -376 Q-8 -320 -8 -270 M44 -376 Q8 -320 8 -270" stroke="#18332A" stroke-width="11" fill="none"/>
<rect x="-12" y="-275" width="24" height="120" rx="8" fill="#18332A"/>
<rect x="-12" y="-160" width="24" height="150" rx="8" fill="#F4F1EA"/>
<path d="M-12 -140 l24 -12 M-12 -110 l24 -12 M-12 -80 l24 -12 M-12 -50 l24 -12" stroke="#D9D3C6" stroke-width="2"/>
<path d="M-60 -566 Q0 -592 60 -566" stroke="#FFFFFF" stroke-width="10" fill="none" stroke-linecap="round"/>
</g>'''
    # 雪地 + 球
    bx, by, br = 470, 1060, 34
    flakes = ''.join(f'<circle cx="{rnd.uniform(0, 1080):.0f}" cy="{rnd.uniform(0, 1300):.0f}" r="{rnd.choice([1.2, 1.8, 2.6, 3.4, 5])}" fill="#FFFFFF" opacity="{rnd.uniform(.5, .95):.2f}" {"filter=\"url(#bl6)\"" if rnd.random() < .15 else ""}/>' for _ in range(110))
    body = f'''
<defs>
<linearGradient id="sky96" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2468D6"/><stop offset=".45" stop-color="#6FA6EC"/><stop offset=".7" stop-color="#BCD8F6"/><stop offset="1" stop-color="#E8F1FC"/></linearGradient>
<linearGradient id="wall96" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C2392D"/><stop offset="1" stop-color="#A92E24"/></linearGradient>
<linearGradient id="in96" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC6F2"/><stop offset="1" stop-color="#EAF3FD"/></linearGradient>
<linearGradient id="gr96" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E4ECF7"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky96)"/>
<rect x="-20" y="{wy0}" width="1120" height="{wy1-wy0+20}" fill="url(#wall96)"/>
<rect x="-20" y="{wy0}" width="1120" height="60" fill="#7A1E16" opacity=".22"/>
{inside}
{coping}
<path d="M-20 {wy1} C200 {wy1-14} 500 {wy1-6} 760 {wy1-16} C900 {wy1-20} 1000 {wy1-10} 1100 {wy1-14} V{H} H-20Z" fill="url(#gr96)"/>
<path d="M-20 {wy1+4} C300 {wy1+10} 700 {wy1} 1100 {wy1}" stroke="#C9D8EC" stroke-width="3" fill="none" opacity=".7"/>
<path d="M330 1036 L520 1020 L560 1034 L340 1050Z" fill="#B7C9E3" opacity=".6" filter="url(#bl6)"/>
{rk}
<path d="M240 1040 Q300 1022 360 1040 Q300 1050 240 1040Z" fill="#FFFFFF"/>
<ellipse cx="{bx + 30}" cy="{by + 12}" rx="60" ry="9" fill="#9DB4D6" opacity=".5" filter="url(#bl6)"/>
<clipPath id="bc96"><rect x="{bx-50}" y="{by-60}" width="100" height="{60+12}"/></clipPath>
<g clip-path="url(#bc96)">{ball('b96', bx, by, br, rot=-24)}</g>
<path d="M{bx-44} {by+12} Q{bx-30} {by+2} {bx-10} {by+8} Q{bx+12} {by+2} {bx+40} {by+10} Q{bx} {by+20} {bx-44} {by+12}Z" fill="#FFFFFF"/>
{branch}{snow_on_branch}{plums}{buds}
{flakes}
{vcol('雪初霁', 960, 200, 66, '#FFFFFF')}
{vcol('能打一局无', 872, 200, 66, '#C6EA3D')}
{seal(930, 420, 58)}
{wordmark(1268, '#123A8C', sub=False)}
{grain(.05, light=True)}'''
    return page(body)
