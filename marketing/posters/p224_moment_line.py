from lib import *
from moment import frame

META = dict(
    id=224, slug='moment-line', title='算好球。', lines=['算好球。'],
    style=['瞬间', '微距', '规则', '极简'], tone='亮色', demo=False,
    concept='正上方的微距：满版南伴绿硬地，一条白线斜穿过去，一颗网球落地的那一瞬间只压住白线边缘一点点，球被压扁了一点，边上蹭起几粒白漆粉。心里那句「出界了吧？」——规则说，压线算好球。',
    use='瞬间系列 · 03；网球规则小事 / 判线礼仪',
)


def svg():
    r = random.Random(224)
    p = ['<defs><filter id="tex224" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .05  0 0 0 0 .25  0 0 0 0 .18  0 0 0 .5 0"/></filter>'
         '<radialGradient id="ballsh224" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#03200F" stop-opacity=".55"/><stop offset="1" stop-color="#03200F" stop-opacity="0"/></radialGradient></defs>',
         '<rect width="1080" height="1350" fill="#2B8564"/>',
         '<rect width="1080" height="1350" filter="url(#tex224)" opacity=".55"/>',
         '<rect width="1080" height="1350" fill="#176B4D" opacity=".25"/>']
    # 白线：斜穿画面，边缘有一点不齐
    p.append('<g transform="rotate(-14 540 640)"><rect x="-300" y="560" width="1700" height="150" fill="#F3F1E6"/>'
             '<rect x="-300" y="560" width="1700" height="150" filter="url(#tex224)" opacity=".18"/></g>')
    # 球：中心在线外，压住线边一点点；压扁
    cx, cy, R = 600, 860, 200
    p.append(f'<ellipse cx="{cx + 30}" cy="{cy + 40}" rx="{R * 1.1:.0f}" ry="{R * 1.0:.0f}" fill="url(#ballsh224)"/>')
    p.append(f'<g transform="translate({cx} {cy}) scale(1 .94) translate({-cx} {-cy})">{ball("l", cx, cy, R, -30)}</g>')
    # 蹭起的白漆粉
    for _ in range(22):
        a = r.uniform(-2.6, -0.6)
        d = r.uniform(R * 1.02, R * 1.25)
        p.append(f'<circle cx="{cx + d * math.cos(a):.0f}" cy="{cy + d * math.sin(a) * .94:.0f}" r="{r.uniform(1.5, 4):.1f}" fill="#F3F1E6" opacity="{r.uniform(.5, .95):.2f}"/>')
    # 标注：压线的那一点
    p.append('<circle cx="560" cy="664" r="34" fill="none" stroke="#C6EA3D" stroke-width="3"/><path d="M590 646 L760 540 H900" stroke="#C6EA3D" stroke-width="2.4" fill="none"/>')
    p.append(f'<text x="900" y="528" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="22" letter-spacing="4" fill="#C6EA3D">压线 · IN</text>')
    frame(p, 3, '算好球。', '压到线的那一点点，也算。', '网球规则：球压线，算界内。', ink='#FFFFFF', sub_c='#D7EEDF', info_c='#A9D6BC', mark_c='#FFFFFF')
    return page(''.join(p))
