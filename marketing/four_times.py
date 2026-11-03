"""同一块球场四个时段：2×2 四格。surface in clay / grass / hard"""
from lib import *
import random as _r

SKY = {
 'dawn': ('#F2A98E', '#FCE6C9'), 'noon': ('#7FBDEE', '#D9EEFB'),
 'dusk': ('#4A3A7A', '#F29A5E'), 'night': ('#050D1C', '#1B3556'),
}
GROUND = {
 'clay': {'dawn': ('#D8754A', '#B85A36'), 'noon': ('#EC8456', '#CF6A3E'), 'dusk': ('#B5532F', '#8C3A22'), 'night': ('#8A3C22', '#4A1D10')},
 'grass': {'dawn': ('#5FA868', '#3E8248'), 'noon': ('#7BC653', '#52A038'), 'dusk': ('#468E3F', '#2B6128'), 'night': ('#215A33', '#0C2C18')},
 'hard': {'dawn': ('#4A7DB8', '#33619A'), 'noon': ('#3B8AD6', '#2A6DB6'), 'dusk': ('#2F63A0', '#1E4478'), 'night': ('#1B3A66', '#0B1C38')},
}
TIMES = [('dawn', '6:00 AM'), ('noon', '12:00 PM'), ('dusk', '6:30 PM'), ('night', '9:00 PM')]


def feats(surface, t, r):
    s = ''
    if surface == 'clay':
        if t == 'dawn':
            s = ''.join(f'<path d="M0 {168 + i * 17} q120 {r.uniform(-3, 3):.1f} 245 0 t245 0" fill="none" stroke="#9C4A28" stroke-width="3" opacity=".35"/>' for i in range(11))
        elif t == 'noon':
            s = '<rect x="87" y="231" width="316" height="22" fill="#000" opacity=".22" filter="url(#bl6)"/><ellipse cx="245" cy="170" rx="260" ry="26" fill="#fff" opacity=".2" filter="url(#bl14)"/>'
        elif t == 'dusk':
            s = '<path d="M230 345 Q330 312 430 255" fill="none" stroke="#F0BE9E" stroke-width="16" stroke-linecap="round" opacity=".38" filter="url(#bl6)"/><path d="M200 340 Q290 312 380 262" fill="none" stroke="#F0BE9E" stroke-width="9" stroke-linecap="round" opacity=".3"/>'
        else:
            s = '<ellipse cx="245" cy="260" rx="300" ry="110" fill="#FFD9A0" opacity=".28" filter="url(#bl28)"/><circle cx="300" cy="285" r="22" fill="none" stroke="#5A2412" stroke-width="3" opacity=".6"/>'
    elif surface == 'grass':
        if t == 'dawn':
            s = ''.join(f'<circle cx="{r.uniform(0, 490):.0f}" cy="{r.uniform(165, 345):.0f}" r="{r.uniform(1, 2.4):.1f}" fill="#fff" opacity="{r.uniform(.3, .8):.2f}"/>' for _ in range(150))
        elif t == 'noon':
            s = ''.join(f'<rect x="0" y="{150 + i * 30}" width="490" height="30" fill="#fff" opacity=".09"/>' for i in range(0, 7, 2))
        elif t == 'dusk':
            s = '<rect y="150" width="490" height="200" fill="#F29A5E" opacity=".16"/><ellipse cx="245" cy="338" rx="150" ry="16" fill="#8A6A3A" opacity=".6" filter="url(#bl6)"/>'
        else:
            s = '<ellipse cx="245" cy="260" rx="300" ry="110" fill="#E8FFB0" opacity=".2" filter="url(#bl28)"/>' + ''.join(f'<path d="M{(x:=r.uniform(0, 490)):.0f} 350 l{r.uniform(-4, 4):.1f} -{r.uniform(10, 24):.0f}" stroke="#7DBB6A" stroke-width="2" opacity=".45"/>' for _ in range(120))
    else:
        if t == 'dawn':
            s = '<ellipse cx="150" cy="262" rx="90" ry="15" fill="#F7D3BC" opacity=".75"/><ellipse cx="132" cy="259" rx="42" ry="4" fill="#fff" opacity=".6"/>'
        elif t == 'noon':
            s = '<ellipse cx="360" cy="240" rx="150" ry="34" fill="#fff" opacity=".24" filter="url(#bl14)"/><path d="M60 320 l60 -18 l30 10 l50 -24" fill="none" stroke="#17406E" stroke-width="2.4" opacity=".5"/>'
        elif t == 'dusk':
            s = '<path d="M300 288 L90 336" stroke="#000" stroke-width="16" stroke-linecap="round" opacity=".32" filter="url(#bl6)"/><rect y="150" width="490" height="200" fill="#F29A5E" opacity=".1"/>'
        else:
            s = '<ellipse cx="245" cy="260" rx="300" ry="110" fill="#CFE6FF" opacity=".26" filter="url(#bl28)"/><path d="M40 320 L460 250" stroke="#fff" stroke-width="6" opacity=".08" filter="url(#bl6)"/>'
    return s


def panel(sid, surface, k, t, label, wry, x, y):
    r = _r.Random(hash((surface, t)) & 0xFFFF)
    pid = f'{sid}{k}'
    sk0, sk1 = SKY[t]
    g0, g1 = GROUND[surface][t]
    night = t == 'night'
    sunpos = {'dawn': (380, 142, 44, '#FFF1C8'), 'noon': (390, 46, 26, '#FFFBE6'), 'dusk': (100, 140, 52, '#FFD08A'), 'night': (390, 52, 26, '#FFFBEA')}[t]
    stars = ''.join(f'<circle cx="{r.uniform(0, 490):.0f}" cy="{r.uniform(5, 120):.0f}" r="{r.uniform(.7, 1.6):.1f}" fill="#F7EBD6" opacity="{r.uniform(.3, .9):.2f}"/>' for _ in range(45)) if night else ''
    trees = ''.join(f'<circle cx="{cx}" cy="{138 + r.uniform(-8, 6):.0f}" r="{r.uniform(18, 32):.0f}" fill="{"#04100B" if night else "#1F4A33"}" opacity=".85"/>' for cx in range(-10, 520, 34))
    line = '#F7EBD6'
    ox = 50 + (k % 2) * 510
    oy = y
    glow = f'<circle cx="{sunpos[0]}" cy="{sunpos[1]}" r="{sunpos[2] * 2.6}" fill="{sunpos[3]}" opacity=".35" filter="url(#bl28)"/><circle cx="{sunpos[0]}" cy="{sunpos[1]}" r="{sunpos[2]}" fill="{sunpos[3]}"/>'
    return f'''<g transform="translate({ox} {oy})">
<defs><linearGradient id="sk{pid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sk0}"/><stop offset="1" stop-color="{sk1}"/></linearGradient>
<linearGradient id="gd{pid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{g0}"/><stop offset="1" stop-color="{g1}"/></linearGradient>
<linearGradient id="bt{pid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></linearGradient>
<clipPath id="cp{pid}"><rect width="490" height="350" rx="22"/></clipPath></defs>
<g clip-path="url(#cp{pid})">
<rect width="490" height="152" fill="url(#sk{pid})"/>{stars}{glow}{trees}
<rect y="140" width="490" height="12" fill="#06120D" opacity=".55"/>
<rect y="150" width="490" height="200" fill="url(#gd{pid})"/>
{feats(surface, t, r)}
<path d="M120 160 H370 M120 160 L-20 350 M370 160 L510 350 M61 240 H429" stroke="{line}" stroke-width="3" fill="none" opacity=".75"/>
<rect x="87" y="190" width="316" height="26" fill="#0B1A12" opacity=".55"/><rect x="87" y="188" width="316" height="5" fill="#fff" opacity=".92"/>
<path d="M87 188 V232 M403 188 V232" stroke="#0B1A12" stroke-width="5"/>
<ellipse cx="302" cy="282" rx="22" ry="5" fill="#000" opacity=".35" filter="url(#bl6)"/>
{ball(f'{pid}b', 300, 260, 20, rot=20 + k * 30)}
<rect y="240" width="490" height="110" fill="url(#bt{pid})"/>
<text x="24" y="304" font-family="{SANS}" font-weight="700" font-size="20" letter-spacing="4" fill="{C['lime']}">{label}</text>
<text x="24" y="338" font-family="{SERIF}" font-weight="900" font-size="30" fill="#F7EBD6">{wry}</text>
</g></g>'''


def render(surface, sid, lines, tag_text, bg, fg, rule, wry, fg_wm='#F7EBD6'):
    ps = ''
    for k, (t, label) in enumerate(TIMES):
        ps += panel(sid, surface, k, t, label, wry[k], 0, 440 + (k // 2) * 370)
    body = f'''<rect width="{W}" height="{H}" fill="{bg}"/>
{ps}
{tag(tag_text, color=fg, rule=rule)}
{headline(lines, y=290, size=58, colors=fg, ls=3, lh=76)}
{wordmark(1268, fg_wm, sub=False, op=.95)}
{grain(.16)}'''
    return page(body)
