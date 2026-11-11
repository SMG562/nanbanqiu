from helpers import *
import pathlib
cards = []
def card(key, title, sub, body): cards.append((key, title, sub, wrap(body)))
FX, FY = CX + .04 * R0, CY + .06 * R0
def glasses():
    return (f'<rect x="{FX-27:.1f}" y="{FY-8:.1f}" width="22" height="15" rx="6" fill="#1b1b1b"/><rect x="{FX+5:.1f}" y="{FY-8:.1f}" width="22" height="15" rx="6" fill="#1b1b1b"/>'
            + ln(f'M{FX-5:.1f} {FY-3:.1f} H{FX+5:.1f}', 2.4) + f'<path d="M{FX-23:.1f} {FY-5:.1f} l8 0" stroke="#fff" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/>')
def sun(x, y, r, rays=10):
    s = f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFD66B" stroke="{PEN}" stroke-width="2.4"/>'
    for i in range(rays):
        a = i * 2 * math.pi / rays
        s += ln(f'M{x+math.cos(a)*(r+6):.1f} {y+math.sin(a)*(r+6):.1f} L{x+math.cos(a)*(r+13):.1f} {y+math.sin(a)*(r+13):.1f}', 2.4)
    return s

# 1 一天四季
ux, uy = P(1.3, -1.25)
card('four-seasons', '带伞，也带防晒。', '墨尔本的天气，今天又在换。',
     fig('a', dict(L=DOWN_L, R=((1.55, -.2), (1.30, -1.25)), legs='stand'), 'smile') + glasses()
     + ln(f'M{ux:.1f} {uy:.1f} V{uy-50:.1f}', 2.6) + f'<path d="M{ux-44:.1f} {uy-50:.1f} Q{ux:.1f} {uy-94:.1f} {ux+44:.1f} {uy-50:.1f} Q{ux+22:.1f} {uy-58:.1f} {ux:.1f} {uy-50:.1f} Q{ux-22:.1f} {uy-58:.1f} {ux-44:.1f} {uy-50:.1f}Z" fill="#9CCBE8" stroke="{PEN}" stroke-width="2.6" stroke-linejoin="round"/>'
     + ''.join(ln(f'M{x} {y} l-2 7', 2, extra='opacity=".8"') for x, y in ((42, 78), (28, 112), (190, 118))))
# 2 热浪
lx, ly = P(1.55, -.2)
pop = (f'<rect x="{lx-8:.1f}" y="{ly-30:.1f}" width="16" height="24" rx="7" fill="#F4A6BE" stroke="{PEN}" stroke-width="2.4"/>' + ln(f'M{lx:.1f} {ly-6:.1f} v14', 2.6))
card('heat', '今天 38 度。', '约早场吧，别把球晒化了。',
     sun(176, 52, 20) + fig('b', dict(L=DOWN_L, R=((1.5, .5), (1.55, .0)), legs='stand'), 'sweat') + pop
     + ln('M70 96 q-4 8 0 16', 2, extra='opacity=".5"'))
# 3 风大
card('windy', '今天风有点大。', '发球会飘，约球照常。',
     fig('c', dict(L=DOWN_L, R=((1.55, -.1), (1.32, -.95)), legs='stand', tilt=10), 'wow')
     + ''.join(ln(f'M{x} {y} q14 -6 28 0 q10 4 16 -2', 2.2, extra='opacity=".55"') for x, y in ((18, 110), (10, 138), (24, 164)))
     + f'<g transform="translate(174 44) rotate(-18)"><path d="M-16 6 Q0 -16 16 6Z" fill="#F4B58A" stroke="{PEN}" stroke-width="2.4" stroke-linejoin="round"/>' + ln('M-16 6 H24', 2.4) + '</g>')
# 4 清晨
card('morning', '这么早，只有鸟醒着。', '早场第一个，发一局吧。',
     f'<path d="M30 198 a56 56 0 0 1 112 0Z" fill="#FFD9A0"/>' + ''.join(ln(f'M{86+math.cos(a)*64:.1f} {198+math.sin(a)*64:.1f} L{86+math.cos(a)*76:.1f} {198+math.sin(a)*76:.1f}', 2.2, extra='opacity=".6"') for a in (-2.6, -2.1, -1.57, -1.05, -.55))
     + fig('d', dict(L=DOWN_L, R=((1.25, -.1), (.42, -.50)), legs='stand'), 'sleep') + ln('M170 56 q6 -8 12 0 q6 -8 12 0', 2.4))
# 5 周六空着
kx, ky = 176, 118
cal = (f'<rect x="{kx-34}" y="{ky-34}" width="68" height="68" rx="9" fill="#fff" stroke="{PEN}" stroke-width="2.6"/><path d="M{kx-34} {ky-34} h68 v18 h-68Z" fill="#F4B58A" stroke="{PEN}" stroke-width="2.6" stroke-linejoin="round"/>'
       + ''.join(f'<circle cx="{kx-20+i*20}" cy="{ky-2+j*17}" r="2.4" fill="{PEN}" opacity=".5"/>' for j in range(3) for i in range(3) if (i, j) != (1, 1))
       + f'<circle cx="{kx}" cy="{ky+15}" r="8" fill="none" stroke="#C2410C" stroke-width="2.4" stroke-dasharray="3 4"/>')
card('weekend', '周六还空着。', '挑个时间，发一局。',
     fig('e', dict(L=DOWN_L, R=((1.5, .1), (1.30, -.35)), legs='stand'), 'smile', look=1, cx=84) + cal)
# 6 第一局
mx, my = P(1.5, .55)
medal = (ln(f'M{mx-8:.1f} {my-22:.1f} L{mx-2:.1f} {my:.1f} M{mx+8:.1f} {my-22:.1f} L{mx+2:.1f} {my:.1f}', 3.4, col="#C2410C") + f'<circle cx="{mx:.1f}" cy="{my+8:.1f}" r="13" fill="#FFD66B" stroke="{PEN}" stroke-width="2.4"/>' + ln(f'M{mx-3:.1f} {my+3:.1f} l4 -3 v16', 2.6))
card('first-game', '第一局。', '算认识了。',
     fig('f', dict(L=DOWN_L, R=((1.45, .55), (1.38, .35)), legs='stand'), 'happy') + medal)
# 7 手感来了
card('streak', '手感来了。', '连续 3 周都有球。',
     fig('g', 'racket', 'happy') + ln('M52 80 l-8 -10 M62 66 l-2 -13 M42 98 l-14 -4', 2.4, col="#C2410C")
     + ln('M178 62 l0 -9 M173.5 57.5 h9', 2.2) + ln('M196 92 l0 -7 M192.5 88.5 h7', 2))
# 8 老球友
rr = figure3('h2', 150, 0, 36, dict(L=((-1.5, .4), (-1.1, .3)), R=DOWN_R, legs='stand'), 'happy', gy=GY, char='rong').replace('filter="url(#rough2)"', '')
rm = figure3('h1', 70, 0, 36, dict(L=DOWN_L, R=((1.5, .4), (1.1, .3)), legs='stand'), 'happy', gy=GY).replace('filter="url(#rough2)"', '')
card('regulars', '又是你。', '第 10 局，老球友了。', rm + rr + ln('M110 118 l0 -8 M104 124 l-8 -4 M116 124 l8 -4', 2.4, col="#C2410C"))
# 9 球等了你一会儿
cl = (f'<circle cx="170" cy="62" r="22" fill="#fff" stroke="{PEN}" stroke-width="2.6"/>' + ln('M170 62 V48 M170 62 L180 68', 2.6) + f'<circle cx="170" cy="62" r="2" fill="{PEN}"/>')
card('late', '球等了你一会儿。', '下次迟到，说一声就行。',
     cl + fig('i', dict(L=DOWN_L, R=((1.5, .5), (1.4, .25)), legs='stand'), 'sweat', look=1, cx=96))
# 10 改期
pg = (f'<rect x="{CX-22}" y="{CY+34:.1f}" width="44" height="38" rx="6" fill="#fff" stroke="{PEN}" stroke-width="2.6"/><path d="M{CX-22} {CY+34:.1f} h44 v11 h-44Z" fill="#F4B58A" stroke="{PEN}" stroke-width="2.4" stroke-linejoin="round"/>'
      + ln(f'M{CX+8} {CY+72:.1f} q14 -4 14 -14', 2.2, extra='opacity=".7"'))
card('reschedule', '改期也行。', '提前说一声，大家好安排。',
     fig('j', dict(L=((-.62, .62), (-.35, .92)), R=((.62, .62), (.35, .92)), front=True, legs='stand'), 'smile') + pg)
# 11 调拍线
rx11, ry11 = P(1.3, .30)
card('stringing', '调拍线中。', '马上好。（加载文案轮播：热身中 / 系个鞋带 / 调拍线 / 捡球）',
     fig('k', dict(L=((-1.45, .3), (-1.0, .62)), R=((1.40, .36), (1.30, .30)), legs='stand'), 'smile', look=1) + racket(rx11, ry11, 24, 1.0)
     + ln(f'M{CX-1.0*R0:.1f} {CY+.62*R0:.1f} q10 -14 28 -22', 1.4, extra='opacity=".7"'))
# 12 打卡贴纸
sk = (f'<circle cx="110" cy="108" r="86" fill="#fff" stroke="{PEN}" stroke-width="2.6" stroke-dasharray="2 8" stroke-linecap="round"/>')
card('sticker', '今天也有球。', '分享用贴纸。', sk + figure3('s', 110, 0, 36, 'racket', 'happy', gy=170).replace('filter="url(#rough2)"', ''))

out = pathlib.Path(__file__).parent / '第三批'; out.mkdir(exist_ok=True)
for k, t, s, svg in cards: (out / f'mao-{k}.svg').write_text(svg)
html = '''<style>body{margin:0;background:#F7F3E8;font-family:'Noto Sans CJK SC',sans-serif;padding:22px;display:grid;grid-template-columns:repeat(4,250px);gap:16px}
.c{background:#fff;border-radius:20px;padding:12px 8px 16px;text-align:center}.c svg{width:190px;height:190px}
h3{margin:2px 0 3px;font-size:17px;color:#0B3B2A}p{margin:0;font-size:12.5px;color:#6b7280;padding:0 8px}</style>''' + ''.join(f'<div class="c">{svg}<h3>{t}</h3><p>{s}</p></div>' for k, t, s, svg in cards)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg_ = b.new_page(viewport={'width':1100,'height':880}); pg_.set_content(html); pg_.screenshot(path=str(pathlib.Path(__file__).parent / '第三批总览.png')); b.close()
