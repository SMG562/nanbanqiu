from helpers import *
import math, io
from PIL import Image
from playwright.sync_api import sync_playwright
N = 24
def frame(t):
    ph = t / N * 2 * math.pi
    # 1 热身中：颠球
    by = 60 - 22 * abs(math.sin(ph)) 
    A = fig('a', dict(L=DOWN_L, R=((1.5, .3), (1.52, -.05)), legs='step'), 'happy') + ball(P(1.5, -1.5)[0], by + 20, 10)
    # 2 摇铃
    bl, bt = P(1.55, -.82)
    ang = 16 * math.sin(ph * 2)
    bell = (f'<g transform="rotate({ang:.1f} {bl:.1f} {bt+16:.1f})"><path d="M{bl-13:.1f} {bt+16:.1f} q0 -26 13 -26 q13 0 13 26Z" fill="#F4D58A" stroke="{PEN}" stroke-width="2.4" stroke-linejoin="round"/>'
            + ln(f'M{bl-16:.1f} {bt+16:.1f} H{bl+16:.1f}', 2.6) + f'<circle cx="{bl:.1f}" cy="{bt+21:.1f}" r="3" fill="{PEN}"/></g>'
            + (ln(f'M{bl-26:.1f} {bt-6:.1f} q-6 8 0 16 M{bl+26:.1f} {bt-6:.1f} q6 8 0 16', 2.2) if abs(ang) > 8 else ''))
    B = fig('b', dict(L=DOWN_L, R=((1.55, .3), (1.52, -.28)), legs='stand'), 'happy') + bell
    # 3 吹口哨：音符飘
    C = fig('c', dict(L=None, R=None, legs='stand'), 'smile', look=1)
    for k in range(3):
        u = (t / N + k / 3) % 1
        x, y = 150 + u * 40, 110 - u * 70
        C += f'<g opacity="{1-u:.2f}"><ellipse cx="{x-3.5:.1f}" cy="{y:.1f}" rx="4.6" ry="3.4" fill="{PEN}" transform="rotate(-20 {x-3.5:.1f} {y:.1f})"/>' + ln(f'M{x:.1f} {y-1:.1f} v-16 q9 2 8 10', 2.4) + '</g>'
    return [wrap(A), wrap(B), wrap(C)]
frames = []
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':720,'height':240})
    for t in range(N):
        svgs = frame(t)
        pg.set_content('<body style="margin:0;background:#fff;display:flex">' + ''.join(f'<div style="width:240px;height:240px;padding:10px;box-sizing:border-box">{s.replace("width=\"220\" height=\"220\"","width=\"220\" height=\"220\"")}</div>' for s in svgs))
        frames.append(Image.open(io.BytesIO(pg.screenshot())).convert('P', palette=Image.ADAPTIVE))
    b.close()
frames[0].save(str(__import__('pathlib').Path(__file__).parent / '动效演示.gif'), save_all=True, append_images=frames[1:], duration=70, loop=0, optimize=True)
