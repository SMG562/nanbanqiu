from gen_stage_lib import *
from lib import ball as lball
cards = []
def add(key, title, sub, svg): cards.append((key, title, sub, svg))
P_ = SAGE
# 1 无球局：球场上的发球
court = (f'<path d="M26 160 L64 120 H156 L194 160Z" fill="#F8F4E1"/>'
         + ''.join(f'<path d="{d}" stroke="#fff" stroke-width="2.4" fill="none" stroke-linejoin="round"/>' for d in ('M26 160 L64 120 H156 L194 160Z', 'M110 120 V160', 'M44 140 H176'))
         + f'<path d="M58 120 V104 M162 120 V104" stroke="{P_["line"]}" stroke-width="2.4" stroke-linecap="round"/><path d="M58 106 H162 V118 H58Z" fill="#fff" fill-opacity=".55" stroke="{P_["line"]}" stroke-width="1.6"/>'
         + ''.join(f'<path d="M{x} 106 V118" stroke="{P_["line"]}" stroke-width=".9" opacity=".7"/>' for x in range(68, 160, 10)))
fig1 = mao('a', 86, 176, 27, dict(L=((-1.5, -.3), (-1.18, -1.15)), R=((1.40, .36), (1.30, .30)), legs='stand', racket=True), 'happy')
bx, by = 86 - 1.18 * 27 - 4, 176 - 1.53 * 27 - 1.15 * 27 - 24
s1 = sw(stage('1', P_, '', '', court) + fig1 + ball(bx, by, 7.5) + f'<path d="M{bx} {by+11} Q{bx+2} {by+22} {bx} {by+32}" stroke="{PEN}" stroke-width="1.8" stroke-dasharray="1 5" stroke-linecap="round" fill="none"/>'
        + confetti(P_, (('o', 22, 52), ('p', 194, 62), ('s', 186, 30), ('a', 34, 90), ('q', 200, 98))))
add('no-games', '该你发球了。', '某天还没有球局', s1)
# 2 筛选无结果：放大镜下的小毛探头
lens = (f'<g transform="translate(118 74) rotate(-30)"><rect x="-6" y="30" width="12" height="46" rx="6" fill="{P_["dark"]}"/><circle r="38" fill="#fff" fill-opacity=".55" stroke="#9DB6C7" stroke-width="6"/>'
        f'<path d="M-24 -10 a26 26 0 0 1 20 -22" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".9"/>'
        f'<path d="M-14 4 q6 -12 14 -6 q8 6 0 12 l-4 4 M0 22 h.1" fill="none" stroke="#8FAE8B" stroke-width="3.4" stroke-linecap="round" opacity=".8" transform="translate(6 -2)"/></g>')
hill_cover = f'<path d="M0 170 Q60 152 118 168 T220 160 V220 H0Z" fill="{P_["near"]}"/>'
hands = ''.join(f'<circle cx="{x}" cy="{y}" r="4.6" fill="#FFF8E8" stroke="{PEN}" stroke-width="2"/>' for x, y in ((56, 166), (96, 166)))
# 重新拼：小毛在近山后探头 -> 先画小毛，再盖山
base = stage('2', P_, '', '', '', hills=False)
s2 = (f'<defs><linearGradient id="sb2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{P_["bg1"]}"/><stop offset="1" stop-color="{P_["bg2"]}"/></linearGradient><clipPath id="sc2"><circle cx="{CXS}" cy="{CYS}" r="{RS}"/></clipPath></defs>'
      f'<circle cx="{CXS}" cy="{CYS}" r="{RS}" fill="url(#sb2)"/><g clip-path="url(#sc2)"><path d="M0 150 Q46 126 96 146 T220 136 V220 H0Z" fill="{P_["far"]}"/>'
      f'{lball("p2", 78, 158, 24)}'
      f'{lens}'
      f'<path d="M0 172 Q60 152 118 168 T220 160 V220 H0Z" fill="{P_["near"]}"/>{hands}</g>'
      + f'<g transform="translate(78 158)"></g>')
# 脸叠在球上（face2）
from mao3 import face3
s2 = sw(s2.replace('</g>' , '</g>', 1) + f'<g transform="translate(0 0)">{face3(78 + 1, 158 + 1.5, 24 / 118, "wow", 1)}</g>' + confetti(P_, (('o', 24, 60), ('p', 196, 54), ('s', 30, 36), ('a', 190, 104), ('q', 22, 110))))
add('no-results', '条件有点挑。', '筛选后没有结果', s2)
# 3 邮箱里的小毛
mb = (f'<rect x="104" y="136" width="12" height="52" fill="{P_["dark"]}"/>'
      f'<path d="M56 140 V104 Q56 74 90 74 H134 Q164 74 164 104 V140Z" fill="#CFE0C8" stroke="{P_["line"]}" stroke-width="2"/>'
      f'<path d="M56 140 H164" stroke="{P_["line"]}" stroke-width="2"/>'
      f'<path d="M56 104 Q56 74 78 74 Q92 74 92 104 V140 H56Z" fill="#A9C7A0"/>'
      f'<path d="M48 108 Q26 112 26 138 Q40 150 56 138Z" fill="#B9D3B0" stroke="{P_["line"]}" stroke-width="2" stroke-linejoin="round" transform="translate(4 0)"/>')
flag = f'<rect x="110" y="92" width="46" height="6" rx="3" fill="{ACC}"/><circle cx="110" cy="95" r="6" fill="{ACC}"/><rect x="150" y="88" width="9" height="14" rx="2" fill="{ACC}"/>'
ball_in = lball('m3', 78, 112, 20)
face_in = face3(79, 114, 20 / 118, 'smile', -1)
hnd = f'<circle cx="94" cy="130" r="4.6" fill="#FFF8E8" stroke="{PEN}" stroke-width="2"/><circle cx="62" cy="130" r="4.6" fill="#FFF8E8" stroke="{PEN}" stroke-width="2"/>'
cl = lambda x, y, k: f'<g transform="translate({x} {y}) scale({k})"><path d="M0 14 q-4 -14 12 -14 q6 -12 22 -4 q18 -2 18 10 q8 2 4 8Z" fill="#fff" fill-opacity=".85"/></g>'
s3 = sw(stage('3', P_, cl(30, 40, 1) + cl(140, 56, .8), '', mb + ball_in + face_in + hnd + flag) + confetti(P_, (('o', 190, 40), ('p', 24, 100), ('s', 176, 150), ('q', 200, 108))))
add('no-messages', '收件箱比球场还安静。', '没有消息', s3)
# 4 球拍当天线：断线
dish = (f'<g transform="translate(120 86) rotate(30)"><ellipse rx="26" ry="36" fill="#fff" fill-opacity=".75" stroke="#5B7A62" stroke-width="3"/>'
        + ''.join(f'<path d="M{-24+4*i} {-4*i+16} Q0 {4*i-2} {24-4*i} {-4*i+16}" fill="none" stroke="{P_["line"]}" stroke-width="1" opacity=".0"/>' for i in range(0))
        + ''.join(f'<path d="M{k*8} -32 V32" stroke="{P_["line"]}" stroke-width="1.1"/>' for k in (-2, -1, 0, 1, 2))
        + ''.join(f'<path d="M-24 {k*10} H24" stroke="{P_["line"]}" stroke-width="1.1"/>' for k in (-2, -1, 0, 1, 2))
        + f'<path d="M-24 0 H-6" stroke="#fff" stroke-width="3"/><path d="M6 0 q8 5 16 -1" fill="none" stroke="{PEN}" stroke-width="1.8" stroke-linecap="round"/></g>'
        f'<path d="M104 124 L92 168" stroke="#5B7A62" stroke-width="4" stroke-linecap="round"/>')
sig = ''.join(f'<path d="M{150+i*13} {42+i*0} a{20+i*13} {20+i*13} 0 0 1 {0} {0}" fill="none"/>' for i in range(0))
arcs = (f'<path d="M150 70 q14 -2 20 -16" fill="none" stroke="{P_["line"]}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 6"/>'
        f'<path d="M158 82 q24 -4 32 -30" fill="none" stroke="{P_["line"]}" stroke-width="2" stroke-linecap="round" stroke-dasharray="2 6"/>'
        f'<path d="M184 36 l12 12 M196 36 l-12 12" stroke="{ACC}" stroke-width="3" stroke-linecap="round"/>')
fig4 = mao('d', 62, 176, 24, dict(L=((-1.5, -.2), (-1.0, -1.0)), R=DOWN_R, legs='stand'), 'sweat', look=1)
s4 = sw(stage('4', P_, '', '', dish + arcs) + fig4 + confetti(P_, (('o', 30, 60), ('p', 190, 128), ('q', 28, 120))))
add('offline', '断线了。', '没有网络', s4)
# 5 出界：彗星球
cometb = lball('c5', 160, 64, 11)
trail = f'<path d="M150 74 Q110 100 60 110" stroke="{P_["line"]}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/><path d="M154 80 Q118 108 78 124" stroke="{P_["line"]}" stroke-width="1.6" stroke-dasharray="1 7" stroke-linecap="round" fill="none"/>'
planet = f'<circle cx="52" cy="56" r="18" fill="#F4B9A8" opacity=".9"/><ellipse cx="52" cy="56" rx="28" ry="7" fill="none" stroke="{P_["line"]}" stroke-width="1.8" transform="rotate(-20 52 56)"/><path d="M47 52 q0 -6 6 -6 q6 0 6 5 q0 4 -6 6 M53 63 h.1" stroke="{PEN}" stroke-width="2.2" stroke-linecap="round" fill="none"/>'
fig5 = mao('e', 112, 176, 25, 'sorry', 'wow')
stars = ''.join(f'<path d="M{x} {y-4} v8 M{x-4} {y} h8" stroke="{P_["line"]}" stroke-width="1.6" stroke-linecap="round"/>' for x, y in ((112, 40), (180, 108), (30, 100)))
s5 = sw(stage('5', P_, planet + trail + stars, '', '') + fig5 + cometb + confetti(P_, (('o', 26, 34), ('s', 176, 28), ('q', 196, 146))))
add('not-found', '这局飞出界了。', '球局不存在', s5)
# 6 路牌：欢迎 / 登录
post = (f'<rect x="106" y="86" width="8" height="90" rx="3" fill="{P_["dark"]}"/>'
        + ''.join(f'<g transform="translate(110 {y}) rotate({r})"><path d="M-30 -9 H26 L38 0 L26 9 H-30Z" fill="#FFF8E8" stroke="{P_["line"]}" stroke-width="1.8" stroke-linejoin="round"/>{ic}</g>'
                  for y, r, ic in ((96, -4, f'<circle cx="-16" cy="0" r="4.4" fill="#C6EA3D" stroke="{PEN}" stroke-width="1.4"/><path d="M-6 0 h22" stroke="{P_["line"]}" stroke-width="2.4" stroke-linecap="round"/>'),
                                   (118, 3, f'<rect x="-22" y="-5" width="10" height="10" rx="2" fill="none" stroke="{P_["line"]}" stroke-width="1.8"/><path d="M-4 0 h16" stroke="{P_["line"]}" stroke-width="2.4" stroke-linecap="round"/>'),
                                   (140, -3, f'<path d="M-22 -4 h12 v8 h-12Z" fill="none" stroke="{P_["line"]}" stroke-width="1.8"/><path d="M-4 0 h14" stroke="{P_["line"]}" stroke-width="2.4" stroke-linecap="round"/>'))))
fig6 = mao('f', 54, 176, 25, 'wave', 'happy')
bal = f'<g transform="translate(160 66)"><path d="M0 0 q-18 -6 -14 -26 q14 -14 28 0 q4 20 -14 26Z" fill="#B9D6C9" stroke="{P_["line"]}" stroke-width="1.8"/><path d="M-8 2 l-3 8 h22 l-3 -8" fill="#E8D5B0" stroke="{P_["line"]}" stroke-width="1.6" stroke-linejoin="round"/></g>'
s6 = sw(stage('6', P_, bal, '', post) + fig6 + confetti(P_, (('o', 30, 40), ('p', 190, 130), ('a', 162, 100))))
add('login', '嗨，先认识一下。', '登录 / 欢迎', s6)
# 8 雨天取消
rainp = RAIN
ux, uy = 92, 112
umb = f'<path d="M{ux-44} {uy} Q{ux} {uy-52} {ux+44} {uy} Q{ux+22} {uy-8} {ux} {uy} Q{ux-22} {uy-8} {ux-44} {uy}Z" fill="{ACC}" stroke="{PEN}" stroke-width="2.4" stroke-linejoin="round"/><path d="M{ux} {uy} V{uy+44}" stroke="{PEN}" stroke-width="2.4" stroke-linecap="round"/>'
cl2 = lambda x, y, k: f'<g transform="translate({x} {y}) scale({k})"><path d="M0 16 q-6 -16 14 -16 q8 -14 26 -4 q20 -2 20 12 q8 2 4 8Z" fill="#fff"/></g>'
drops = ''.join(f'<path d="M{x} {y} l-3 9" stroke="#9DB2C2" stroke-width="2.2" stroke-linecap="round"/>' for x, y in ((40, 70), (58, 92), (150, 74), (170, 96), (130, 98), (30, 112), (186, 120)))
fig8 = mao('h', 92, 176, 25, dict(L=DOWN_L, R=((1.5, -.2), (1.0, -1.0)), legs='stand'), 'smile')
puddle = f'<ellipse cx="160" cy="180" rx="22" ry="5" fill="#B3C7D4"/><ellipse cx="160" cy="180" rx="10" ry="2.4" fill="none" stroke="#fff" stroke-width="1.2"/>'
s8 = sw(stage('8', rainp, cl2(20, 24, 1) + cl2(120, 34, 1.1) + drops, '', puddle) + fig8 + umb + confetti(rainp, (('o', 196, 50), ('p', 24, 128))))
add('cancelled', '这局取消了。', '已取消', s8)
# 9 球罐塞满：约满
can = (f'<rect x="76" y="108" width="68" height="70" rx="10" fill="#F6F1E1" stroke="{PEN}" stroke-width="2.6"/><path d="M76 124 H144 M76 162 H144" stroke="{P_["line"]}" stroke-width="2"/><path d="M92 136 h36 M92 148 h22" stroke="{P_["line"]}" stroke-width="3" stroke-linecap="round" opacity=".6"/>')
balls = lball('b1', 92, 100, 15) + lball('b2', 128, 98, 15) + lball('b3', 110, 88, 15)
lid = f'<ellipse cx="110" cy="76" rx="40" ry="9" fill="#fff" stroke="{PEN}" stroke-width="2.6" transform="rotate(-6 110 76)"/>'
fig9 = mao('i', 48, 176, 22, dict(L=((-1.2, .3), (-.4, -.1)), R=DOWN_R, legs='stand'), 'sweat', look=1)
s9 = sw(stage('9', P_, '', '', can + balls + lid) + fig9 + confetti(P_, (('o', 30, 50), ('p', 192, 64), ('s', 184, 150), ('a', 36, 110))))
add('full', '来晚一步。', '已满员', s9)
# 7 日夜切换（独立构图）
def toggle():
    day = (f'<defs><linearGradient id="dg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FB8F0"/><stop offset="1" stop-color="#CFE7FA"/></linearGradient><clipPath id="dc"><rect x="20" y="30" width="180" height="70" rx="35"/></clipPath>'
           f'<linearGradient id="ng" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A4658"/><stop offset="1" stop-color="#1F2735"/></linearGradient><clipPath id="nc"><rect x="20" y="120" width="180" height="70" rx="35"/></clipPath></defs>'
           f'<rect x="16" y="26" width="188" height="78" rx="39" fill="#E3E9EE"/><rect x="20" y="30" width="180" height="70" rx="35" fill="url(#dg)"/><g clip-path="url(#dc)">'
           f'<circle cx="150" cy="86" r="30" fill="#fff" opacity=".35"/><circle cx="178" cy="70" r="26" fill="#fff" opacity=".5"/><circle cx="130" cy="96" r="22" fill="#fff" opacity=".6"/></g>'
           f'<g>{lball("tg", 56, 65, 26)}</g>')
    night = (f'<rect x="16" y="116" width="188" height="78" rx="39" fill="#E3E9EE"/><rect x="20" y="120" width="180" height="70" rx="35" fill="url(#ng)"/><g clip-path="url(#nc)">'
             + ''.join(f'<path d="M{x} {y-4} v8 M{x-4} {y} h8" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>' for x, y in ((40, 140), (78, 168), (100, 134), (62, 176)))
             + '<circle cx="50" cy="156" r="2" fill="#fff" opacity=".6"/><circle cx="90" cy="150" r="1.6" fill="#fff" opacity=".5"/></g>'
             + f'<circle cx="164" cy="155" r="26" fill="#E8EDF2"/><circle cx="154" cy="146" r="6" fill="#B7C3D1"/><circle cx="172" cy="166" r="7" fill="#B7C3D1"/><circle cx="174" cy="146" r="3.4" fill="#B7C3D1"/>')
    return sw(day + night)
add('day-night', '白天场 / 夜场', '时段切换（球是太阳）', toggle())

out = pathlib.Path(__file__).parent / '舞台风'; out.mkdir(exist_ok=True)
for k, t, s_, svg in cards: (out / f'stage-{k}.svg').write_text(svg)
html = '''<style>body{margin:0;background:#fff;font-family:'Noto Sans CJK SC',sans-serif;padding:24px;display:grid;grid-template-columns:repeat(3,300px);gap:20px}
.c{background:#FAFAF7;border-radius:22px;padding:14px 8px 16px;text-align:center}.c svg{width:230px;height:230px}
h3{margin:2px 0 3px;font-size:18px;color:#0B3B2A}p{margin:0;font-size:12.5px;color:#9ca3af}</style>''' + ''.join(f'<div class="c">{svg}<h3>{t}</h3><p>{s_}</p></div>' for k, t, s_, svg in cards)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':1000,'height':900}); pg.set_content(html); pg.screenshot(path=str(pathlib.Path(__file__).parent / '舞台风总览.png'), full_page=True); b.close()
