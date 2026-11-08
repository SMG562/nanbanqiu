"""六七十年代课本插画风（181 起）：泛黄的纸、黑线勾边（膨胀描边滤镜）、平涂少色、印刷网点、课文标题框。"""
from lib import SERIF, SANS

PAPER = '#EFE4C6'
INK = '#2A2622'
RED = '#C8402E'
BLUE = '#3E5E9A'
GREEN = '#2F6E4E'
DEFS = (f'<filter id="ol_t" x="-10%" y="-10%" width="120%" height="120%"><feMorphology operator="dilate" radius="2.6" in="SourceAlpha" result="d"/>'
        f'<feFlood flood-color="{INK}"/><feComposite in2="d" operator="in" result="o"/><feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
        '<pattern id="dots_t" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.3" fill="#3A2E20"/></pattern>'
        '<filter id="paper_t" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" seed="61"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .38  0 0 0 0 .25  0 0 0 .22 0"/></filter>'
        '<radialGradient id="age_t" cx="50%" cy="50%" r="75%"><stop offset=".55" stop-color="#8A6A3A" stop-opacity="0"/><stop offset="1" stop-color="#8A6A3A" stop-opacity=".35"/></radialGradient>')


def outlined(svg):
    return f'<g filter="url(#ol_t)">{svg}</g>'


def finish(p):
    """网点 + 纸纹 + 发黄的边。"""
    p.append('<rect width="1080" height="1350" fill="url(#dots_t)" opacity=".07"/>')
    p.append('<rect width="1080" height="1350" filter="url(#paper_t)"/>')
    p.append('<rect width="1080" height="1350" fill="url(#age_t)"/>')


def slogan(p, text, x, y, size=104, gap=14):
    """红底方块里的大字（像刷在墙上的标语牌）。"""
    for i, ch in enumerate(text):
        xx = x + i * (size + gap)
        p.append(f'<rect x="{xx}" y="{y}" width="{size}" height="{size * 1.2:.0f}" fill="{RED}"/>'
                 f'<rect x="{xx + 6}" y="{y + 6}" width="{size - 12}" height="{size * 1.2 - 12:.0f}" fill="none" stroke="#F2D8A8" stroke-width="2"/>'
                 f'<text x="{xx + size / 2}" y="{y + size * .9:.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{size * .78:.0f}" fill="#F7E9C8">{ch}</text>')


def lesson(p, no, title, lines, y=1110):
    """课文框：第几课 + 课文。"""
    p.append(f'<rect x="60" y="{y}" width="960" height="210" fill="#F6EED6" stroke="{INK}" stroke-width="3"/>')
    p.append(f'<text x="96" y="{y + 62}" font-family="{SERIF}" font-weight="900" font-size="40" letter-spacing="6" fill="{INK}">第{no}课　{title}</text>')
    for i, t in enumerate(lines):
        p.append(f'<text x="96" y="{y + 112 + i * 40}" font-family="{SERIF}" font-weight="500" font-size="26" letter-spacing="3" fill="{INK}">{t}</text>')
    p.append(f'<circle cx="872" cy="{y + 172}" r="8" fill="#C6EA3D" stroke="{INK}" stroke-width="2"/><circle cx="886" cy="{y + 182}" r="5" fill="#C6EA3D" stroke="{INK}" stroke-width="1.6"/>'
             f'<text x="990" y="{y + 188}" text-anchor="end" font-family="{SERIF}" font-weight="900" font-size="22" letter-spacing="4" fill="{INK}">南伴球</text>')
