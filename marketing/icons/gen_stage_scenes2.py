from gen_stage_lib import *
from lib import ball as lball
from mao3 import face3
import pathlib
WARM = dict(bg1='#FFF7E6', bg2='#FBE5C0', far='#F6D9AE', near='#EECB98', dark='#E3B87E', tree='#EAC48F', line='#C79A62')
NIGHT = dict(bg1='#3C4E68', bg2='#243247', far='#2C3C54', near='#26364D', dark='#1F2D42', tree='#31445F', line='#9FB4CF')
P_ = SAGE
cards = []
def add(key, title, sub, svg): cards.append((key, title, sub, svg))
def court(pal, big=True):
    return (f'<path d="M26 160 L64 120 H156 L194 160Z" fill="#F8F4E1"/>'
            + ''.join(f'<path d="{d}" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/>' for d in ('M26 160 L64 120 H156 L194 160Z', 'M110 120 V160', 'M44 140 H176'))
            + f'<path d="M58 120 V104 M162 120 V104" stroke="{pal["line"]}" stroke-width="2.4" stroke-linecap="round"/><path d="M58 106 H162 V118 H58Z" fill="#fff" fill-opacity=".55" stroke="{pal["line"]}" stroke-width="1.6"/>'
            + ''.join(f'<path d="M{x} 106 V118" stroke="{pal["line"]}" stroke-width=".9" opacity=".7"/>' for x in range(68, 160, 10)))
cloud = lambda x, y, k, c='#fff': f'<g transform="translate({x} {y}) scale({k})"><path d="M0 14 q-4 -14 12 -14 q6 -12 22 -4 q18 -2 18 10 q8 2 4 8Z" fill="{c}" fill-opacity=".85"/></g>'
hand = lambda x, y: f'<circle cx="{x}" cy="{y}" r="4.6" fill="#FFF8E8" stroke="{PEN}" stroke-width="2"/>'
def sw_(inner): return sw(inner)

# 1 没有通知：听着呢
bellsvg = (f'<path d="M150 70 V46 H178" fill="none" stroke="{P_["line"]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="146" y="70" width="8" height="104" rx="3" fill="{P_["dark"]}"/>'
           f'<path d="M178 46 V60" stroke="{P_["line"]}" stroke-width="2"/><path d="M166 90 q0 -30 12 -30 q12 0 12 30Z" fill="#F4D58A" stroke="{P_["line"]}" stroke-width="2" stroke-linejoin="round"/><path d="M162 90 H194" stroke="{P_["line"]}" stroke-width="2.6" stroke-linecap="round"/><circle cx="178" cy="96" r="3.4" fill="{P_["line"]}"/>'
           f'<g fill="{ACC}"><circle cx="170" cy="36" r="2.2"/><circle cx="178" cy="32" r="2.2"/><circle cx="186" cy="36" r="2.2"/></g>')
fig = mao('a', 96, 176, 26, dict(L=((-1.5, .3), (-1.03, -.06)), R=DOWN_R, legs='stand'), 'smile', look=1)
add('no-notice', '听着呢。', '暂无通知', sw_(stage('n1', P_, cloud(24, 40, 1) + cloud(110, 24, .8), '', bellsvg) + fig + confetti(P_, (('o', 26, 100), ('p', 196, 112), ('q', 24, 142), ('s', 54, 66)))))
# 2 加载：热身中
fig = mao('b', 84, 176, 27, dict(L=DOWN_L, R=((1.40, .36), (1.30, .30)), legs='stand', racket=True), 'happy')
bx, by = 84 + 1.62 * 27 + 8, 176 - 1.53 * 27 - 1.2 * 27 - 28
add('loading', '热身中。', '加载', sw_(stage('l1', P_, '', '', court(P_)) + fig + ball(bx, by, 8) + f'<path d="M{bx-6} {by+14} q-6 14 -2 28 M{bx+8} {by+14} q8 14 4 28" stroke="{PEN}" stroke-width="1.8" stroke-dasharray="1 5" stroke-linecap="round" fill="none"/>'
        + f'<g fill="{P_["line"]}"><circle cx="150" cy="40" r="3.4"/><circle cx="162" cy="40" r="3.4" opacity=".6"/><circle cx="174" cy="40" r="3.4" opacity=".3"/></g>' + confetti(P_, (('o', 28, 54), ('p', 196, 70), ('a', 40, 100), ('q', 200, 120)))))
# 3 报名成功
fig = mao('c', 100, 176, 27, dict(L=DOWN_L, R=((1.55, -.1), (1.30, -1.12)), legs='stand'), 'happy')
burst = ''.join(f'<path d="M{150+math.cos(a)*30:.1f} {52+math.sin(a)*30:.1f} L{150+math.cos(a)*40:.1f} {52+math.sin(a)*40:.1f}" stroke="{P_["line"]}" stroke-width="2.2" stroke-linecap="round"/>' for a in [i * math.pi / 5 - math.pi * .9 for i in range(8)])
add('joined', '位置给你留好了。', '报名成功', sw_(stage('j1', P_, '', '', '') + fig + f'<circle cx="150" cy="52" r="22" fill="#fff" stroke="#2B7A52" stroke-width="3.4"/><path d="M140 52 l8 8 l14 -16" fill="none" stroke="#2B7A52" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>' + burst
        + confetti(P_, (('o', 30, 60), ('p', 196, 108), ('a', 42, 120), ('s', 186, 150), ('q', 26, 92)))))
# 4 新球友加入
f1 = mao('d1', 70, 176, 25, 'wave', 'happy')
f2 = mao('d2', 156, 176, 21, dict(L=((-1.5, .35), (-1.35, -.4)), R=DOWN_R, legs='stand'), 'happy', char='rong')
add('someone-here', '有人来了。', '新球友加入', sw_(stage('s1', P_, '', '', f'<path d="M96 178 q20 -6 38 -2" stroke="#fff" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round" fill="none"/>') + f1 + f2
        + f'<path d="M112 80 l0 -10 M107 75 h10" stroke="{ACC}" stroke-width="2.6" stroke-linecap="round"/>' + confetti(P_, (('o', 28, 56), ('p', 196, 70), ('s', 100, 40), ('q', 196, 128)))))
# 5 发布成功：发出去了
fig = mao('e', 74, 176, 26, 'cheer', 'happy')
fb = ball(188, 44, 8)
add('published', '发出去了。', '发布成功', sw_(stage('p1', P_, '', '', court(P_)) + fig + fb + f'<path d="M104 112 Q150 40 180 46" stroke="{PEN}" stroke-width="1.8" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/>'
        + f'<path d="M196 70 l0 -9 M191.5 65.5 h9 M150 36 l0 -7 M146.5 32.5 h7" stroke="{ACC}" stroke-width="2.4" stroke-linecap="round"/>' + confetti(P_, (('o', 26, 56), ('s', 120, 34), ('q', 200, 120), ('a', 34, 110)))))
# 6 该出门了
clk = f'<circle cx="160" cy="56" r="22" fill="#fff" stroke="{P_["line"]}" stroke-width="3"/><path d="M160 56 V42" stroke="{PEN}" stroke-width="2.6" stroke-linecap="round"/><path d="M160 56 L172 62" stroke="{ACC}" stroke-width="2.8" stroke-linecap="round"/><circle cx="160" cy="56" r="2.4" fill="{PEN}"/>'
bag = f'<g transform="translate(112 148) rotate(24)"><rect x="-11" y="-42" width="22" height="66" rx="10" fill="#D9ECC0" stroke="{PEN}" stroke-width="2.4"/><path d="M-11 -20 H11" stroke="{PEN}" stroke-width="1.8"/></g>'
fig = mao('f', 80, 176, 26, dict(L=DOWN_L, R=((1.4, .4), (1.18, .05)), legs='step'), 'happy')
add('time-to-go', '该出门了。', '球局快开始', sw_(stage('t1', P_, clk, '', '') + bag + fig + confetti(P_, (('o', 30, 50), ('p', 196, 112), ('a', 40, 104), ('s', 100, 36)))))
# 7 赛后（暖色）
sunw = f'<circle cx="110" cy="150" r="46" fill="#FFD9A0"/>' + ''.join(f'<path d="M{110+math.cos(a)*54:.1f} {150+math.sin(a)*54:.1f} L{110+math.cos(a)*66:.1f} {150+math.sin(a)*66:.1f}" stroke="#F6C27A" stroke-width="3" stroke-linecap="round"/>' for a in (-2.7, -2.2, -1.57, -.94, -.44))
bt = f'<rect x="132" y="104" width="16" height="34" rx="5" fill="#BFE6F2" stroke="{PEN}" stroke-width="2.4" transform="rotate(14 140 120)"/><rect x="136" y="97" width="10" height="8" rx="2" fill="#fff" stroke="{PEN}" stroke-width="2" transform="rotate(14 140 120)"/>'
fig = mao('g', 94, 176, 26, dict(L=DOWN_L, R=((1.5, .2), (1.38, -.45)), legs='stand'), 'happy')
add('after-game', '打完了，喝口水。', '赛后', sw_(stage('a1', WARM, sunw, '', '') + fig + bt + confetti(WARM, (('o', 28, 56), ('p', 196, 70), ('a', 36, 112), ('s', 176, 150)))))
# 8 热浪（暖色）
sun8 = f'<circle cx="164" cy="56" r="24" fill="#FFD66B" stroke="{WARM["line"]}" stroke-width="2.4"/>' + ''.join(f'<path d="M{164+math.cos(a)*32:.1f} {56+math.sin(a)*32:.1f} L{164+math.cos(a)*40:.1f} {56+math.sin(a)*40:.1f}" stroke="#F2B134" stroke-width="3" stroke-linecap="round"/>' for a in [i * math.pi / 5 for i in range(10)])
pop = f'<rect x="128" y="104" width="16" height="26" rx="7" fill="#F4A6BE" stroke="{PEN}" stroke-width="2.4"/><path d="M136 130 v14" stroke="{PEN}" stroke-width="2.6" stroke-linecap="round"/><path d="M134 146 q2 6 0 10" stroke="#F4A6BE" stroke-width="3" stroke-linecap="round" fill="none"/>'
fig = mao('h', 92, 176, 26, dict(L=DOWN_L, R=((1.5, .5), (1.52, .0)), legs='stand'), 'sweat')
add('heat', '今天 38 度。', '高温', sw_(stage('h1', WARM, sun8, '', '') + fig + pop + confetti(WARM, (('o', 28, 60), ('p', 40, 116), ('q', 198, 126)))))
# 9 球等了你一会儿
clk9 = f'<rect x="146" y="50" width="8" height="126" rx="3" fill="{P_["dark"]}"/><circle cx="150" cy="56" r="26" fill="#fff" stroke="{P_["line"]}" stroke-width="3"/><path d="M150 56 V38" stroke="{PEN}" stroke-width="2.8" stroke-linecap="round"/><path d="M150 56 L166 64" stroke="{ACC}" stroke-width="3" stroke-linecap="round"/><circle cx="150" cy="56" r="2.6" fill="{PEN}"/>'
fig = mao('i', 92, 176, 26, dict(L=DOWN_L, R=((1.5, .5), (1.4, .25)), legs='stand'), 'sweat', look=1)
add('late', '球等了你一会儿。', '爽约 / 迟到', sw_(stage('o1', P_, cloud(24, 40, 1), '', clk9) + fig + confetti(P_, (('o', 26, 100), ('p', 196, 130), ('s', 60, 62), ('q', 24, 130)))))
# 10 改期
cal = (f'<rect x="130" y="64" width="62" height="70" rx="9" fill="#fff" stroke="{P_["line"]}" stroke-width="2.4"/><path d="M130 64 h62 v18 h-62Z" fill="#F4B58A" stroke="{P_["line"]}" stroke-width="2.4" stroke-linejoin="round"/>'
       + ''.join(f'<circle cx="{144+i*17}" cy="{98+j*15}" r="2.4" fill="{P_["line"]}" opacity=".6"/>' for j in range(3) for i in range(3))
       + f'<path d="M192 134 q-22 2 -26 -20 q20 0 26 20Z" fill="#F7F3E4" stroke="{P_["line"]}" stroke-width="2" stroke-linejoin="round"/><rect x="156" y="134" width="8" height="42" fill="{P_["dark"]}"/>')
fig = mao('j', 80, 176, 26, dict(L=DOWN_L, R=((1.6, .2), (1.72, -.7)), legs='stand'), 'smile', look=1)
add('reschedule', '改期也行。', '改期', sw_(stage('r1', P_, cloud(24, 36, 1), '', cal) + fig + confetti(P_, (('o', 28, 100), ('p', 196, 54), ('a', 40, 132), ('s', 100, 40)))))
# 11 夜场
pool = f'<ellipse cx="92" cy="172" rx="62" ry="14" fill="#F1F5DD" opacity=".92"/>'
lamp = f'<rect x="150" y="62" width="8" height="114" rx="3" fill="#1C2838"/><rect x="138" y="50" width="30" height="18" rx="4" fill="#FFF3C8" stroke="#9FB4CF" stroke-width="2"/><path d="M142 68 L72 176 H162Z" fill="#FFF3C8" opacity=".22"/>'
moon = f'<path d="M40 34 a16 16 0 1 0 20 22 a12 12 0 1 1 -20 -22Z" fill="#FFE9A8"/>' + ''.join(f'<path d="M{x} {y-3} v6 M{x-3} {y} h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' for x, y in ((90, 40), (120, 62), (176, 38), (28, 90)))
fig = mao('k', 92, 176, 26, dict(L=DOWN_L, R=((1.5, .3), (1.3, .0)), legs='stand', racket=True), 'happy')
add('night', '灯亮着。', '夜场', sw_(stage('g1', NIGHT, moon, '', pool + lamp) + fig + confetti(NIGHT, (('o', 24, 118), ('p', 196, 100), ('q', 26, 150)))))
# 12 第一局：领奖台
pod = f'<rect x="62" y="136" width="64" height="40" rx="6" fill="#FFF8E8" stroke="{P_["line"]}" stroke-width="2.4"/><path d="M90 148 l6 -5 v22" fill="none" stroke="{ACC}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
fig = mao('l', 94, 136, 24, dict(L=((-1.58, -.05), (-1.36, -1.0)), R=((1.58, -.05), (1.36, -1.0)), legs='stand'), 'happy')
medal = f'<path d="M86 108 l-3 -16 M102 108 l3 -16" stroke="{ACC}" stroke-width="3" stroke-linecap="round" opacity="0"/>'
rays = ''.join(f'<path d="M{94+math.cos(a)*62:.1f} {70+math.sin(a)*62:.1f} L{94+math.cos(a)*74:.1f} {70+math.sin(a)*74:.1f}" stroke="{P_["line"]}" stroke-width="2.2" stroke-linecap="round"/>' for a in [i * math.pi / 6 - math.pi * 1.0 for i in range(7)])
add('first-game', '第一局。', '里程碑', sw_(stage('f1', P_, '', '', '') + pod + fig + rays + confetti(P_, (('o', 26, 56), ('p', 190, 60), ('a', 168, 100), ('s', 160, 140), ('q', 26, 110)))))
# 13 捡完了
bk = (f'<path d="M122 140 L128 176 H164 L170 140Z" fill="#fff" fill-opacity=".7" stroke="{P_["line"]}" stroke-width="2.2" stroke-linejoin="round"/>' + ''.join(f'<path d="M{x} 144 V172" stroke="{P_["line"]}" stroke-width="1.2" opacity=".5"/>' for x in (134, 146, 158))
      + lball('k1', 134, 132, 11) + lball('k2', 156, 130, 11) + lball('k3', 145, 118, 11))
fig = mao('m', 72, 176, 26, dict(L=DOWN_L, R=((1.4, .4), (1.55, .2)), legs='stand'), 'happy')
add('the-end', '球都捡完了。', '列表到底', sw_(stage('e1', P_, cloud(24, 40, 1), '', court(P_)) + bk + fig + confetti(P_, (('o', 28, 100), ('p', 196, 60), ('a', 190, 104), ('q', 26, 140)))))
# 14 换新球
can = (f'<rect x="120" y="112" width="40" height="62" rx="8" fill="#F6F1E1" stroke="{PEN}" stroke-width="2.4"/><path d="M120 128 H160 M120 160 H160" stroke="{P_["line"]}" stroke-width="2"/>'
       f'<ellipse cx="140" cy="112" rx="20" ry="6" fill="#fff" stroke="{PEN}" stroke-width="2.2"/>' + lball('u1', 140, 100, 12)
       + f'<g transform="translate(170 76) rotate(28)"><ellipse rx="19" ry="5.4" fill="#fff" stroke="{PEN}" stroke-width="2.2"/></g>'
       + f'<path d="M132 84 l-6 -8 M142 80 v-10 M152 84 l6 -8" stroke="{ACC}" stroke-width="2.6" stroke-linecap="round"/>')
fig = mao('n', 76, 176, 26, dict(L=DOWN_L, R=((1.4, .4), (1.8, .1)), legs='stand'), 'happy')
add('update', '换新球了。', '有新版本', sw_(stage('u2', P_, '', '', can) + fig + confetti(P_, (('o', 28, 60), ('p', 196, 140), ('s', 60, 40), ('a', 36, 108), ('q', 200, 98)))))

out = pathlib.Path(__file__).parent / '舞台风'; out.mkdir(exist_ok=True)
for k, t, s_, svg in cards: (out / f'stage-{k}.svg').write_text(svg)
html = '''<style>body{margin:0;background:#fff;font-family:'Noto Sans CJK SC',sans-serif;padding:24px;display:grid;grid-template-columns:repeat(4,240px);gap:16px}
.c{background:#FAFAF7;border-radius:22px;padding:12px 6px 14px;text-align:center}.c svg{width:196px;height:196px}
h3{margin:2px 0 3px;font-size:16.5px;color:#0B3B2A}p{margin:0;font-size:12px;color:#9ca3af}</style>''' + ''.join(f'<div class="c">{svg}<h3>{t}</h3><p>{s_}</p></div>' for k, t, s_, svg in cards)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1040,'height':900}); pg.set_content(html); pg.screenshot(path=str(pathlib.Path(__file__).parent / '舞台风总览2.png'), full_page=True); b.close()
