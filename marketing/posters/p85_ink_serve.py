from lib import *
from lin import blob, ink, seal, gball, frame, glow, wash, X0, Y0, S

META = dict(
    id=85, slug='ink-serve', title='抛歪了', lines=['抛球，', '又抛歪了。'],
    style=['水墨重彩', '意境', '幽默'], tone='暖色', demo=False,
    concept='学林风眠的画法不学题材：方形画面，上大半是暮色的大色块（靛蓝压橙红），下面一条浓墨地平；人只用六七笔快速的墨线写出发球的弓身，抛球手指向天，球却偏在一旁',
    use='发球 / 大实话；打过球的人都抛歪过',
)


def svg():
    r = random.Random(85)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<defs><linearGradient id="sk85" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#18203F"/><stop offset=".45" stop-color="#4A2A48"/>'
         f'<stop offset=".72" stop-color="#C2502C"/><stop offset="1" stop-color="#F2A43A"/></linearGradient></defs>',
         f'<rect x="{X0}" y="{Y0}" width="{S}" height="800" fill="url(#sk85)"/>']
    p.append(wash(r, Y0, 330, ['#232B52', '#2E2F5A', '#151B36'], 18))
    p.append(wash(r, 360, 560, ['#6A2E44', '#8C3A3A', '#4E2A4A'], 16, op=(.3, .55)))
    p.append(wash(r, 600, 850, ['#E2712E', '#F2A43A', '#D45A2C', '#F6C25A'], 20, (20, 50), (.5, .85)))
    p.append(glow(760, 820, 280, 80, '#FFD27A', .75))
    p.append(f'<path d="M{X0-20} 858 L{x1+20} 846 L{x1+20} {y1+20} L{X0-20} {y1+20}Z" fill="#101512"/>')   # 浓墨地面
    p.append(ink([(X0 - 30, 860), (500, 852), (x1 + 30, 842)], 30, '#0A0C0B', 1, (0, 0)))
    for _ in range(9):
        y = r.uniform(890, 1000)
        x = r.uniform(X0 - 40, x1 - 200)
        p.append(ink([(x, y), (x + r.uniform(200, 480), y - r.uniform(0, 12))], r.uniform(6, 16), r.choice(['#22302A', '#2C3A2E', '#3A2A1E']), .7, (.4, .4)))
    p.append(ink([(X0 - 20, 930), (540, 920), (x1 + 20, 910)], 7, '#E9DCC0', .75, (.1, .1)))       # 底线
    p.append(ink([(452, 896), (300, 918), (150, 934)], 22, '#000', .45, (0, .8)))                # 影子
    # 人：六七笔，快
    K = '#0C0D10'
    p.append(ink([(430, 722), (440, 800), (450, 882)], 18, K, 1, (.1, .25)))                    # 前腿
    p.append(ink([(418, 724), (390, 792), (404, 874)], 17, K, 1, (.1, .25)))                    # 后腿，膝盖弯
    p.append(ink([(448, 884), (478, 888)], 10, K, 1, (.2, .3)))
    p.append(ink([(400, 876), (424, 882)], 10, K, 1, (.2, .3)))
    p.append(ink([(428, 736), (414, 684), (392, 628), (382, 578)], 42, K, 1, (.5, .4)))         # 弓身：两头收、腰往前顶
    p.append(ink([(362, 584), (404, 570)], 15, K, 1, (.3, .3)))                                  # 肩
    p.append(blob(r, 376, 542, 19, 23, K, 1, -20, .06))                                          # 头，仰着
    p.append(ink([(394, 572), (420, 500), (446, 430), (462, 372)], 13, K, 1, (.05, .7)))         # 抛球手，直指天
    p.append(ink([(376, 574), (334, 572), (316, 530)], 15, K, 1, (.05, .1)))                     # 持拍手
    p.append(ink([(316, 532), (324, 486)], 13, K, 1, (.05, .2)))
    p.append(ink([(324, 488), (300, 436)], 7, K, 1, (0, 0)))
    p.append(f'<ellipse cx="288" cy="404" rx="20" ry="34" transform="rotate(-24 288 404)" fill="none" stroke="{K}" stroke-width="7"/>')
    p.append(glow(612, 286, 40, 40, '#E4F76A', .6, 28))
    p.append(gball(612, 286, 17, 20, '85'))
    p.append(seal(940, 900, 36))
    return page(frame(''.join(p), '抛球，又抛歪了。', 'THE TOSS', 85))
