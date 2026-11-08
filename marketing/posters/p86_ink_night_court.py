from lib import *
from lin import blob, ink, seal, frame, glow, wash, X0, Y0, S

META = dict(
    id=86, slug='ink-night-court', title='还亮着', lines=['十点了，', '三号场还亮着。'],
    style=['水墨重彩', '意境', '城市'], tone='深色', demo=False,
    concept='学林风眠的格局：方画里天地占了九成，深靛的夜、一条浓墨的远山和城市灯点；中间一小块球场被灯照成一汪亮绿，两个人只是两笔墨；前景一排快速的墨草，节奏感从他那里学来',
    use='夜场 / 下班后打球；城市很大，球场很小但亮着',
)


def svg():
    r = random.Random(86)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<defs><linearGradient id="sk86" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070C1E"/><stop offset=".8" stop-color="#1A2C4E"/><stop offset="1" stop-color="#2E3E5A"/></linearGradient></defs>',
         f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="url(#sk86)"/>']
    p.append(wash(r, Y0, 560, ['#101A38', '#1C2A4E', '#0A1128', '#23345A'], 26, (30, 80), (.3, .6)))
    p.append(glow(800, 590, 300, 60, '#3E4A6A', .8))
    for i in range(3):                            # 远山：几笔浓淡
        y = 600 + i * 22
        p.append(ink([(X0 - 40, y + r.uniform(-20, 10)), (300, y - 50 + i * 15), (560, y - 10), (800, y - 40 + i * 12), (x1 + 40, y)], 70 - i * 10, ['#151C2C', '#0E131D', '#080B10'][i], .95, (0, 0)))
    for _ in range(80):                           # 城市灯点
        x = r.uniform(560, x1 - 10)
        y = r.uniform(612, 646) - (x - 560) * .02
        p.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r.uniform(1.2, 3.2):.1f}" fill="{r.choice(["#F2B134", "#FFE6A8", "#FFC27A"])}" opacity="{r.uniform(.5, 1):.2f}"/>')
    p.append(f'<rect x="{X0}" y="660" width="{S}" height="{y1-660}" fill="#0B1310"/>')
    p.append(wash(r, 670, 900, ['#101C17', '#16241D', '#0A100D'], 14, (20, 40)))
    # 一汪光
    p.append(glow(470, 762, 300, 120, '#C6EA3D', .28))
    p.append(glow(470, 762, 170, 60, '#F4FAD0', .55, 28))
    p.append('<path d="M368 728 L572 724 L640 806 L300 812Z" fill="#4E8E62"/>')
    p.append('<path d="M368 728 L572 724 L640 806 L300 812Z" fill="#E4F7B0" opacity=".25"/>')
    for a, b in [((368, 728), (572, 724)), ((572, 724), (640, 806)), ((640, 806), (300, 812)), ((300, 812), (368, 728)), ((334, 766), (606, 762))]:
        p.append(ink([a, b], 3.5, '#F4EEDC', .85, (0, 0)))
    for x, y in [(352, 718), (590, 714), (300, 806), (648, 800)]:
        p.append(ink([(x, y), (x, y - 120)], 4, '#05080A', 1, (0, 0)))
        p.append(glow(x, y - 122, 18, 18, '#FFF6D8', .9, 6))
        p.append(f'<circle cx="{x}" cy="{y-122}" r="4" fill="#FFFBEA"/>')
    p.append(ink([(426, 750), (428, 734), (432, 726)], 7, '#05080A', 1, (.1, .4)))               # 两个人：两笔
    p.append(ink([(512, 794), (516, 774), (510, 762)], 8, '#05080A', 1, (.1, .4)))
    p.append('<circle cx="476" cy="744" r="3.5" fill="#E4F76A"/>')
    # 前景墨草：一排快笔
    p.append(f'<path d="M{X0-20} 960 C300 930 700 950 {x1+20} 925 L{x1+20} {y1+20} L{X0-20} {y1+20}Z" fill="#030504"/>')
    for i in range(30):
        bx = X0 - 20 + i * 33 + r.uniform(-8, 8)
        h = r.uniform(70, 170) * (1.4 if i % 6 == 0 else 1)
        lean = r.uniform(20, 70)
        p.append(ink([(bx, y1 + 10), (bx + lean * .3, y1 - h * .5), (bx + lean, y1 - h)], r.uniform(10, 18), '#030504', 1, (.02, .85)))
    p.append(seal(940, 120, 36))
    return page(frame(''.join(p), '十点了，三号场还亮着。', 'NIGHT', 86))
