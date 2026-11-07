from lib import *

META = dict(
    id=93, slug='saturday-light', title='周六，天晴', lines=['周六，', '天晴。'],
    style=['写实光影', '极简'], tone='浅色', demo=False,
    concept='周六清早，一面奶白的墙：阳光穿过窗和薄纱帘，在墙上投出一块暖光；靠墙立着一支球拍，拍线的影子印在光斑里，木桌上一颗球',
    use='周末约球的氛围图；日常、明亮、克制',
)


def svg():
    rnd = random.Random(93)
    # 窗光：墙上一块斜四边形，被窗棂分成四格
    P = [(440, 300), (1010, 220), (1070, 1020), (500, 1110)]
    def lerp(a, b, t):
        return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
    def quad(u0, u1, v0, v1):
        top0, top1 = lerp(P[0], P[1], u0), lerp(P[0], P[1], u1)
        bot0, bot1 = lerp(P[3], P[2], u0), lerp(P[3], P[2], u1)
        a, b = lerp(top0, bot0, v0), lerp(top1, bot1, v0)
        c, d = lerp(top1, bot1, v1), lerp(top0, bot0, v1)
        return f'M{a[0]:.0f} {a[1]:.0f} L{b[0]:.0f} {b[1]:.0f} L{c[0]:.0f} {c[1]:.0f} L{d[0]:.0f} {d[1]:.0f}Z'
    m = .018
    panes = ''.join(f'<path d="{quad(u0, u1, v0, v1)}"/>' for u0, u1 in [(0, .5 - m), (.5 + m, 1)] for v0, v1 in [(0, .5 - m), (.5 + m, 1)])
    # 纱帘的影子：几道柔和的斜向波纹
    sheer = ''
    for i in range(7):
        x0 = 600 + i * 70
        sheer += f'<path d="M{x0} 200 C{x0 + 40} 420 {x0 - 30} 680 {x0 + 60} 1120" stroke="#C9B89C" stroke-width="{rnd.uniform(14, 34):.0f}" fill="none" opacity="{rnd.uniform(.08, .16):.2f}"/>'
    # 球拍（靠墙），以及它在光里的影子
    grip = '<rect x="585" y="975" width="30" height="180" rx="10" fill="#F4F1EA"/><path d="M585 1005 l30 -14 M585 1035 l30 -14 M585 1065 l30 -14 M585 1095 l30 -14 M585 1125 l30 -14" stroke="#D9D3C6" stroke-width="2"/><rect x="583" y="1145" width="34" height="14" rx="5" fill="#C6EA3D"/>'
    def racket(stroke, string, op=1, sw=15):
        hx, hy = 600, 722
        strings = ''.join(f'<path d="M{x} {hy-160} V{hy+160}"/>' for x in range(hx - 110, hx + 112, 18))
        strings += ''.join(f'<path d="M{hx-120} {y} H{hx+120}"/>' for y in range(hy - 150, hy + 152, 18))
        return f'''<g opacity="{op}" transform="rotate(-9 {hx} {hy})">
<clipPath id="rc{stroke[1:]}"><ellipse cx="{hx}" cy="{hy}" rx="96" ry="128"/></clipPath>
<g clip-path="url(#rc{stroke[1:]})" stroke="{string}" stroke-width="2.2">{strings}</g>
<ellipse cx="{hx}" cy="{hy}" rx="104" ry="136" fill="none" stroke="{stroke}" stroke-width="{sw}"/>
<path d="M{hx-56} {hy+118} Q{hx-10} {hy+190} {hx-8} {hy+250} M{hx+56} {hy+118} Q{hx+10} {hy+190} {hx+8} {hy+250}" stroke="{stroke}" stroke-width="{sw*.8:.0f}" fill="none"/>
<rect x="{hx-15}" y="{hy+245}" width="30" height="190" rx="10" fill="{stroke}"/>
{grip if stroke == "#18332A" else ""}</g>'''
    shadow = f'<g transform="translate(250 -10) skewX(-12)" filter="url(#soft93)">{racket("#5C4A36", "#5C4A36", .5, 13)}</g>'
    real = racket('#18332A', '#EDE6D8', 1, 15)
    bx, by, br = 880, 1124, 44
    body = f'''
<defs>
<linearGradient id="wall93" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9E1D3"/><stop offset="1" stop-color="#E2D8C7"/></linearGradient>
<linearGradient id="sun93" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF8EA"/><stop offset="1" stop-color="#FFEFD2"/></linearGradient>
<linearGradient id="tbl93" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8CFA8"/><stop offset="1" stop-color="#D2B28A"/></linearGradient>
<filter id="pen93" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="soft93" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.4"/></filter>
<clipPath id="sunc93">{panes}</clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#wall93)"/>
<g filter="url(#pen93)"><g fill="url(#sun93)">{panes}</g></g>
<g clip-path="url(#sunc93)"><g filter="url(#bl6)">{sheer}</g>{shadow}</g>
<rect y="1150" width="{W}" height="22" fill="#F1E3CA"/>
<rect y="1172" width="{W}" height="{H-1172}" fill="url(#tbl93)"/>
<rect y="1168" width="{W}" height="6" fill="#C7A57C" opacity=".6"/>
<ellipse cx="630" cy="1158" rx="60" ry="7" fill="#8C7357" opacity=".35" filter="url(#bl6)"/>
{real}
<path d="M{bx} {by + br - 4} L{bx + 150} {by + br + 2} L{bx + 150} {by + br + 12} L{bx} {by + br + 8}Z" fill="#8C7357" opacity=".35" filter="url(#bl6)"/>
<ellipse cx="{bx + 6}" cy="{by + br + 2}" rx="{br*.9:.0f}" ry="6" fill="#6E5A44" opacity=".5" filter="url(#bl6)"/>
{ball('b93', bx, by, br, rot=-30)}
{tag('SATURDAY · 7:40 AM', color='#3B4A42', rule='#176B4D', op=.75)}
{headline(META['lines'], y=290, size=66, colors=('#0B3B2A', '#176B4D'), ls=4, lh=86)}
{wordmark(1268, '#0B3B2A', sub=False)}
{grain(.1, light=True)}'''
    return page(body)
