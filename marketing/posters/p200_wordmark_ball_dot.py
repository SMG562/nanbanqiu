from lib import *
from glyph_nbq import GLYPHS

META = dict(
    id=200, slug='wordmark-ball-dot', title='字标草案 E · 球字一点', lines=['南伴球'],
    style=['字标', '品牌', '极简'], tone='浅色', demo=False,
    concept='在 199 的简约字标上只改一处：「球」字右上角的那一点，换成一颗平面极简的网球（荧光黄绿的圆 + 两道白色球缝）；其余笔画、字距、留白都不动；上浅底、下深底反白',
    use='品牌字标草案；App 启动页、海报落款',
)

DOT_CUT = '715,140 905,140 905,248 884,255 852,281 818,276 780,232 715,160'      # 屏幕坐标里盖住「点」的多边形（字身坐标 y 翻转前）


def ball(cx, cy, r, seam='#FFFFFF'):
    """平面极简网球：一个圆 + 两道对称的球缝弧线。"""
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#C6EA3D"/>'
            f'<path d="M{cx - r * .62:.1f} {cy - r * .78:.1f} C{cx - r * .18:.1f} {cy - r * .3:.1f} {cx - r * .18:.1f} {cy + r * .3:.1f} {cx - r * .62:.1f} {cy + r * .78:.1f}" stroke="{seam}" stroke-width="{r * .14:.1f}" fill="none" stroke-linecap="round"/>'
            f'<path d="M{cx + r * .62:.1f} {cy - r * .78:.1f} C{cx + r * .18:.1f} {cy - r * .3:.1f} {cx + r * .18:.1f} {cy + r * .3:.1f} {cx + r * .62:.1f} {cy + r * .78:.1f}" stroke="{seam}" stroke-width="{r * .14:.1f}" fill="none" stroke-linecap="round"/>')


def mark(y, c, sub, uid):
    s = .128
    adv = 128 + 44
    x0 = 540 - (adv * 3 - 44) / 2
    o = []
    for i, ch in enumerate('南伴球'):
        w, d = GLYPHS[ch]
        x = x0 + i * adv
        g = f'<g transform="translate({x:.1f} {y}) scale({s} {-s})"><path d="{d}" fill="{c}"/></g>'
        if ch == '球':
            pts = ' '.join(f'{float(a):.0f},{800 - (float(b) - 150):.0f}' for a, b in (p.split(',') for p in DOT_CUT.split()))
            o.append(f'<mask id="m{uid}"><rect x="-200" y="-300" width="1400" height="1400" fill="#fff"/><polygon points="{pts}" fill="#000"/></mask>')
            g = f'<g transform="translate({x:.1f} {y}) scale({s} {-s})"><path d="{d}" fill="{c}" mask="url(#m{uid})"/></g>'
            o.append(g)
            o.append(ball(x + 804 * s, y - 738 * s, 68 * s))
        else:
            o.append(g)
    o.append(f'<text x="551" y="{y + 86}" text-anchor="middle" font-family="{SERIF}" font-weight="400" font-size="22" letter-spacing="22" fill="{sub}">NANBANQIU</text>')
    return ''.join(o)


def svg():
    p = ['<rect width="1080" height="1350" fill="#FBF8F0"/>', mark(470, '#0B3B2A', '#3E5A4E', 'a'),
         '<rect y="760" width="1080" height="420" fill="#0B3B2A"/>', mark(980, '#F4F0E4', '#C8D8CE', 'b'),
         f'<text x="84" y="1250" font-family="{SANS}" font-weight="500" font-size="16" letter-spacing="6" fill="#7A8A82">字标草案 E　·　「球」字右上角的一点换成网球　·　上：浅底　下：深底反白</text>']
    return page(''.join(p))
