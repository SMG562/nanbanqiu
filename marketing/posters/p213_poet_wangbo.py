from lib import *
from poet import scholar, vtext, seal, footer

META = dict(
    id=213, slug='poet-wangbo', title='天涯若比邻', lines=['海内存知己', '天涯若比邻'],
    style=['古风', '诗人', '南半球', '现代版式'], tone='亮色', demo=False,
    concept='王勃《送杜少府之任蜀州》：海内存知己，天涯若比邻。画面下半是一个巨大的南伴绿星球弧面——南半球；弧顶上一小块球场，两个袍子小人隔着网对打，就是天涯里的邻居。石青的夜空里挂着南十字星，地平线后透出一点曙光。',
    use='诗人打球系列 · 王勃；海外华人 / 异乡找到球友主题',
)


def star(x, y, s, c='#FFF6DA'):
    return f'<path d="M{x} {y - s} Q{x + s * .18:.1f} {y - s * .18:.1f} {x + s} {y} Q{x + s * .18:.1f} {y + s * .18:.1f} {x} {y + s} Q{x - s * .18:.1f} {y + s * .18:.1f} {x - s} {y} Q{x - s * .18:.1f} {y - s * .18:.1f} {x} {y - s}Z" fill="{c}"/>'


def svg():
    r = random.Random(213)
    R, CX, CY = 1050, 540, 1700
    gy = lambda x: CY - math.sqrt(R * R - (x - CX) ** 2)
    p = ['<defs><linearGradient id="sky213" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#143A4C"/><stop offset="1" stop-color="#2F7478"/></linearGradient>'
         '<radialGradient id="dawn213" cx=".5" cy="1" r=".7"><stop offset="0" stop-color="#FBE3A6" stop-opacity=".95"/><stop offset=".5" stop-color="#F2C98A" stop-opacity=".35"/><stop offset="1" stop-color="#F2C98A" stop-opacity="0"/></radialGradient>'
         '<linearGradient id="globe213" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FA474"/><stop offset=".4" stop-color="#1F7A58"/><stop offset="1" stop-color="#0E5139"/></linearGradient>'
         f'<clipPath id="gc213"><circle cx="{CX}" cy="{CY}" r="{R}"/></clipPath></defs>',
         '<rect width="1080" height="1350" fill="url(#sky213)"/>',
         '<ellipse cx="560" cy="700" rx="820" ry="420" fill="url(#dawn213)"/>']
    for _ in range(70):
        p.append(f'<circle cx="{r.uniform(0, 1080):.0f}" cy="{r.uniform(0, 560):.0f}" r="{r.uniform(.8, 2.2):.1f}" fill="#FFF6DA" opacity="{r.uniform(.3, .8):.2f}"/>')
    # 南十字
    for x, y, s in [(830, 120, 15), (845, 320, 18), (762, 232, 14), (912, 206, 11), (872, 270, 7)]:
        p.append(star(x, y, s))
    p.append('<path d="M830 140 L845 300 M776 232 L898 206" stroke="#FFF6DA" stroke-width="1" opacity=".25"/>')
    p.append('<text x="930" y="354" font-family="' + SANS + '" font-size="13" letter-spacing="4" fill="#CFE3D8" opacity=".8">CRUX</text>')
    # 星球
    p.append(f'<circle cx="{CX}" cy="{CY}" r="{R + 8}" fill="#FBE3A6" opacity=".55"/><circle cx="{CX}" cy="{CY}" r="{R}" fill="url(#globe213)"/>')
    p.append(f'<g clip-path="url(#gc213)" fill="none" stroke="#7FD3A6" stroke-width="2" opacity=".35">'
             + ''.join(f'<ellipse cx="{CX}" cy="{CY}" rx="{R * k:.0f}" ry="{R}"/>' for k in (.25, .55, .82))
             + ''.join(f'<ellipse cx="{CX}" cy="{CY + R * k:.0f}" rx="{R * math.sqrt(1 - k * k):.0f}" ry="{R * .18:.0f}"/>' for k in (-.88, -.7)) + '</g>')
    # 弧顶球场
    x0, x1 = 330, 750
    pts = ' '.join(f'{x},{gy(x) - 2:.1f}' for x in range(x0, x1 + 1, 20))
    p.append(f'<polyline points="{pts}" fill="none" stroke="#C6EA3D" stroke-width="6" stroke-linecap="round"/>')
    p.append(f'<path d="M540 {gy(540) - 2:.0f} V{gy(540) - 34:.0f}" stroke="#F4EED8" stroke-width="4"/><rect x="537" y="{gy(540) - 34:.0f}" width="6" height="30" fill="#F4EED8" opacity=".5"/>')
    p.append(f'<g transform="rotate(-7 400 {gy(400):.0f})">{scholar(400, gy(400) - 2, .95, robe="#F3EEE0", sash="#C23A2B", flip=1, arm="up", wind=.3)}</g>')
    p.append(f'<g transform="rotate(7 690 {gy(690):.0f})">{scholar(690, gy(690) - 2, .95, robe="#FBE3A6", sash="#1E4E62", flip=-1, arm="up", wind=.3, woman=True)}</g>')
    p.append(f'<path d="M436 {gy(400) - 150:.0f} Q545 {gy(540) - 260:.0f} 650 {gy(690) - 150:.0f}" stroke="#FFF6DA" stroke-width="2.4" stroke-dasharray="6 9" fill="none"/>'
             f'<circle cx="590" cy="{gy(590) - 205:.0f}" r="9" fill="#DDF35A"/>')
    # 字
    p.append(vtext('天涯若比邻', 150, 190, 104, '#FFF6DA', 1.12, 700))
    p.append(vtext('海内存知己', 256, 206, 30, '#CFE3D8', 1.5, 500))
    p.append(seal(236, 460, 40, '南伴'))
    footer(p, '在南半球，球友就住隔壁', '诗人打球 · 柒 / 王勃《送杜少府之任蜀州》', 'A FRIEND ACROSS THE WORLD, A NEIGHBOUR ON COURT')
    return page(''.join(p))
