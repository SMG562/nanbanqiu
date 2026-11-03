import sys, math, random, pathlib
sys.path.insert(0, '/home/claude/nanbanqiu/marketing')
import mao3
from lib import *
PEN = mao3.PEN
mao3.pen = lambda d, w, op=1.0: f'<path d="{d}" fill="none" stroke="{PEN}" stroke-width="{w*1.1:.2f}" stroke-linecap="round" stroke-linejoin="round" opacity="{op}"/>'
from mao3 import figure3, DOWN_L, DOWN_R, POSES

R0, GY, CX = 42, 198, 110
CY = GY - 1.53 * R0
def P(x, y): return (CX + x * R0, CY + y * R0)
def ln(d, w=2.6, col=PEN, extra=''): return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def wrap(inner): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220"><defs>{COMMON}</defs>{inner}</svg>'
def fig(id, pose, mood, look=0, cx=CX, r=R0):
    return figure3(id, cx, 0, r, pose, mood, look=look, gy=GY).replace('filter="url(#rough2)"', '')
def ball(cx, cy, r):
    return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="#C6EA3D" stroke="{PEN}" stroke-width="2"/>'
            f'<path d="M{cx-r*.62:.1f} {cy-r*.55:.1f} Q{cx-r*.1:.1f} {cy:.1f} {cx-r*.62:.1f} {cy+r*.55:.1f} M{cx+r*.62:.1f} {cy-r*.55:.1f} Q{cx+r*.1:.1f} {cy:.1f} {cx+r*.62:.1f} {cy+r*.55:.1f}" fill="none" stroke="#FBFFE8" stroke-width="2.2" stroke-linecap="round"/>')
def dots(d): return ln(d, 2.2, extra='stroke-dasharray="1 6.5"')
def racket(hx, hy, ang=24, k=1.0, strings=True, broken=False):
    s = f'<g transform="translate({hx:.1f} {hy:.1f}) rotate({ang})">' + ln(f'M0 0 L0 {-22*k}', 2.6)
    s += f'<ellipse cx="0" cy="{-44*k}" rx="{16*k}" ry="{22*k}" fill="#fff" fill-opacity=".4" stroke="{PEN}" stroke-width="2.6"/>'
    if strings:
        for i in (-1, 0, 1): s += ln(f'M{i*7*k} {-44*k-19*k} V{-44*k+19*k}', 1, extra='opacity=".55"')
        if broken: s += ln(f'M{-14*k} {-44*k} H{-3*k}', 1, extra='opacity=".55"') + ln(f'M{3*k} {-44*k} q{6*k} {4*k} {11*k} {1*k}', 1.2, extra='opacity=".7"')
        else:
            for j in (-1, 0, 1): s += ln(f'M{-14*k} {-44*k+j*9*k} H{14*k}', 1, extra='opacity=".55"')
    return s + '</g>'

cards = []
def card(key, title, sub, body): cards.append((key, title, sub, wrap(body)))

# 1 某天没有球局：发球
bx, by = CX - 1.18 * R0 - 6, CY - 1.15 * R0 - 36
card('no-games', '该你发球了。', '今天还没有球局，发一局吧。',
     fig('a', dict(L=((-1.5, -.3), (-1.18, -1.15)), R=((1.40, .36), (1.30, .30)), legs='stand', racket=True), 'happy') + dots(f'M{bx} {by+16} Q{bx+3} {by+30} {bx} {by+44}') + ball(bx, by, 11))
# 2 筛选后没有结果：放大镜
mx, my = P(1.62, -.62)
card('no-results', '条件有点挑。', '放宽一点，或者自己发一局。',
     fig('b', dict(L=DOWN_L, R=((1.5, .15), (1.28, -.42)), legs='stand'), 'smile', look=1)
     + f'<circle cx="{mx:.1f}" cy="{my:.1f}" r="17" fill="#fff" fill-opacity=".45" stroke="{PEN}" stroke-width="2.8"/>' + ln(f'M{P(1.28,-.42)[0]:.1f} {P(1.28,-.42)[1]:.1f} L{mx-12:.1f} {my+12:.1f}', 3.2))
# 3 我的球局为空：球拍睡着了
rx, ry = P(1.9, 1.38)
card('my-empty', '球拍在包里睡着了。', '去发现页约一局，或者自己发起。',
     fig('c', 'sleep', 'sleep') + racket(rx, ry, 14, .95))
# 4 没有消息：空信封
ex, ey = P(-1.25, .78)
env = (f'<rect x="{ex-17:.1f}" y="{ey-11:.1f}" width="34" height="23" rx="3" fill="#fff" stroke="{PEN}" stroke-width="2.4"/>'
       + ln(f'M{ex-17:.1f} {ey-11:.1f} L{ex:.1f} {ey+3:.1f} L{ex+17:.1f} {ey-11:.1f}', 2.2))
card('no-messages', '收件箱比球场还安静。', '和球友打过球之后，就能聊天了。',
     fig('d', dict(L=((-1.55, .5), (-1.25, .80)), R=DOWN_R, legs='stand'), 'smile', look=-1) + env)
# 5 暂无通知：听着呢
ax, ay = P(-1.12, -.02)
card('no-notice', '听着呢。', '申请结果、新的申请都会出现在这里。',
     fig('e', dict(L=((-1.5, .35), (-1.04, -.04)), R=DOWN_R, legs='stand'), 'smile', look=-1)
     + ln(f'M{ax-13:.1f} {ay-9:.1f} q-6 9 0 18', 2.4) + ln(f'M{ax-23:.1f} {ay-15:.1f} q-9 15 0 30', 2.2, extra='opacity=".7"'))
# 6 登录：嗨
card('login', '嗨，先认识一下。', '手机号验证码，30 秒。', fig('f', 'wave', 'happy'))
# 7 加载：颠球
bx7, by7 = P(1.5, -1.5)
card('loading', '热身中。', '马上好。',
     fig('g', dict(L=DOWN_L, R=((1.5, .3), (1.52, -.05)), legs='step'), 'happy')
     + ball(bx7, by7, 10) + dots(f'M{bx7} {by7+16} Q{bx7-2} {by7+34} {bx7+2} {by7+50}'))
# 8 找不到 / 出界
card('not-found', '这局飞出界了。', '看看其他球局。',
     fig('h', 'sorry', 'wow') + ball(196, 30, 9) + dots('M118 70 Q150 20 184 30')
     + ln('M150 52 H206', 2, extra='stroke-dasharray="6 5" opacity=".0"'))
# 9 断线
rx9, ry9 = P(1.3, .30)
card('offline', '断线了。', '网络有点忙，稍后再试。',
     fig('i', dict(L=DOWN_L, R=((1.40, .36), (1.30, .30)), legs='stand'), 'sweat') + racket(rx9, ry9, 24, 1.0, True, True))
# 10 已满
pile = ball(188, 176, 11) + ball(166, 180, 11) + ball(177, 160, 11) + ball(199, 160, 11)
card('full', '来晚一步。', '这局约满了，下次手快一点。',
     fig('j', dict(L=((-1.55, .78), (-1.82, .26)), R=((1.55, .78), (1.82, .26)), legs='stand'), 'sweat', cx=92) + ball(178, 183, 11) + ball(200, 183, 11) + ball(189, 164, 11))
# 11 已取消：雨伞
ux, uy = P(1.3, -1.25)
card('cancelled', '这局取消了。', '天气或人数，总有一个不赏脸。',
     fig('k', dict(L=DOWN_L, R=((1.55, -.2), (1.30, -1.25)), legs='stand'), 'smile')
     + ln(f'M{ux:.1f} {uy:.1f} V{uy-52:.1f}', 2.6) + f'<path d="M{ux-46:.1f} {uy-52:.1f} Q{ux:.1f} {uy-98:.1f} {ux+46:.1f} {uy-52:.1f} Q{ux+23:.1f} {uy-60:.1f} {ux:.1f} {uy-52:.1f} Q{ux-23:.1f} {uy-60:.1f} {ux-46:.1f} {uy-52:.1f}Z" fill="#F4B58A" stroke="{PEN}" stroke-width="2.6" stroke-linejoin="round"/>'
     + ''.join(ln(f'M{x} {y} l-2 7', 2, extra='opacity=".8"') for x, y in ((40, 70), (58, 100), (30, 118), (176, 112), (196, 90))))
# 12 发布成功：发出去了
card('published', '发出去了。', '有人报名，会马上告诉你。',
     fig('l', 'cheer', 'happy') + ball(182, 40, 11) + dots('M150 108 Q168 80 178 56')
     + ln('M200 62 l0 -9 M195.5 57.5 h9', 2.2) + ln('M148 40 l0 -7 M144.5 36.5 h7', 2))

out = pathlib.Path(__file__).parent; out.mkdir(exist_ok=True)
for k, t, s, svg in cards: (out / f'mao-{k}.svg').write_text(svg)
html = '''<style>body{margin:0;background:#F7F3E8;font-family:'Noto Sans CJK SC',sans-serif;padding:22px;display:grid;grid-template-columns:repeat(4,250px);gap:16px}
.c{background:#fff;border-radius:20px;padding:12px 8px 16px;text-align:center}.c svg{width:190px;height:190px}
h3{margin:2px 0 3px;font-size:17px;color:#0B3B2A}p{margin:0;font-size:12.5px;color:#6b7280;padding:0 8px}</style>''' + ''.join(f'<div class="c">{svg}<h3>{t}</h3><p>{s}</p></div>' for k, t, s, svg in cards)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1100,'height':860}); pg.set_content(html); pg.screenshot(path='set.png'); b.close()
