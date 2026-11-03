"""原版小毛（3D 软球 figure3）的 6 个情绪动作。卡片：纸白底 + 一句话；字在图里。"""
import pathlib, math
from gen_stage_lib import *
from lib import ball as lball
HERE = pathlib.Path(__file__).parent
GREYT, INKC = '#8C919B', '#2B3340'
cards = []
def add(key, bg, cap, body): cards.append((key, bg, cap, body))
def wrap(bg, cap, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300"><defs>{COMMON}</defs><rect width="300" height="300" rx="26" fill="{bg}"/>{body}'
            f'<text x="150" y="280" text-anchor="middle" font-size="14" fill="{GREYT}" font-family="Noto Sans CJK SC, PingFang SC, sans-serif">{cap}</text></svg>')
def ground(cx, y, rx): return f'<ellipse cx="{cx}" cy="{y}" rx="{rx}" ry="6" fill="#000" opacity=".08"/>'
cloud = lambda x, y, k: f'<path transform="translate({x} {y}) scale({k})" d="M0 16 q-8 -2 -6 -10 q2 -8 12 -6 q4 -10 16 -6 q10 -2 12 8 q10 0 8 8 q0 6 -8 6Z" fill="#fff" stroke="#C9CDD4" stroke-width="2.2" stroke-linejoin="round"/>'
spark = lambda x, y, k=5, c=ACC: f'<path d="M{x} {y-k} V{y+k} M{x-k} {y} H{x+k}" stroke="{c}" stroke-width="2.4" stroke-linecap="round"/>'
heart = lambda x, y, k=1: f'<path transform="translate({x} {y}) scale({k})" d="M0 5 C-9 -2 -5 -10 0 -5 C5 -10 9 -2 0 5Z" fill="#FBE3E3" stroke="#D9534F" stroke-width="2" stroke-linejoin="round"/>'
R = 44
# 1 摊平
add('starfish', '#EFE9EA', '今天没人发球。', ground(150, 236, 90) + cloud(214, 98, 1)
    + mao('a', 132, 236 - R * .95 + 1.53 * R, R, dict(L=((-.95, -.9), (-.65, -1.7)), R=((.95, -.9), (.65, -1.75)), legs='jump', tilt=-82), 'dead', look=0))
add('hug-fire', '#F3F2EE', '约不到，上火。', ground(150, 238, 62)
    + mao('b', 150, 238, R, dict(L=((-1.0, 1.05), (.25, .95)), R=((1.0, 1.0), (-.2, 1.1)), front=True, legs='step', tilt=4), 'sweat')
    + f'<g transform="translate(152 {238-1.53*R-R+6})"><path d="M0 0 C-11 -12 -1 -20 -3 -32 C9 -24 14 -11 9 0Z" fill="#FFD9C4" stroke="{ACC}" stroke-width="2.8" stroke-linejoin="round"/><path d="M1 -3 C-3 -8 2 -12 1 -17 C6 -13 7 -8 5 -3Z" fill="#FFB38E"/></g>')
add('solo', '#F4F1E6', '等人的时候，先颠会儿。', ground(124, 240, 44) + mao('c', 124, 240, R, dict(L=((-1.5, .2), (-1.95, .7)), R=((1.5, -.2), (1.55, -.95)), legs='step', racket=True, tilt=-8), 'happy')
    + lball('c1', 216, 54, 10) + f'<path d="M210 64 q-8 16 -4 28" stroke="{GREYT}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/>' + spark(70, 104) + spark(262, 84, 4))
blanket = f'<path d="M30 238 Q28 206 62 204 L150 202 Q178 204 178 230 Q176 250 150 250 L62 252 Q32 252 30 238Z" fill="#D3E3F8" stroke="#8AA4BC" stroke-width="2.6" stroke-linejoin="round"/>'
rk = (f'<ellipse cx="80" cy="226" rx="24" ry="17" transform="rotate(-8 80 226)" fill="#fff" stroke="{INKC}" stroke-width="3"/><path d="M102 230 L146 238" stroke="{INKC}" stroke-width="5.5" stroke-linecap="round"/>'
      f'<path d="M69 224 q3.6 3.6 7.2 0 M85 223 q3.6 3.6 7.2 0" fill="none" stroke="{INKC}" stroke-width="2.2" stroke-linecap="round"/><path d="M79 233 h5" stroke="{INKC}" stroke-width="2.2" stroke-linecap="round"/>'
      f'<text x="96" y="200" font-size="13" font-weight="800" fill="#8AA4BC" font-family="Noto Sans CJK SC">z</text><text x="108" y="186" font-size="10" font-weight="800" fill="#8AA4BC" font-family="Noto Sans CJK SC">z</text>')
add('shh', '#F3F3F1', '球拍在睡觉，小声点。', ground(232, 250, 40) + blanket + rk + mao('d', 226, 250, 36, dict(L=((-1.0, .9), (-.12, .5)), R=((1.5, .3), (1.75, .7)), front=True, legs='step', tilt=-8), 'blank', look=-1))
add('pair', '#EFEDE3', '有人一起，就不丧了。', ground(150, 242, 100) + mao('e1', 104, 242, 38, dict(L=DOWN_L, R=((1.45, .55), (1.62, .65)), legs='stand', tilt=6), 'happy')
    + mao('e2', 192, 242, 33, dict(L=((-1.2, .5), (-.78, .66)), R=DOWN_R, legs='stand', tilt=-6), 'happy', char='rong', ) + heart(110, 120) + heart(128, 110, .8) + heart(186, 122, .9) + heart(204, 112, .7))
lamp = (f'<ellipse cx="198" cy="244" rx="74" ry="8" fill="#BFC3CB" opacity=".4"/><ellipse cx="240" cy="238" rx="15" ry="4.5" fill="#fff" stroke="{INKC}" stroke-width="2.6"/>'
        f'<path d="M240 234 Q248 196 226 172" fill="none" stroke="{INKC}" stroke-width="3" stroke-linecap="round"/><path d="M200 154 Q216 136 244 146 L230 176 Q208 174 200 154Z" fill="#E4E6EB" stroke="{INKC}" stroke-width="3" stroke-linejoin="round"/><path d="M206 182 L188 244 H242 L226 182Z" fill="#FFF3C8" opacity=".35"/>')
moon = f'<path d="M48 64 a14 14 0 1 0 18 20 a10 10 0 1 1 -18 -20Z" fill="#fff" stroke="#C9CDD4" stroke-width="2"/>' + spark(92, 60, 4, '#C9CDD4') + spark(70, 110, 3, '#C9CDD4')
phone = f'<g transform="rotate(-12 164 232)"><rect x="150" y="212" width="24" height="38" rx="5" fill="#FFF3C8" stroke="{INKC}" stroke-width="2.8"/><path d="M156 222 h12 M156 229 h9" stroke="#E0B84A" stroke-width="2" stroke-linecap="round"/></g>'
add('night-lamp', '#F1F2F4', '夜深了，还在看球局。', moon + lamp + mao('f', 100, 246 + 18, 42, dict(L=((-1.1, .9), (-.35, 1.05)), R=((1.15, .9), (1.45, 1.05)), legs='stand', tilt=5), 'tired', look=1) + phone + f'<path d="M24 246 H276" stroke="{INKC}" stroke-width="3.2" stroke-linecap="round"/><rect x="24" y="247" width="252" height="40" fill="#F1F2F4"/>')
out = HERE / '小毛动作'; out.mkdir(exist_ok=True)
for k, bg, cap, body in cards: (out / f'mao-{k}.svg').write_text(wrap(bg, cap, body))
html = '<style>body{margin:0;padding:24px;background:#fff;display:grid;grid-template-columns:repeat(3,300px);gap:18px}</style>' + ''.join(wrap(*c[1:]) for c in cards)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1040, 'height': 700}, device_scale_factor=1.5); pg.set_content(html); pg.screenshot(path=str(HERE / '小毛动作.png'), full_page=True); b.close()
