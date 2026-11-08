from lib import *
from lin import blob, ink, seal, gball, frame_dark as frame, X0, Y0, S

META = dict(
    id=116, slug='ink-still-life', title='盘子里那颗', lines=['盘子里那颗，', '不是橘子。'],
    style=['水墨重彩', '静物', '形似双关'], tone='深色', demo=False,
    concept='水墨重彩静物方画：深色底、倾斜的桌面，青花罐里插一大把红白黄的花，白瓷盘里堆着橘子，其中一颗是网球；粗墨线勾轮廓',
    use='形似双关；打完球回家，球随手放进了果盘',
)


def fruit(cx, cy, rr, c='#E07B24', hi='#F6B04A'):
    return (f'<circle cx="{cx}" cy="{cy}" r="{rr}" fill="{c}"/><circle cx="{cx-rr*.3:.1f}" cy="{cy-rr*.35:.1f}" r="{rr*.42:.1f}" fill="{hi}" opacity=".75"/>'
            f'<circle cx="{cx+rr*.25:.1f}" cy="{cy+rr*.3:.1f}" r="{rr*.6:.1f}" fill="#9C3F14" opacity=".35"/>'
            + ink([(cx - rr, cy), (cx - rr * .7, cy + rr * .72), (cx, cy + rr), (cx + rr * .72, cy + rr * .7), (cx + rr, cy)], 7, '#141110', .9, (.2, .2)))


def svg():
    r = random.Random(87)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="#1C2533"/>']
    for _ in range(30):                           # 底子：竖向、斜向的深色大笔
        x = r.uniform(X0 - 40, x1)
        p.append(ink([(x, Y0 - 20), (x + r.uniform(-60, 60), 700)], r.uniform(40, 90), r.choice(['#243246', '#16202C', '#2E3B4A', '#3A3226']), .6, (.2, .2)))
    p.append(f'<path d="M{X0-10} 640 L{x1+10} 600 L{x1+10} {y1+10} L{X0-10} {y1+10}Z" fill="#8A4A26"/>')   # 桌面
    for _ in range(18):
        y = r.uniform(620, 1000)
        x = r.uniform(X0 - 60, x1 - 150)
        p.append(ink([(x, y), (x + r.uniform(160, 380), y - r.uniform(5, 20))], r.uniform(14, 30), r.choice(['#A65A2C', '#6E3618', '#B8703A']), .6, (.3, .3)))
    p.append('<path d="M110 700 L560 660 L640 1010 L150 1010Z" fill="#E9E1CF" opacity=".92"/>')    # 桌布
    p.append(ink([(110, 700), (560, 660), (640, 1010)], 8, '#141110', .8, (.05, .05)))
    p.append(ink([(X0 - 10, 640), (540, 618), (x1 + 10, 600)], 12, '#141110', .9, (0, 0)))
    # 青花罐
    vase = 'M300 420 C250 450 236 560 262 640 C276 690 300 720 330 730 L430 730 C460 720 484 690 498 640 C524 560 510 450 460 420 C452 400 452 380 466 366 L294 366 C308 380 308 400 300 420Z'
    p.append(f'<path d="{vase}" fill="#ECE8DC"/>')
    p.append(ink([(270, 520), (380, 540), (492, 520)], 14, '#2B4F8E', .9, (.1, .1)))
    p.append(ink([(262, 640), (380, 660), (498, 640)], 12, '#2B4F8E', .9, (.1, .1)))
    for i in range(5):
        cx = 300 + i * 40
        p.append(ink([(cx, 590), (cx + 14, 570), (cx + 28, 592), (cx + 14, 610), (cx, 590)], 6, '#2B4F8E', .85, (0, 0)))
    p.append(ink([(296, 370), (300, 420), (262, 500), (256, 600), (290, 700), (330, 730), (430, 730), (470, 700), (504, 600), (498, 500), (460, 420), (464, 370)], 9, '#141110', .95, (.02, .02)))
    # 花
    for _ in range(14):
        a = r.uniform(-2.6, -.5)
        p.append(ink([(380, 380), (380 + 120 * math.cos(a), 380 + 150 * math.sin(a)), (380 + 230 * math.cos(a), 380 + 250 * math.sin(a))], 7, '#1F3A26', .9, (.05, .5)))
    for _ in range(30):
        a, d = r.uniform(-3.0, -.15), r.uniform(80, 270)
        cx, cy = 380 + d * 1.15 * math.cos(a), 360 + d * math.sin(a)
        p.append(blob(r, cx, cy, 30, 18, r.choice(['#26432C', '#33563A']), .95, math.degrees(a)))
    flowers = [('#C8392B', '#7E1C17'), ('#F1EAD8', '#B9AE96'), ('#F0C23A', '#B07A18'), ('#C8392B', '#7E1C17'), ('#E07A9A', '#8E3550'), ('#F1EAD8', '#B9AE96')]
    for i in range(30):
        a, d = r.uniform(-2.9, -.25), r.uniform(40, 240) * (1 - i / 60)
        cx, cy = 380 + d * 1.1 * math.cos(a), 350 + d * .95 * math.sin(a)
        c, dk = flowers[i % len(flowers)]
        rr = r.uniform(34, 56)
        p.append(blob(r, cx, cy, rr, rr * .85, c, 1, r.uniform(0, 180), .3, 7))
        p.append(blob(r, cx + 4, cy + 4, rr * .45, rr * .4, dk, .8))
        p.append(ink([(cx - rr, cy), (cx - rr * .2, cy - rr * .95), (cx + rr * .9, cy - rr * .3), (cx + rr * .7, cy + rr * .7)], 4, '#141110', .75, (.2, .2)))
        p.append(f'<circle cx="{cx+4:.0f}" cy="{cy+3:.0f}" r="{rr*.12:.1f}" fill="#141110" opacity=".85"/>')
    # 盘子和橘子
    p.append('<ellipse cx="720" cy="830" rx="210" ry="66" fill="#0E0C0A" opacity=".35"/>')
    p.append('<ellipse cx="712" cy="812" rx="210" ry="64" fill="#EEE9DD"/>')
    p.append('<ellipse cx="712" cy="806" rx="160" ry="42" fill="#D7D3C6"/>')
    p.append(ink([(502, 812), (560, 860), (712, 878), (864, 860), (922, 812)], 9, '#141110', .9, (.05, .05)))
    p.append(ink([(510, 800), (600, 760), (712, 750), (840, 762), (918, 800)], 6, '#2B4F8E', .8, (.05, .05)))
    for cx, cy, rr in [(640, 770, 52), (760, 772, 50), (700, 720, 48), (820, 740, 40)]:
        p.append(fruit(cx, cy, rr))
    p.append(gball(588, 724, 46, 25, '87'))
    p.append(ink([(542, 726), (552, 764), (588, 770), (626, 760), (634, 724)], 6, '#141110', .85, (.2, .2)))
    p.append(fruit(870, 905, 44))
    p.append(seal(940, 900, 40))
    return page(frame(''.join(p), '盘子里那颗，不是橘子。', 'STILL LIFE', 87))
