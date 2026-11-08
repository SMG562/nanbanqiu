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
        '<pattern id="mesh_t" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="none" stroke="#4A6A5A" stroke-width="1.4"/></pattern>'
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


def schoolyard(p, r, slogan_text='好好打球天天向上'):
    """高机位远景的学校运动场：教学楼、白杨、红跑道弯道、篮球架、乒乓球台、
    一块被围网围住的南伴绿网球场；八个大字挂在远端围网上，正对着看的人。
    返回 (球场透视函数)：T(u, v) 把场地坐标 (u 0..1 左右, v 0..1 远近) 映射到画面。"""
    from lin import blob, ink
    FY, NY, FL, FR, NL, NR = 600, 1060, 230, 850, 40, 1040          # 球场远边 / 近边
    T = lambda u, v: (FL + (FR - FL) * u + ((NL + (NR - NL) * u) - (FL + (FR - FL) * u)) * v, FY + (NY - FY) * v)
    p.append('<defs><linearGradient id="sky_t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B8D4E0"/><stop offset="1" stop-color="#E8E4CC"/></linearGradient></defs>')
    p.append('<rect width="1080" height="1110" fill="url(#sky_t)"/>')
    # 教学楼（远处一长条）
    p.append(outlined('<rect x="120" y="150" width="840" height="190" fill="#EDE4CC"/><rect x="120" y="140" width="840" height="14" fill="#B8A88A"/>'))
    for row in range(3):
        for col in range(14):
            p.append(f'<rect x="{146 + col * 58}" y="{176 + row * 54}" width="34" height="32" fill="#8EB0C0" stroke="{INK}" stroke-width="1.5"/>')
    p.append(outlined('<rect x="500" y="290" width="80" height="50" fill="#9A4A34"/>'))
    # 地面
    p.append('<path d="M0 330 L1080 330 L1080 1110 L0 1110Z" fill="#D8C8A0"/>')
    # 白杨一排
    tr = ''
    for x in range(30, 1080, 70):
        tr += ink([(x, 400), (x + 1, 300)], 7, '#7A5A3A', 1, (0, 0)) + ''.join(blob(r, x + r.uniform(-10, 10), 260 + r.uniform(-50, 40), 16, 40, r.choice(['#4E8A4E', '#3E7A44', '#5E9A56']), 1) for _ in range(3))
    p.append(outlined(tr))
    # 红跑道的一段弯道（左边）+ 白线
    p.append('<path d="M-60 1110 C-60 700 120 470 330 440 L330 500 C170 520 40 720 40 1110Z" fill="#B8503A"/>')
    for k in range(1, 4):
        p.append(f'<path d="M{-60 + k*25} 1110 C{-60 + k*25} {700 + k*5} {120 + k*12} {470 + k*15} 330 {440 + k*15}" stroke="#F4EED8" stroke-width="2" fill="none"/>')
    # 篮球架（左上）、乒乓球台（右边）
    p.append(outlined(f'<rect x="160" y="380" width="8" height="120" fill="#5A5A5A"/><rect x="132" y="370" width="64" height="44" fill="#F4F2EA"/><rect x="150" y="390" width="28" height="18" fill="none" stroke="{RED}" stroke-width="3"/>'))
    for x, y in [(900, 470), (980, 520)]:
        p.append(outlined(f'<path d="M{x - 40} {y} L{x + 40} {y} L{x + 50} {y + 24} L{x - 50} {y + 24}Z" fill="#7A8A84"/><rect x="{x - 3}" y="{y - 10}" width="6" height="34" fill="#F4F2EA"/><rect x="{x - 30}" y="{y + 24}" width="10" height="20" fill="#5A5A5A"/><rect x="{x + 20}" y="{y + 24}" width="10" height="20" fill="#5A5A5A"/>'))
    # 球场（南伴绿）+ 白线
    poly = ' '.join(f'{a:.0f},{b:.0f}' for a, b in [T(0, 0), T(1, 0), T(1, 1), T(0, 1)])
    p.append(f'<polygon points="{poly}" fill="{GREEN}"/>')
    p.append(f'<polygon points="{poly}" fill="url(#dots_t)" opacity=".16"/>')
    def L(u1, v1, u2, v2, w=4):
        (a, b), (c, d) = T(u1, v1), T(u2, v2)
        p.append(f'<line x1="{a:.0f}" y1="{b:.0f}" x2="{c:.0f}" y2="{d:.0f}" stroke="#F4EED8" stroke-width="{w}"/>')
    for u in (.12, .88):
        L(u, .06, u, .94)
    for u in (.18, .82):
        L(u, .06, u, .94, 3)
    L(.12, .06, .88, .06); L(.12, .94, .88, .94); L(.18, .3, .82, .3, 3); L(.18, .7, .82, .7, 3); L(.5, .3, .5, .7, 3)
    (a, b), (c, d) = T(.06, .5), T(.94, .5)
    p.append(outlined(f'<line x1="{a:.0f}" y1="{b:.0f}" x2="{c:.0f}" y2="{d:.0f}" stroke="#F4EED8" stroke-width="7"/><rect x="{a - 4:.0f}" y="{b - 30:.0f}" width="6" height="34" fill="#4A4A4A"/><rect x="{c - 2:.0f}" y="{d - 30:.0f}" width="6" height="34" fill="#4A4A4A"/>'))
    p.append(f'<g opacity=".55">' + ''.join(f'<line x1="{a + (c - a) * k / 60:.0f}" y1="{b:.0f}" x2="{a + (c - a) * k / 60:.0f}" y2="{b + 16:.0f}" stroke="{INK}" stroke-width="1"/>' for k in range(61)) + '</g>')
    # 围网：远端一面（挂标语）+ 两侧（透视收向远处）
    FH = 120
    (fx1, fy), (fx2, _) = T(0, 0), T(1, 0)
    p.append(f'<rect x="{fx1:.0f}" y="{fy - FH}" width="{fx2 - fx1:.0f}" height="{FH}" fill="url(#mesh_t)" opacity=".75"/>')
    for k in range(9):
        x = fx1 + (fx2 - fx1) * k / 8
        p.append(f'<rect x="{x - 3:.0f}" y="{fy - FH - 6}" width="6" height="{FH + 6}" fill="#2E5A44"/>')
    p.append(f'<rect x="{fx1:.0f}" y="{fy - FH - 8}" width="{fx2 - fx1:.0f}" height="6" fill="#2E5A44"/>')
    for side in (0, 1):
        (nx, ny) = T(side, 1)
        p.append(f'<polygon points="{T(side, 0)[0]:.0f},{fy} {T(side, 0)[0]:.0f},{fy - FH} {nx:.0f},{ny - FH * 2.1:.0f} {nx:.0f},{ny}" fill="url(#mesh_t)" opacity=".55"/>')
        p.append(f'<line x1="{T(side, 0)[0]:.0f}" y1="{fy - FH}" x2="{nx:.0f}" y2="{ny - FH * 2.1:.0f}" stroke="#2E5A44" stroke-width="5"/>')
        for k in range(1, 6):
            (px, py) = T(side, k / 5)
            p.append(f'<rect x="{px - 3:.0f}" y="{py - FH * (1 + 1.1 * k / 5):.0f}" width="{6 + 2 * k / 5:.0f}" height="{FH * (1 + 1.1 * k / 5):.0f}" fill="#2E5A44"/>')
    # 远端围网上的八块红色标语牌
    n = len(slogan_text)
    bw, gap, mid = 62, 8, 26
    total = n * bw + (n - 1) * gap + mid
    x0 = (fx1 + fx2) / 2 - total / 2
    for i, ch in enumerate(slogan_text):
        x = x0 + i * (bw + gap) + (mid if i >= n // 2 else 0)
        y = fy - FH + 22
        p.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{bw}" height="{bw + 6}" fill="{RED}" stroke="#7A2418" stroke-width="2"/>'
                 f'<text x="{x + bw / 2:.0f}" y="{y + bw * .82:.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{bw * .76:.0f}" fill="#F7E9C8">{ch}</text>'
                 f'<circle cx="{x + 6:.0f}" cy="{y + 6:.0f}" r="2" fill="#7A2418"/><circle cx="{x + bw - 6:.0f}" cy="{y + 6:.0f}" r="2" fill="#7A2418"/>')
    return T
