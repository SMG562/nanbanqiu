"""小毛·线稿版 v2：细线 + 平涂 + 一道平涂暗面；动作靠倾斜 / 压扁 / 弯曲的手脚 / 小道具。"""
import pathlib, math
HERE = pathlib.Path(__file__).parent
INK, LIME, LIMES, PINKF, PINKS, ACC, GREYT = '#3B3F47', '#D8EC6B', '#BFD84F', '#FFCCDC', '#F2AFC6', '#E8643C', '#8C919B'
LW = 3.2
S = lambda w=LW: f'stroke="{INK}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"'
n = [0]
def xm(cx, cy, r, tilt=0, sx=1, sy=1, fill=LIME, shade=LIMES, eyes='dot', mouth='line', look=0, L=None, R=None, legs=(), extra='', front='', blush=True, fx=0, fy=0, bow=False):
    n[0] += 1; i = n[0]; u = lambda v: v * r
    rx, ry = r * sx, r * sy
    arm = lambda sg, a: (f'<path d="M{sg*rx*.92:.1f} {ry*.12:.1f} Q{u(a[0][0]):.1f} {u(a[0][1]):.1f} {u(a[1][0]):.1f} {u(a[1][1]):.1f}" fill="none" {S()}/>') if a else ''
    hand = lambda a: f'<circle cx="{u(a[1][0]):.1f}" cy="{u(a[1][1]):.1f}" r="{r*.13:.1f}" fill="#fff" {S(2.8)}/>' if a else ''
    leg = ''
    for hx, ctrl, foot, rot in legs:
        leg += (f'<path d="M{u(hx):.1f} {ry*.86:.1f} Q{u(ctrl[0]):.1f} {u(ctrl[1]):.1f} {u(foot[0]):.1f} {u(foot[1]):.1f}" fill="none" {S()}/>'
                f'<ellipse cx="{u(foot[0]):.1f}" cy="{u(foot[1]):.1f}" rx="{r*.26:.1f}" ry="{r*.14:.1f}" transform="rotate({rot} {u(foot[0]):.1f} {u(foot[1]):.1f})" fill="#fff" {S(2.8)}/>')
    x, y = fx + look * 3, fy
    E = {'dot': ''.join(f'<circle cx="{x+s*r*.3:.1f}" cy="{y:.1f}" r="2.8" fill="{INK}"/>' for s in (-1, 1)),
         'closed': ''.join(f'<path d="M{x+s*r*.3-5:.1f} {y:.1f} q5 4.4 10 0" fill="none" {S(2.4)}/>' for s in (-1, 1)),
         'half': ''.join(f'<path d="M{x+s*r*.3-5:.1f} {y:.1f} h10" {S(2.6)}/><path d="M{x+s*r*.3-4.4:.1f} {y+1:.1f} a4.4 4.4 0 0 0 8.8 0Z" fill="{INK}"/>' for s in (-1, 1))}[eyes]
    M = {'line': f'<path d="M{x-4.5:.1f} {y+ry*.3:.1f} h9" {S(2.6)}/>', 'smile': f'<path d="M{x-5.5:.1f} {y+ry*.26:.1f} q5.5 5.4 11 0" fill="none" {S(2.6)}/>',
         'frown': f'<path d="M{x-5.5:.1f} {y+ry*.36:.1f} q5.5 -5.4 11 0" fill="none" {S(2.6)}/>', 'o': f'<ellipse cx="{x:.1f}" cy="{y+ry*.32:.1f}" rx="2.6" ry="3.2" fill="none" {S(2.4)}/>'}[mouth]
    bl = ''.join(f'<ellipse cx="{x+s*r*.58:.1f}" cy="{y+ry*.2:.1f}" rx="{r*.15:.1f}" ry="{r*.09:.1f}" fill="#F6A98A" opacity=".55"/>' for s in (-1, 1)) if blush else ''
    seam = (f'<g clip-path="url(#xc{i})" fill="none" stroke="#FFFFF2" stroke-width="3" stroke-linecap="round">'
            f'<path d="M{-rx*.64:.1f} {-ry*1.2:.1f} Q{rx*.1:.1f} 0 {-rx*.64:.1f} {ry*1.2:.1f}"/><path d="M{rx*.8:.1f} {-ry*1.2:.1f} Q{rx*.05:.1f} 0 {rx*.8:.1f} {ry*1.2:.1f}"/></g>')
    shd = f'<g clip-path="url(#xc{i})"><path d="M{rx*.3:.1f} {ry*1.1:.1f} Q{rx*.95:.1f} {ry*.2:.1f} {rx*.55:.1f} {-ry*.95:.1f} L{rx*1.3:.1f} {-ry*1.2:.1f} V{ry*1.3:.1f}Z" fill="{shade}"/></g>'
    bw = ''
    if bow:
        bw = f'<path d="M{r*.28:.1f} {-ry*1.0:.1f} l{-r*.34:.1f} {-r*.22:.1f} v{r*.4:.1f}Z M{r*.28:.1f} {-ry*1.0:.1f} l{r*.34:.1f} {-r*.22:.1f} v{r*.4:.1f}Z" fill="#fff" {S(2.8)}/>'
    return (f'<g transform="translate({cx} {cy}) rotate({tilt})">{arm(-1, L)}{arm(1, R)}{leg}<clipPath id="xc{i}"><ellipse cx="0" cy="0" rx="{rx}" ry="{ry}"/></clipPath>'
            f'<ellipse cx="0" cy="0" rx="{rx}" ry="{ry}" fill="{fill}"/>{shd if fill == LIME else ""}{seam}<ellipse cx="0" cy="0" rx="{rx}" ry="{ry}" fill="none" {S(LW)}/>{bl}{E}{M}{bw}{hand(L)}{hand(R)}{front}</g>{extra}')
def shadow(cx, cy, rx): return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="5.5" fill="#000" opacity=".07"/>'
def heart(x, y, k=1): return f'<path transform="translate({x} {y}) scale({k})" d="M0 5 C-9 -2 -5 -10 0 -5 C5 -10 9 -2 0 5Z" fill="#FBE3E3" stroke="#D9534F" stroke-width="2" stroke-linejoin="round"/>'
def spark(x, y, k=5): return f'<path d="M{x} {y-k} V{y+k} M{x-k} {y} H{x+k}" stroke="{ACC}" stroke-width="2.2" stroke-linecap="round"/>'
cards = []
def add(key, bg, cap, body): cards.append((key, bg, cap, body))
def wrap(bg, cap, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300"><rect width="300" height="300" rx="26" fill="{bg}"/>{body}'
            f'<text x="150" y="278" text-anchor="middle" font-size="14" fill="{GREYT}" font-family="Noto Sans CJK SC, PingFang SC, sans-serif">{cap}</text></svg>')
cloud = lambda x, y, k: f'<path transform="translate({x} {y}) scale({k})" d="M0 16 q-8 -2 -6 -10 q2 -8 12 -6 q4 -10 16 -6 q10 -2 12 8 q10 0 8 8 q0 6 -8 6Z" fill="#fff" stroke="#C9CDD4" stroke-width="2.2" stroke-linejoin="round"/>'
# 1 摊成一张饼（躺平看云）
add('starfish', '#EFE9EA', '今天没人发球。', shadow(150, 232, 74) + cloud(196, 118, 1) + f'<path d="M184 150 q-4 14 -14 20" stroke="#C9CDD4" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/>'
    + xm(140, 204, 38, tilt=-4, sy=.78, eyes='half', mouth='o', look=1, fy=-2, L=((-1.5, -.5), (-2.1, -.4)), R=((1.5, -.6), (2.0, -.9)), legs=((-.5, (-1.0, 1.1), (-1.25, 1.1), 20), (.5, (1.0, 1.15), (1.35, 1.2), -20))))
# 2 抱膝上火
flame = f'<g transform="translate(2 4) scale(.9)"><path d="M0 0 C-11 -12 -1 -20 -3 -32 C9 -24 14 -11 9 0Z" fill="#FFD9C4" stroke="{ACC}" stroke-width="2.8" stroke-linejoin="round"/><path d="M1 -3 C-3 -8 2 -12 1 -17 C6 -13 7 -8 5 -3Z" fill="#FFB38E"/></g>'
add('sitting-fire', '#F3F2EE', '约不到，上火。', shadow(150, 236, 62) + xm(150, 188, 40, tilt=5, sy=.96, mouth='frown', fy=4, L=((-1.0, 1.05), (.15, .95)), R=((1.0, 1.0), (-.1, 1.05)), legs=((-.5, (-1.0, 1.3), (-1.35, 1.25), 14), (.5, (1.0, 1.3), (1.4, 1.25), -14)), extra=f'<g transform="translate(152 148)">{flame}</g>')
    + f'<path transform="translate(204 150)" d="M0 -9 C5 -2 7 3 0 7 C-7 3 -5 -2 0 -9Z" fill="#CFEAF6" stroke="#7FB8CF" stroke-width="1.8"/>')
# 3 颠球（踮脚挥拍）
rkt = lambda: (f'<g transform="translate(175 134) rotate(24)"><path d="M0 0 V-24" {S(3.4)}/><ellipse cx="0" cy="-45" rx="15" ry="21" fill="#fff" {S(3)}/><path d="M-8 -55 q8 -6 16 0 M-9 -43 q9 -5 18 0" fill="none" stroke="{INK}" stroke-width="1.2" opacity=".35"/></g>')
add('solo', '#F4F1E6', '等人的时候，先颠会儿。', shadow(124, 238, 40) + xm(124, 176, 36, tilt=-8, mouth='smile', fy=2, L=((-1.5, .2), (-1.95, .7)), R=((1.5, -.2), (1.55, -.95)), legs=((-.4, (-.9, 1.25), (-.75, 1.5), 24), (.4, (.5, 1.35), (.5, 1.7), 70)))
    + rkt() + f'<circle cx="214" cy="44" r="8.5" fill="{LIME}" {S(2.8)}/><path d="M206 52 q-8 14 -4 26" stroke="{GREYT}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/>' + spark(80, 110) + spark(262, 90, 4))
# 4 嘘——球拍在睡觉
blanket = f'<path d="M44 232 Q42 202 74 200 L160 198 Q188 200 188 226 Q186 246 160 246 L74 248 Q46 248 44 232Z" fill="#D3E3F8" {S()}/><path d="M60 214 q10 -4 20 0 M52 232 q8 -3 16 0" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>'
rk = (f'<ellipse cx="92" cy="222" rx="24" ry="17" transform="rotate(-8 92 222)" fill="#fff" {S()}/><path d="M114 226 L158 234" {S(5.5)}/>'
      f'<path d="M81 220 q3.6 3.6 7.2 0 M97 219 q3.6 3.6 7.2 0" fill="none" {S(2.2)}/><path d="M91 229 h5" {S(2.2)}/>'
      f'<text x="108" y="196" font-size="13" font-weight="800" fill="#8AA4BC" font-family="Noto Sans CJK SC">z</text><text x="120" y="182" font-size="10" font-weight="800" fill="#8AA4BC" font-family="Noto Sans CJK SC">z</text>')
add('racket-sleep', '#F3F3F1', '球拍在睡觉，小声点。', shadow(238, 246, 36) + blanket + rk + xm(236, 192, 31, tilt=-10, look=-1, mouth='o', fy=1, L=((-1.0, .8), (-.2, .62)), R=((1.5, -.1), (1.95, -.55)), legs=((-.4, (-.8, 1.2), (-.7, 1.5), 40), (.4, (.6, 1.35), (.5, 1.62), 70)))
    + f'<path d="M222 168 q-6 -6 -4 -14" stroke="{GREYT}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity="0"/>')
# 5 靠在一起，牵手
add('pair', '#EFEDE3', '有人一起，就不丧了。', shadow(150, 240, 96) + xm(108, 196, 37, tilt=7, mouth='smile', fy=2, L=((-1.3, .6), (-1.55, .95)), R=((1.35, .55), (1.62, .62)), legs=((-.4, (-.5, 1.3), (-.45, 1.5), 4), (.4, (.5, 1.3), (.45, 1.5), -4)))
    + xm(190, 202, 32, tilt=-8, fill=PINKF, shade=PINKS, mouth='smile', fy=2, bow=True, L=((-1.1, .5), (-.85, .65)), R=((1.3, .6), (1.5, .95)), legs=((-.4, (-.5, 1.3), (-.45, 1.5), 4), (.4, (.5, 1.3), (.45, 1.5), -4)))
    + heart(112, 134) + heart(130, 124, .8) + heart(184, 140, .9) + heart(202, 128, .7))
# 6 夜里台灯
lamp = (f'<ellipse cx="196" cy="238" rx="72" ry="8" fill="#BFC3CB" opacity=".4"/><path d="M236 232 q-30 0 -30 -4" fill="none"/><ellipse cx="238" cy="232" rx="15" ry="4.5" fill="#fff" {S(2.8)}/>'
        f'<path d="M238 228 Q246 190 224 166" fill="none" {S()}/><path d="M198 148 Q214 130 242 140 L228 170 Q206 168 198 148Z" fill="#E4E6EB" {S()}/><path d="M205 176 L186 238 H240 L224 176Z" fill="#FFF3C8" opacity=".35"/>')
moon = f'<path d="M48 64 a14 14 0 1 0 18 20 a10 10 0 1 1 -18 -20Z" fill="#fff" stroke="#C9CDD4" stroke-width="2"/>' + spark(92, 60, 4).replace(ACC, '#C9CDD4') + spark(70, 110, 3).replace(ACC, '#C9CDD4')
phone = f'<g transform="rotate(-12 160 224)"><rect x="146" y="204" width="24" height="38" rx="5" fill="#FFF3C8" {S(3)}/><path d="M152 214 h12 M152 221 h9" stroke="#E0B84A" stroke-width="2" stroke-linecap="round"/></g>'
add('night-lamp', '#F1F2F4', '夜深了，还在看球局。', moon + lamp + xm(96, 198, 40, tilt=5, eyes='half', look=1, fy=2, mouth='line', L=((-1.1, .9), (-.3, 1.0)), R=((1.15, .9), (1.45, 1.0)), front='') + phone + f'<path d="M24 240 H276" {S(3.4)}/>')
out = HERE / '线稿风'; out.mkdir(exist_ok=True)
for k, bg, cap, body in cards: (out / f'line-{k}.svg').write_text(wrap(bg, cap, body))
html = '<style>body{margin:0;padding:24px;background:#fff;display:grid;grid-template-columns:repeat(3,300px);gap:18px}</style>' + ''.join(wrap(*c[1:]) for c in cards)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width': 1040, 'height': 700}, device_scale_factor=1.5); pg.set_content(html); pg.screenshot(path=str(HERE / '线稿风试样.png'), full_page=True); b.close()
