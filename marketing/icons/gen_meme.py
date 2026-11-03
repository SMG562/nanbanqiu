"""表情包风：大只小毛 + 年轻人的真话。一张 240×240，字在图里（上方），角色探出下沿。"""
import math, pathlib
from gen_stage_lib import *
from lib import ball as lball
HERE = pathlib.Path(__file__).parent
GREY, WARM, LIME = '#E7EAEF', '#FFF0DA', '#F0F7D6'
INKC = '#2B3340'
cards = []
def add(key, mood, bg, l1, l2, body): cards.append((key, mood, bg, l1, l2, body))
W = lambda c: f'stroke="{c}" stroke-width="3" stroke-linecap="round" fill="none"'
def sweatdrop(x, y, k=1): return f'<path transform="translate({x} {y}) scale({k})" d="M0 -12 C6 -3 9 3 0 9 C-9 3 -6 -3 0 -12Z" fill="#BFE6F2" stroke="#7FB8CF" stroke-width="1.5"/>'
def rain(x, y, n=5): return ''.join(f'<path d="M{x+i*13} {y+(i%2)*6} l-4 10" stroke="#8AA4BC" stroke-width="2.6" stroke-linecap="round"/>' for i in range(n))
def cloud(x, y, k, c='#B9C3D0'): return f'<g transform="translate({x} {y}) scale({k})"><path d="M0 16 q-6 -16 12 -16 q6 -14 24 -4 q20 -2 20 12 q8 3 3 8Z" fill="{c}"/></g>'
def zz(x, y): return f'<text x="{x}" y="{y}" font-size="16" font-weight="800" fill="#8AA4BC" font-family="Noto Sans CJK SC">z</text><text x="{x+11}" y="{y-14}" font-size="12" font-weight="800" fill="#8AA4BC" font-family="Noto Sans CJK SC">z</text>'
def spark(x, y, k=6, c=ACC): return f'<path d="M{x} {y-k} V{y+k} M{x-k} {y} H{x+k}" stroke="{c}" stroke-width="2.6" stroke-linecap="round"/>'
def shake(x, y, d): return f'<path d="M{x} {y} l{d*5} -9 M{x+d*7} {y+8} l{d*5} -9" stroke="#8AA4BC" stroke-width="2.4" stroke-linecap="round"/>'
def drink(x, y, rot=0):
    return (f'<g transform="translate({x} {y}) rotate({rot})"><path d="M-12 -30 L-9 12 Q0 16 9 12 L12 -30Z" fill="#F3D9B8" stroke="{PEN}" stroke-width="2.6" stroke-linejoin="round"/>'
            f'<path d="M-11 -30 H11" stroke="{PEN}" stroke-width="3" stroke-linecap="round"/><path d="M2 -30 L6 -48" stroke="{ACC}" stroke-width="3.4" stroke-linecap="round"/>'
            + ''.join(f'<circle cx="{a}" cy="{b}" r="2.6" fill="#6B4A3A"/>' for a, b in ((-4, 4), (3, 7), (-1, 0), (5, 1))) + '</g>')
CX, GY, R = 120, 216, 50
def fig(uid, pose, mood, char='mao', cx=CX, r=R, look=0): return mao(uid, cx, GY, r, pose, mood, look=look, char=char)
D = dict(legs='stand')
DL, DR = DOWN_L, DOWN_R

# —— 丧 ——
add('rain-cancel', 'dead', GREY, '又下雨。', '老天也放我鸽子', cloud(160, 82, 1) + rain(166, 112) + fig('a', dict(L=DL, R=DR, **D), 'dead'))
add('monday', 'tired', GREY, '周一。', '球拍：我也不想', fig('b', dict(L=DL, R=((1.3, .6), (1.1, .95)), legs='stand', racket=True, tilt=-6), 'tired') + zz(176, 108))
add('double-fault', 'blank', GREY, '又双误了。', '我的发球有自己的想法', fig('c', dict(L=((-1.5, -.2), (-1.6, -.8)), R=DR, legs='stand'), 'blank') + lball('c1', 190, 96, 11) + f'<path d="M168 100 q-6 8 -22 8" stroke="#8AA4BC" stroke-width="2.4" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/>')
add('stood-up', 'cry', GREY, '说好的来呢。', '球友已读，没来', fig('d', dict(L=((-1.12, .2), (-.66, .12)), R=((1.12, .2), (.66, .12)), legs='stand'), 'cry') + sweatdrop(178, 96) + sweatdrop(62, 110, .8))
# —— 吐槽 ——
add('windy', 'mad', WARM, '这风，球在躲我。', '', ''.join(f'<path d="M{x} {y} h{l} q8 0 8 -7 q0 -7 -8 -6" {W("#E5B98A")}/>' for x, y, l in ((30, 100, 40), (176, 124, 36), (24, 150, 30))) + fig('e', dict(L=DL, R=((1.4, .4), (1.3, .3)), legs='step', racket=True, tilt=8), 'mad'))
add('booking', 'smirk', WARM, '约球像抢票。', '手速不行就没了', f'<g transform="translate(176 118) rotate(10)"><rect x="-22" y="-34" width="44" height="64" rx="8" fill="#fff" stroke="{PEN}" stroke-width="2.6"/><rect x="-14" y="-24" width="28" height="8" rx="4" fill="{ACC}"/><rect x="-14" y="-8" width="20" height="5" rx="2.5" fill="#D8DDE4"/><rect x="-14" y="2" width="24" height="5" rx="2.5" fill="#D8DDE4"/></g>' + fig('f', dict(L=((-1.5, .1), (-1.55, -.6)), R=DR, legs='stand'), 'smirk', look=1))
add('tan', 'smirk', WARM, '防晒涂了。', '晒黑还是很准时', f'<circle cx="198" cy="96" r="16" fill="#FFD66B" stroke="#F2B134" stroke-width="2.4"/>' + ''.join(f'<path d="M{198+math.cos(a)*22:.1f} {96+math.sin(a)*22:.1f} L{198+math.cos(a)*28:.1f} {96+math.sin(a)*28:.1f}" stroke="#F2B134" stroke-width="3" stroke-linecap="round"/>' for a in [i*math.pi/4 for i in range(8)]) + fig('g', dict(L=DL, R=((1.5, .5), (1.4, -.1)), legs='stand'), 'smirk') + sweatdrop(58, 114, .9))
# —— 快乐 ——
add('won-point', 'cheer', LIME, '这分，我能吹一周。', '', ''.join(spark(x, y, 6) for x, y in ((46, 112), (196, 100), (170, 74))) + fig('h', 'cheer', 'cheer'))
add('milk-tea', 'happy', LIME, '运动是为了奶茶。', '没毛病', fig('i', dict(L=DL, R=((1.5, .3), (1.55, -.3)), legs='stand'), 'happy') + drink(178, 160, 8) + spark(186, 84, 5, '#8FAE8B'))
add('got-reply', 'wow', LIME, '有人回我了！', '', ''.join(f'<path d="M{CX+math.cos(a)*88:.1f} {146+math.sin(a)*70:.1f} L{CX+math.cos(a)*100:.1f} {146+math.sin(a)*80:.1f}" stroke="{ACC}" stroke-width="3" stroke-linecap="round"/>' for a in [i*math.pi/6-math.pi*1.0 for i in range(7)]) + fig('j', 'wow', 'wow'))
# 两个一起摆烂
add('together', 'sleep', GREY, '今天不卷。', '我们只喝饮料', fig('k1', dict(L=DL, R=((1.3, .6), (1.0, .9)), legs='stand'), 'dead', cx=82, r=40) + fig('k2', dict(L=((-1.3, .6), (-1.0, .9)), R=DR, legs='stand'), 'dead', char='rong', cx=162, r=36) + drink(122, 198, -6))
add('same-boat', 'cry', GREY, '输球了。', '来，一起丧一下', fig('l1', dict(L=DL, R=((1.12, .2), (.55, .15)), legs='stand'), 'cry', cx=86, r=40) + fig('l2', dict(L=((-1.12, .2), (-.55, .15)), R=DR, legs='stand'), 'cry', char='rong', cx=160, r=36))

def card(i, key, mood, bg, l1, l2, body):
    t = (f'<rect x="4" y="4" width="232" height="232" rx="30" fill="{bg}"/>'
         f'<text x="120" y="{46 if l2 else 52}" text-anchor="middle" font-size="{22 if len(l1)<8 else 19}" font-weight="800" fill="{INKC}" font-family="Noto Sans CJK SC, PingFang SC, sans-serif">{l1}</text>'
         + (f'<text x="120" y="68" text-anchor="middle" font-size="13" font-weight="500" fill="#7B8594" font-family="Noto Sans CJK SC, PingFang SC, sans-serif">{l2}</text>' if l2 else '')
         + f'<clipPath id="mc{key}"><rect x="4" y="4" width="232" height="232" rx="30"/></clipPath><g clip-path="url(#mc{key})">{body}</g>')
    return sw(t, 240, 240)
out = HERE / '表情包风'; out.mkdir(exist_ok=True)
for i, c in enumerate(cards): (out / f'meme-{c[0]}.svg').write_text(card(i, *c))
html = '<style>body{margin:0;background:#fff;padding:24px;display:grid;grid-template-columns:repeat(4,240px);gap:18px}svg{width:240px;height:240px}</style>' + ''.join(card(i, *c) for i, c in enumerate(cards))
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1130, 'height': 900}); pg.set_content(html); pg.screenshot(path=str(HERE / '表情包风总览.png'), full_page=True); b.close()
