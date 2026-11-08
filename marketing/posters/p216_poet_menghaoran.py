from lib import *
from poet import scholar, vtext, seal, footer, DAI

META = dict(
    id=216, slug='poet-menghaoran', title='春眠不觉晓', lines=['春眠不觉晓', '处处闻啼鸟'],
    style=['古风', '诗人', '月洞门', '现代版式'], tone='亮色', demo=False,
    concept='孟浩然《春晓》：春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。粉墙上开一个正圆的月洞门，门里是清晨的南伴绿球场，太阳刚出，一个早起的人已经在发球；一枝桃花从门外斜伸进来，枝上两只小鸟，花瓣落了一地。正圆框景是园林的老办法，也是现代版式里最干净的构图。',
    use='诗人打球系列 · 孟浩然；早场 / 春季主题',
)


def blossom(x, y, rr, c='#F7A8BC'):
    pet = ''.join(f'<circle cx="{x + rr * .55 * math.cos(math.radians(a)):.1f}" cy="{y + rr * .55 * math.sin(math.radians(a)):.1f}" r="{rr * .5:.1f}" fill="{c}"/>' for a in range(-90, 270, 72))
    return pet + f'<circle cx="{x}" cy="{y}" r="{rr * .28:.1f}" fill="#FCE3EA"/><circle cx="{x}" cy="{y}" r="{rr * .12:.1f}" fill="#E8A23A"/>'


def bird(x, y, s, flip=1):
    return (f'<g transform="translate({x} {y}) scale({s * flip} {s})"><path d="M-18 0 Q-10 -16 8 -12 Q18 -10 20 -4 L28 -2 L20 2 Q16 12 0 12 Q-14 12 -26 6Z" fill="#3A4A5A"/>'
            '<path d="M-6 -2 Q4 -4 8 6 Q-2 8 -6 -2Z" fill="#6A7A8A"/><circle cx="12" cy="-6" r="1.8" fill="#FFFFFF"/><path d="M-4 12 v8 M4 12 v8" stroke="#3A4A5A" stroke-width="1.6"/></g>')


def svg():
    r = random.Random(216)
    CX, CY, R = 640, 660, 330
    p = ['<defs><linearGradient id="dawn216" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FAD3B8"/><stop offset=".55" stop-color="#FCE8C8"/><stop offset="1" stop-color="#FFF4DE"/></linearGradient>'
         f'<clipPath id="gate216"><circle cx="{CX}" cy="{CY}" r="{R}"/></clipPath></defs>',
         '<rect width="1080" height="1350" fill="#F6EFE4"/>',
         '<rect y="0" width="1080" height="56" fill="#4A5A5E"/>' + ''.join(f'<path d="M{x} 56 q20 18 40 0" fill="#5E6E72"/>' for x in range(-10, 1090, 40)),
         '<rect y="56" width="1080" height="10" fill="#E3D8C6"/>']
    # 门里的景
    g = [f'<rect x="{CX - R}" y="{CY - R}" width="{2 * R}" height="{2 * R}" fill="url(#dawn216)"/>',
         f'<circle cx="{CX + 110}" cy="{CY + 30}" r="70" fill="#F7A86A" opacity=".85"/>',
         f'<path d="M{CX - R} {CY + 70} L{CX - 160} {CY + 10} L{CX - 40} {CY + 60} L{CX + 80} {CY} L{CX + R} {CY + 70} V{CY + R} H{CX - R}Z" fill="#8ED9B0"/>',
         f'<path d="M{CX - R} {CY + 110} H{CX + R} V{CY + R} H{CX - R}Z" fill="#2F9A6A"/>',
         f'<path d="M{CX - 150} {CY + 130} H{CX + 150} L{CX + 260} {CY + R} M{CX - 150} {CY + 130} L{CX - 260} {CY + R} M{CX - 190} {CY + 200} H{CX + 190} M{CX} {CY + 200} V{CY + R}" stroke="#F4EED8" stroke-width="4" fill="none"/>',
         f'<path d="M{CX - 175} {CY + 165} H{CX + 175}" stroke="#E8F4EC" stroke-width="3"/>' + ''.join(f'<path d="M{CX - 175 + i * 25} {CY + 165} v-22" stroke="#E8F4EC" stroke-width="1" opacity=".6"/>' for i in range(15)) + f'<path d="M{CX - 175} {CY + 143} H{CX + 175}" stroke="#FFFFFF" stroke-width="3"/>',
         scholar(CX - 70, CY + 290, 1.05, robe='#F3EEE0', sash='#C23A2B', flip=1, arm='up', wind=.3),
         f'<circle cx="{CX - 28}" cy="{CY + 82}" r="7" fill="#DDF35A"/>']
    for _ in range(14):
        x, y = r.uniform(CX - R, CX + R), r.uniform(CY + 120, CY + R)
        g.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="5" ry="3" fill="#F7A8BC" transform="rotate({r.uniform(0, 180):.0f} {x:.0f} {y:.0f})"/>')
    p.append(f'<g clip-path="url(#gate216)">{"".join(g)}</g>')
    p.append(f'<circle cx="{CX}" cy="{CY}" r="{R + 14}" fill="none" stroke="#D9CDB8" stroke-width="28"/><circle cx="{CX}" cy="{CY}" r="{R + 1}" fill="none" stroke="#B9AC94" stroke-width="3"/>')
    # 桃枝从门外伸进来
    p.append('<path d="M1100 250 Q960 300 880 360 Q820 404 760 400 M960 300 Q930 250 880 230 M880 360 Q860 420 880 470" stroke="#4A3A30" stroke-width="10" fill="none" stroke-linecap="round"/>')
    for x, y, rr in [(1040, 262, 20), (990, 296, 18), (925, 330, 22), (880, 238, 16), (850, 376, 18), (790, 396, 16), (884, 448, 18), (1060, 220, 14), (958, 270, 14), (820, 384, 12)]:
        p.append(blossom(x, y, rr))
    p.append(bird(960, 284, 1.1, -1))
    p.append(bird(1010, 270, .9, 1))
    for _ in range(18):
        x, y = r.uniform(700, 1060), r.uniform(400, 1150)
        p.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="7" ry="4" fill="#F7A8BC" opacity=".85" transform="rotate({r.uniform(0, 180):.0f} {x:.0f} {y:.0f})"/>')
    bush = ''.join(f'<circle cx="{x}" cy="{1150 + (i % 3) * 10}" r="{56 + (i * 17) % 30}" fill="{["#3FA474", "#2F8A6E", "#4DB27F"][i % 3]}"/>' for i, x in enumerate(range(-20, 1120, 70)))
    p.append(bush)
    p.append('<path d="M0 1196 Q300 1176 620 1194 T1080 1188 V1350 H0Z" fill="#176B4D"/>')
    # 字
    p.append(vtext('春眠不觉晓', 150, 190, 104, DAI, 1.12, 700))
    p.append(vtext('处处闻啼鸟', 256, 206, 30, '#6A5A4E', 1.5, 500))
    p.append(seal(236, 460, 40, '南伴'))
    footer(p, '春眠不觉晓？早场七点见', '诗人打球 · 拾 / 孟浩然《春晓》', 'SPRING DAWN, FIRST SERVE')
    return page(''.join(p))
