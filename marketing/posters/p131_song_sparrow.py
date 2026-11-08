from lib import *
from lin import DEFS, ink

META = dict(
    id=131, slug='song-sparrow', title='只来了一只麻雀', lines=['一上午，', '只来了一只麻雀。'],
    style=['宋画', '院体花鸟', '留白', '幽默'], tone='浅色', demo=False,
    concept='宋代院体花鸟的「折枝」构图：画面只有一根斜斜的网带当作花枝，网眼细细地垂下去、渐渐淡掉；一只工笔麻雀蹲在网带上，歪头看着挂在网边的一颗球；绢色底，大片留白',
    use='没约到人；把等人画成一幅花鸟小品，好笑又雅',
)


def svg():
    p = [f'<defs>{DEFS}<linearGradient id="bg131" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3EAD2"/><stop offset="1" stop-color="#E8DABA"/></linearGradient>'
         '<linearGradient id="fade131" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>'
         '<mask id="mk131"><rect width="1080" height="1350" fill="url(#fade131)"/></mask></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#bg131)"/>']
    for y in range(0, 1180, 4):                                                                                # 绢纹
        p.append(f'<line x1="0" y1="{y}" x2="1080" y2="{y}" stroke="#C8B48A" stroke-width=".6" opacity=".18"/>')
    # 网带：从左下斜到右上，像一根折枝
    x0, y0, x1, y1 = -20, 900, 1100, 560
    def at(t):
        return x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + 30 * math.sin(t * math.pi)
    mesh = ''
    for i in range(46):
        t = i / 45
        x, y = at(t)
        mesh += f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x:.0f}" y2="{y+260:.0f}" stroke="#4A4A44" stroke-width="1.4"/>'
    for k in range(1, 12):
        pts = ' '.join(f'{at(i/45)[0]:.0f},{at(i/45)[1] + k * 22:.0f}' for i in range(46))
        mesh += f'<polyline points="{pts}" fill="none" stroke="#4A4A44" stroke-width="1.2"/>'
    p.append(f'<g mask="url(#mk131)" opacity=".55" transform="translate(0 0)"><g transform="translate(0 0)">{mesh}</g></g>')
    tape = ' '.join(f'{at(i/60)[0]:.0f},{at(i/60)[1]:.0f}' for i in range(61))
    p.append(f'<polyline points="{tape}" fill="none" stroke="#FBF8F0" stroke-width="16" stroke-linejoin="round"/>')
    p.append(f'<polyline points="{tape}" fill="none" stroke="#B8AA88" stroke-width="1.2" transform="translate(0 8)"/>')
    # 麻雀（工笔）：站在 t≈.48 处
    bx, by = at(.48)
    s = 1.0
    bird = f'''<g transform="translate({bx:.0f} {by-8:.0f}) rotate(-12)">
<path d="M-70 -20 C-60 -70 0 -86 40 -64 C66 -50 70 -20 50 0 C20 14 -40 12 -70 -20Z" fill="#B88A5E"/>
<path d="M-62 -30 C-40 -64 10 -72 36 -56 C10 -50 -20 -40 -62 -30Z" fill="#7A4E2E"/>
<path d="M-60 -24 C-40 -50 0 -54 24 -40" fill="none" stroke="#3A2618" stroke-width="2.4"/>
<path d="M-56 -16 C-36 -40 0 -44 20 -30" fill="none" stroke="#3A2618" stroke-width="2"/>
<path d="M-70 -20 L-128 -40 L-120 -24 L-132 -14 L-66 -8Z" fill="#6A4428"/>
<path d="M-128 -40 L-70 -22 M-130 -26 L-70 -16" stroke="#3A2618" stroke-width="1.2"/>
<circle cx="44" cy="-62" r="30" fill="#E6D8BC"/>
<path d="M16 -78 C24 -98 60 -100 72 -76 C58 -84 34 -84 16 -78Z" fill="#8A4A26"/>
<path d="M20 -74 C30 -88 58 -90 70 -72 C66 -66 30 -64 20 -74Z" fill="#8A4A26"/>
<circle cx="40" cy="-52" r="7" fill="#1E1A16"/>
<circle cx="58" cy="-64" r="4.6" fill="#141210"/><circle cx="59.5" cy="-65.5" r="1.4" fill="#fff"/>
<path d="M70 -62 L90 -58 L70 -52Z" fill="#3A3028"/>
<path d="M50 -38 C58 -24 52 -10 40 -4 C34 -14 36 -28 50 -38Z" fill="#1E1A16"/>
<path d="M-8 6 L-10 26 M6 6 L8 26" stroke="#7A5A40" stroke-width="3" stroke-linecap="round"/>
<path d="M-20 26 L0 26 M-2 26 L16 26" stroke="#7A5A40" stroke-width="2.6" stroke-linecap="round"/>
</g>'''
    p.append(f'<g filter="url(#paint2)">{bird}</g>')
    gx, gy = at(.72)                                                                                          # 挂在网带上的球
    p.append(f'<circle cx="{gx:.0f}" cy="{gy+26:.0f}" r="22" fill="#C6EA3D"/><path d="M{gx-15:.0f} {gy+12:.0f} C{gx-4:.0f} {gy+22:.0f} {gx-4:.0f} {gy+32:.0f} {gx-15:.0f} {gy+42:.0f}" stroke="#F4F6DC" stroke-width="3" fill="none"/>'
             f'<circle cx="{gx+5:.0f}" cy="{gy+31:.0f}" r="21" fill="#7FA21C" opacity=".25"/>')
    p.append(tag('NO ONE CAME · 11:40 AM', y=150, color='#3A3028', rule='#9E2A2B', op=.65))
    p.append(headline(META['lines'], y=272, size=46, colors=('#3A3028', '#9E2A2B'), lh=66))
    p.append(f'<g transform="translate(950 1060)"><rect width="34" height="52" rx="3" fill="#9E2A2B"/>'
             f'<text x="17" y="22" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="18" fill="#F3EAD2">南</text>'
             f'<text x="17" y="45" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="18" fill="#F3EAD2">伴</text></g>')
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08, light=True))
    return page(''.join(p))
