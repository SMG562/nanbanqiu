from helpers import *
import pathlib
cards = []
def card(key, title, sub, body): cards.append((key, title, sub, wrap(body)))
def note(x, y, k=1):
    return ln(f'M{x} {y} v{-16*k} q9 2 8 {10*k}', 2.4) + f'<ellipse cx="{x-3.5}" cy="{y+.5}" rx="4.6" ry="3.4" fill="{PEN}" transform="rotate(-20 {x-3.5} {y})"/>'

# 1 吹口哨
card('whistle', '我才没在等。', '你发一局，我假装路过。',
     fig('a', dict(L=None, R=None, legs='stand'), 'smile', look=1) + note(170, 100) + note(186, 82, .9))
# 2 热身做完
card('warmup', '热身做完了。', '就差你发一局。',
     fig('b', dict(L=((-1.5, .5), (-1.15, .75)), R=((1.5, -.9), (.25, -1.75)), legs='stand', tilt=-8), 'happy')
     + ln('M40 96 q-8 14 0 28', 2.2, extra='opacity=".6"') + ln('M30 90 q-12 20 0 40', 2.2, extra='opacity=".4"'))
# 3 占场
fx, fy = P(1.95, 1.38)
card('hold-court', '场地我先替你占着。', '今天还没有球局，发一局就能用。',
     fig('c', dict(L=((-1.8, .35), (-1.0, .66)), R=((1.8, .35), (1.0, .66)), legs='stand'), 'smile')
     + ln(f'M{fx:.1f} {fy:.1f} V{fy-62:.1f}', 2.6) + f'<path d="M{fx:.1f} {fy-62:.1f} l30 9 l-30 11Z" fill="#F4B58A" stroke="{PEN}" stroke-width="2.4" stroke-linejoin="round"/>')
# 4 系鞋带
card('lacing', '系个鞋带。', '马上好。',
     fig('d', dict(L=DOWN_L, R=((1.62, .95), (.78, 1.40)), legs='stand', tilt=4), 'smile', look=-1))
# 5 没有更多：捡球篮
bx, by = P(-1.55, 1.02)
basket = (f'<path d="M{bx-20:.1f} {by:.1f} L{bx-15:.1f} {by+26:.1f} H{bx+15:.1f} L{bx+20:.1f} {by:.1f}Z" fill="#fff" fill-opacity=".6" stroke="{PEN}" stroke-width="2.4" stroke-linejoin="round"/>'
          + ''.join(ln(f'M{bx+k:.1f} {by+3:.1f} V{by+24:.1f}', 1.2, extra='opacity=".5"') for k in (-8, 0, 8)) + ln(f'M{bx-20:.1f} {by:.1f} Q{bx:.1f} {by-26:.1f} {bx+20:.1f} {by:.1f}', 2.4)
          + ball(bx - 8, by - 4, 9) + ball(bx + 9, by - 6, 9))
card('the-end', '球都捡完了。', '没有更多球局了。',
     fig('e', dict(L=((-1.4, .5), (-1.55, .92)), R=DOWN_R, legs='stand'), 'happy') + basket)
# 6 换新球：开罐
cx6, cy6 = P(1.55, -.78)
can = (f'<rect x="{cx6-12:.1f}" y="{cy6-4:.1f}" width="24" height="36" rx="4" fill="#fff" fill-opacity=".7" stroke="{PEN}" stroke-width="2.4"/>'
       f'<ellipse cx="{cx6:.1f}" cy="{cy6-4:.1f}" rx="12" ry="4.2" fill="#fff" stroke="{PEN}" stroke-width="2.2"/>' + ball(cx6, cy6 + 16, 7))
card('update', '换新球了。', '刷新一下，用上最新版本。',
     fig('f', dict(L=DOWN_L, R=((1.55, .3), (1.52, -.3)), legs='stand'), 'happy') + can
     + ln(f'M{cx6-18:.1f} {cy6-20:.1f} l-6 -7 M{cx6:.1f} {cy6-24:.1f} v-9 M{cx6+18:.1f} {cy6-20:.1f} l6 -7', 2.2))
# 7 报名成功
tx, ty = P(1.62, -1.78)
card('joined', '位置给你留好了。', '开打前会提醒你。',
     fig('g', dict(L=DOWN_L, R=((1.55, -.1), (1.30, -1.12)), legs='stand'), 'happy')
     + f'<circle cx="{tx+10:.1f}" cy="{ty:.1f}" r="15" fill="none" stroke="#2B7A52" stroke-width="2.8"/>' + ln(f'M{tx+3:.1f} {ty:.1f} l6 6 l10 -12', 3, col='#2B7A52'))
# 8 该出门了：球包
bgx, bgy = P(1.28, .32)
bag = (f'<g transform="translate({bgx+8:.1f} {bgy-10:.1f}) rotate(24)"><rect x="-13" y="-48" width="26" height="78" rx="12" fill="#D9ECC0" stroke="{PEN}" stroke-width="2.6"/>'
       + ln('M-13 -24 H13', 2) + ln('M0 -48 V-58', 2.4) + '</g>')
card('time-to-go', '该出门了。', '球局快开始了，别迟到。',
     bag + fig('h', dict(L=DOWN_L, R=((1.4, .4), (1.18, .05)), legs='step'), 'happy'))
# 9 有人来了：小绒探头
rg = figure3('i2', 194, 0, 28, dict(L=((-1.5, .35), (-1.35, -.4)), R=None, legs='stand'), 'happy', gy=GY, char='rong').replace('filter="url(#rough2)"', '')
card('someone-here', '有人来了。', '新的球友想加入这一局。',
     fig('i', dict(L=DOWN_L, R=((1.55, -.1), (1.34, -.95)), legs='stand'), 'happy', look=1, cx=84) + rg)
# 10 赛后喝水
wx, wy = P(1.5, -.6)
bottle = (f'<rect x="{wx-8:.1f}" y="{wy-10:.1f}" width="16" height="34" rx="5" fill="#BFE6F2" stroke="{PEN}" stroke-width="2.4"/>'
          f'<rect x="{wx-5:.1f}" y="{wy-17:.1f}" width="10" height="8" rx="2" fill="#fff" stroke="{PEN}" stroke-width="2"/>')
card('after-game', '打完了，喝口水。', '给今天的球友留个好评。',
     fig('j', dict(L=DOWN_L, R=((1.55, .25), (1.50, -.40)), legs='stand'), 'happy') + bottle
     + ln('M176 92 q-6 -6 0 -12 M188 98 q-6 -6 0 -12', 2, extra='opacity=".6"'))
# 11 夜场：泛光灯
lx = 188
lamp = (ln(f'M{lx} 200 V70', 3) + f'<rect x="{lx-14}" y="52" width="30" height="20" rx="4" fill="#FFF3C8" stroke="{PEN}" stroke-width="2.6"/>'
        + '<path d="M176 74 L96 190 H176Z" fill="#FFF3C8" opacity=".55"/>')
moon = f'<path d="M36 40 a18 18 0 1 0 22 24 a14 14 0 1 1 -22 -24Z" fill="#FFE9A8" stroke="{PEN}" stroke-width="2.4" stroke-linejoin="round"/>'
card('night', '灯亮着。', '夜场也有人约，发一局吧。',
     lamp + moon + fig('k', dict(L=DOWN_L, R=DOWN_R, legs='stand'), 'smile', cx=100)
     + ln('M78 36 l0 -7 M74.5 32.5 h7', 2) + ln('M120 22 l0 -6 M117 19 h6', 2))
# 12 通知权限：摇铃
bl, bt = P(1.55, -.82)
bell = (f'<path d="M{bl-13:.1f} {bt+16:.1f} q0 -26 13 -26 q13 0 13 26Z" fill="#F4D58A" stroke="{PEN}" stroke-width="2.4" stroke-linejoin="round"/>'
        + ln(f'M{bl-16:.1f} {bt+16:.1f} H{bl+16:.1f}', 2.6) + f'<circle cx="{bl:.1f}" cy="{bt+21:.1f}" r="3" fill="{PEN}"/>'
        + ln(f'M{bl-24:.1f} {bt-6:.1f} q-6 8 0 16 M{bl+24:.1f} {bt-6:.1f} q6 8 0 16', 2.2))
card('push', '有动静，摇铃告诉你。', '开启提醒，不错过任何一局。',
     fig('l', dict(L=DOWN_L, R=((1.55, .3), (1.52, -.28)), legs='stand'), 'happy') + bell)

out = pathlib.Path(__file__).parent / '备选'; out.mkdir(exist_ok=True)
for k, t, s, svg in cards: (out / f'mao-{k}.svg').write_text(svg)
html = '''<style>body{margin:0;background:#F7F3E8;font-family:'Noto Sans CJK SC',sans-serif;padding:22px;display:grid;grid-template-columns:repeat(4,250px);gap:16px}
.c{background:#fff;border-radius:20px;padding:12px 8px 16px;text-align:center}.c svg{width:190px;height:190px}
h3{margin:2px 0 3px;font-size:17px;color:#0B3B2A}p{margin:0;font-size:12.5px;color:#6b7280;padding:0 8px}</style>''' + ''.join(f'<div class="c">{svg}<h3>{t}</h3><p>{s}</p></div>' for k, t, s, svg in cards)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1100,'height':860}); pg.set_content(html); pg.screenshot(path=str(pathlib.Path(__file__).parent / '备选总览.png')); b.close()
