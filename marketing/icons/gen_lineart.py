"""极简线稿风（试样）：平涂荧光黄绿球 + 粗线 + 两点一线的脸；情绪靠姿势，留白多，一个点缀色。"""
import pathlib
HERE = pathlib.Path(__file__).parent
INK, LIME, PINKF, ACC, GREYT = '#2E3138', '#D4EA62', '#FFC9DA', '#E8643C', '#8C919B'
S = lambda w=5: f'stroke="{INK}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"'
n = [0]
def ball(cx, cy, rx, ry=None, fill=LIME, face=True, look=0, mouth='line', eyes='dot', fx=0, fy=0):
    ry = ry or rx; n[0] += 1; i = n[0]; r = rx
    out = (f'<clipPath id="lc{i}"><ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/></clipPath>'
           f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="{fill}"/>'
           f'<g clip-path="url(#lc{i})" fill="none" stroke="#FFFFF2" stroke-width="4.5" stroke-linecap="round" opacity=".95">'
           f'<path d="M{cx-r*.62} {cy-ry*1.2} Q{cx+r*.1} {cy} {cx-r*.62} {cy+ry*1.2}"/><path d="M{cx+r*.78} {cy-ry*1.2} Q{cx+r*.05} {cy} {cx+r*.78} {cy+ry*1.2}"/></g>'
           f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" fill="none" {S(5)}/>')
    if face:
        x, y = cx + fx + look * 4, cy + fy
        e = {'dot': f'<circle cx="{x-r*.3:.1f}" cy="{y-ry*.02:.1f}" r="3.3" fill="{INK}"/><circle cx="{x+r*.3:.1f}" cy="{y-ry*.02:.1f}" r="3.3" fill="{INK}"/>',
             'closed': ''.join(f'<path d="M{x+s*r*.3-6:.1f} {y-ry*.02:.1f} q6 5 12 0" fill="none" {S(3)}/>' for s in (-1, 1)),
             'dead': ''.join(f'<path d="M{x+s*r*.3-6:.1f} {y:.1f} h12" {S(3.4)}/>' for s in (-1, 1))}[eyes]
        m = {'line': f'<path d="M{x-5:.1f} {y+ry*.28:.1f} h10" {S(3)}/>', 'smile': f'<path d="M{x-6:.1f} {y+ry*.24:.1f} q6 6 12 0" fill="none" {S(3)}/>',
             'frown': f'<path d="M{x-6:.1f} {y+ry*.34:.1f} q6 -6 12 0" fill="none" {S(3)}/>', 'o': f'<ellipse cx="{x:.1f}" cy="{y+ry*.3:.1f}" rx="3" ry="3.6" fill="none" {S(2.6)}/>'}[mouth]
        out += e + m
    return out
foot = lambda x, y, rot=0: f'<ellipse cx="{x}" cy="{y}" rx="9" ry="5" transform="rotate({rot} {x} {y})" fill="#fff" {S(4)}/>'
def line(d): return f'<path d="{d}" fill="none" {S(5)}/>'
def shadow(cx, cy, rx): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="6" fill="#000" opacity=".08"/>'
def heart(x, y, k=1): return f'<path transform="translate({x} {y}) scale({k})" d="M0 5 C-9 -2 -5 -10 0 -5 C5 -10 9 -2 0 5Z" fill="none" stroke="#D9534F" stroke-width="2.4" stroke-linejoin="round"/>'
cards = []
def add(key, bg, cap, sub, body): cards.append((key, bg, cap, sub, body))
def wrap(bg, cap, sub, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300"><rect width="300" height="300" rx="26" fill="{bg}"/><g transform="translate(0 -16)">{body}</g>'
            f'<text x="150" y="280" text-anchor="middle" font-size="14" fill="{GREYT}" font-family="Noto Sans CJK SC, PingFang SC, sans-serif">{cap}</text></svg>')
# 1 趴着
add('lying', '#EFE9EA', '今天没人发球。', '', shadow(150, 238, 62) + foot(206, 224, 10) + foot(214, 216, 20) + line('M104 218 q-10 6 -16 2') + ball(150, 212, 50, 36, mouth='line', fx=-14, fy=2))
# 2 抱膝 + 火苗
flame = f'<path d="M150 146 C140 134 150 126 148 114 C158 122 164 134 160 146Z" fill="#FFD9C4" stroke="{ACC}" stroke-width="3.4" stroke-linejoin="round"/>'
add('sitting-fire', '#F3F2EE', '约不到，上火。', '', shadow(150, 238, 56) + ball(150, 190, 42, 44, mouth='frown', fy=6) + flame + line('M114 206 Q150 238 186 206') + foot(130, 236) + foot(170, 236))
# 3 一个人颠球
racket = f'<g {S(4.5)} fill="#fff"><ellipse cx="206" cy="132" rx="17" ry="22" transform="rotate(24 206 132)"/></g><path d="M198 152 L180 182" {S(5)}/><path d="M196 124 l16 16 M208 112 l-14 28" stroke="{INK}" stroke-width="1.6" opacity=".5"/>'
add('solo', '#F4F1E6', '等人的时候，先颠会儿。', '', shadow(130, 238, 52) + ball(126, 190, 38, mouth='smile') + line('M92 196 q-12 12 -8 26') + line('M158 198 L180 182') + line('M114 226 v10') + line('M138 226 v10') + foot(112, 238) + foot(140, 238) + racket
    + f'<circle cx="212" cy="76" r="9" fill="{LIME}" {S(3.6)}/><path d="M204 84 q-8 28 -2 36" stroke="{GREYT}" stroke-width="2.4" stroke-dasharray="1 7" stroke-linecap="round" fill="none"/>')
# 4 球拍睡着了
blanket = f'<path d="M60 230 Q58 196 90 194 L186 192 Q214 194 214 224 Q212 244 186 244 L90 246 Q62 246 60 230Z" fill="#CFE0F7" {S(5)}/>'
rk = (f'<ellipse cx="108" cy="218" rx="26" ry="19" transform="rotate(-8 108 218)" fill="#fff" {S(4.5)}/><path d="M132 222 L184 232" {S(7)}/>'
      f'<path d="M96 216 q4 4 8 0 M114 215 q4 4 8 0" fill="none" {S(2.6)}/><path d="M106 226 h6" {S(2.6)}/>'
      f'<text x="128" y="190" font-size="13" font-weight="800" fill="#8AA4BC" font-family="Noto Sans CJK SC">z</text><text x="140" y="176" font-size="10" font-weight="800" fill="#8AA4BC" font-family="Noto Sans CJK SC">z</text>')
add('racket-sleep', '#F3F3F1', '球拍在睡觉，小声点。', '', shadow(240, 244, 28) + blanket + rk + ball(240, 204, 30, look=-1, mouth='line') + line('M212 212 q-8 8 -4 20') + line('M268 212 q6 10 2 20') + foot(232, 244) + foot(250, 244))
# 5 两个并排
bow = f'<path d="M180 168 l-12 -8 v14Z M180 168 l12 -8 v14Z" fill="#fff" {S(3.4)}/>'
add('pair', '#EFEDE3', '有人一起，就不丧了。', '', shadow(150, 240, 90) + ball(108, 196, 38, mouth='smile') + ball(190, 202, 33, fill=PINKF, mouth='smile') + bow + foot(94, 238) + foot(122, 238) + foot(178, 242) + foot(204, 242)
    + heart(100, 136) + heart(116, 128, .9) + heart(186, 134) + heart(202, 128, .8) + line('M146 214 q6 4 14 0'))
# 6 夜里台灯
lamp = (f'<ellipse cx="190" cy="236" rx="74" ry="9" fill="#BFC3CB" opacity=".45"/><ellipse cx="236" cy="232" rx="16" ry="5" fill="#fff" {S(4)}/>'
        f'<path d="M236 228 Q242 188 222 164" fill="none" {S(5)}/><path d="M198 146 Q214 128 240 138 L226 168 Q206 166 198 146Z" fill="#E2E4E9" {S(4.5)}/>')
add('night-lamp', '#F4F4F2', '夜深了，还在看球局。', '', lamp + ball(104, 192, 40, look=1, mouth='line', fy=2) + f'<rect x="136" y="214" width="26" height="40" rx="5" transform="rotate(-14 149 234)" fill="#fff" {S(4)}/>' + line('M120 214 L142 224') + f'<path d="M26 238 H274" {S(4.5)}/>')
out = HERE / '线稿风'; out.mkdir(exist_ok=True)
for k, bg, cap, sub, body in cards: (out / f'line-{k}.svg').write_text(wrap(bg, cap, sub, body))
html = '<style>body{margin:0;padding:24px;background:#fff;display:grid;grid-template-columns:repeat(3,300px);gap:18px}</style>' + ''.join(wrap(*c[1:]) for c in cards)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1040, 'height': 700}, device_scale_factor=1.5); pg.set_content(html); pg.screenshot(path=str(HERE / '线稿风试样.png'), full_page=True); b.close()
