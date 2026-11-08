from lib import *
from lin import blob, ink, seal, gball, frame, glow, wash, X0, Y0, S

META = dict(
    id=113, slug='ink-grassland', title='打得真舒服', lines=['这一拍，', '打得真舒服。'],
    style=['水墨重彩', '自然', '天地', '光亮'], tone='亮色', demo=False,
    concept='学林风眠的气象：一望无际的金色草原，天是一大片发光的玫瑰金和奶白，云像几笔横扫；草原中间一块小球场，一个人高高跳起扣杀、双臂打开——画面很满、很亮，人很小，心里很宽',
    use='打完球的畅快；从「打球」看到天地和人的精神',
)


def svg():
    r = random.Random(113)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<defs><linearGradient id="sk113" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ABFE0"/><stop offset=".4" stop-color="#F6D8C8"/><stop offset=".75" stop-color="#FFE7B0"/><stop offset="1" stop-color="#FFF4D6"/></linearGradient></defs>',
         f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="url(#sk113)"/>']
    p.append(glow(560, 600, 380, 160, '#FFFBEC', .95))
    p.append(wash(r, Y0, 300, ['#B4CDE6', '#D8E2F0', '#F2DCD8'], 14, (30, 70), (.35, .6)))
    p.append(wash(r, 300, 580, ['#F7C8B4', '#FFD9A8', '#FBE6D0', '#F2B8A8'], 22, (16, 40), (.45, .8)))
    p.append(ink([(X0 - 40, 640), (400, 628), (x1 + 40, 634)], 26, '#B7A2C8', .6, (0, 0)))           # 远处一线淡紫的山
    p.append(f'<path d="M{X0-10} 648 L{x1+10} 644 L{x1+10} {y1+10} L{X0-10} {y1+10}Z" fill="#E8B24A"/>')
    p.append(wash(r, 650, 1000, ['#F2C45A', '#D99A30', '#F8D878', '#C88628', '#FBE6A0'], 34, (10, 30), (.5, .9)))
    for _ in range(120):                                                                            # 近处草，一排快笔
        bx = r.uniform(X0 - 20, x1 + 20)
        by = r.uniform(900, y1 + 10)
        h = r.uniform(40, 110)
        p.append(ink([(bx, by), (bx + r.uniform(4, 30), by - h)], r.uniform(3, 7), r.choice(['#B67A20', '#E8A838', '#8A5A18', '#F6D070']), .85, (.02, .9)))
    p.append('<path d="M400 742 L700 738 L760 812 L340 818Z" fill="#3E9C7E"/>')
    for a, b in [((400, 742), (700, 738)), ((700, 738), (760, 812)), ((340, 818), (400, 742)), ((370, 778), (730, 774))]:
        p.append(ink([a, b], 4, '#FFFBEE', .95, (0, 0)))
    # 人：高高跳起，双臂打开，拍举过头
    K = '#1A1614'
    p.append(ink([(552, 700), (540, 728), (548, 754)], 10, K, 1, (.1, .3)))
    p.append(ink([(562, 700), (580, 722), (596, 730)], 10, K, 1, (.1, .3)))
    p.append(ink([(558, 704), (556, 668), (552, 640)], 26, '#FFFFFF', 1, (.35, .3)))
    p.append(blob(r, 552, 622, 10, 12, K, 1))
    p.append(ink([(546, 650), (520, 626), (500, 616)], 6, K, 1, (.05, .7)))
    p.append(ink([(560, 648), (580, 616), (588, 586)], 6, K, 1, (.05, .1)))
    p.append(f'<ellipse cx="592" cy="566" rx="9" ry="15" transform="rotate(10 592 566)" fill="none" stroke="{K}" stroke-width="3.5"/>')
    p.append(ink([(552, 812), (566, 812)], 6, '#7A5A20', .4, (0, 0)))                                 # 地上的小影子
    p.append(gball(612, 540, 8, 0, '113'))
    for x, y in [(240, 380), (268, 362), (820, 300)]:                                               # 远鸟
        p.append(ink([(x - 12, y), (x, y - 6), (x + 12, y)], 3, '#5A4A50', .7, (.2, .2)))
    p.append(seal(944, 120, 36))
    return page(frame(''.join(p), '这一拍，打得真舒服。', 'OPEN SKY', 113))
