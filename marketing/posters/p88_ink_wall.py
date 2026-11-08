from lib import *
from lin import blob, ink, seal, gball, frame, glow, wash, X0, Y0, S

META = dict(
    id=88, slug='ink-wall', title='跟墙打', lines=['没约到人，', '就跟墙打。'],
    style=['水墨重彩', '意境', '幽默'], tone='浅色', demo=False,
    concept='学林风眠的孤寂和温度：清晨的雾是几层灰青的湿笔，右边一大块浓墨的练习墙，墙上一道白线；左下一个人几笔写成，球刚离拍，是整张唯一的亮色',
    use='约不到人的时候；引到「发一局」',
)


def svg():
    r = random.Random(88)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="#C7D0CC"/>']
    p.append(glow(260, 240, 220, 160, '#F6E7B8', .8))
    p.append(wash(r, Y0, 820, ['#B7C3C0', '#D6DCD6', '#A9B7B6', '#E4E2D4'], 30, (40, 90), (.35, .6)))
    for i in range(9):                            # 雾里远处一排树冠：淡墨团，越远越淡
        cx = X0 + 30 + i * 64 + r.uniform(-14, 14)
        p.append(blob(r, cx, 640 + r.uniform(-30, 20), r.uniform(40, 70), r.uniform(60, 110), '#7E8E8A', r.uniform(.25, .4)))
        p.append(ink([(cx, 790), (cx + r.uniform(-4, 4), 660)], 6, '#5E6E6C', .3, (0, 0)))
    p.append(wash(r, 520, 800, ['#C9D2CE', '#DADFD8'], 10, (40, 80), (.4, .6)))                 # 再压一层雾
    # 墙：一大块浓墨
    p.append(f'<path d="M600 150 L{x1+20} 130 L{x1+20} 880 L600 872Z" fill="#17211E"/>')
    p.append(wash(r, 150, 870, ['#22302B', '#0E1412', '#2A3833'], 18, (30, 70), (.4, .7), 560, x1 + 200))
    p.append(ink([(600, 150), (603, 872)], 12, '#060908', 1, (0, 0)))
    p.append(ink([(606, 560), (800, 556), (x1 + 20, 552)], 9, '#EDE6D2', .9, (.05, 0)))           # 墙上的网高线
    p.append('<circle cx="800" cy="470" r="15" fill="none" stroke="#EDE6D2" stroke-width="3" opacity=".35"/>')   # 墙上一个旧球印
    p.append(f'<path d="M{X0-20} 878 L{x1+20} 868 L{x1+20} {y1+20} L{X0-20} {y1+20}Z" fill="#5E7A6E"/>')
    p.append(wash(r, 885, 1000, ['#6E8A7E', '#4E6A5E', '#7E968A'], 12, (14, 30), (.4, .7)))
    p.append(ink([(X0 - 20, 960), (540, 950), (x1 + 20, 942)], 7, '#EDE6D2', .8, (.05, .05)))
    # 人：正手送完拍，几笔
    K = '#101412'
    p.append(ink([(262, 940), (272, 870), (286, 812)], 22, K, 1, (.05, .1)))
    p.append(ink([(290, 812), (318, 872), (340, 936)], 20, K, 1, (.05, .1)))
    p.append(ink([(284, 816), (282, 780), (294, 744), (306, 714)], 40, K, 1, (.35, .3)))
    p.append(blob(r, 312, 688, 18, 21, K, 1, 10, .08))
    p.append(ink([(300, 728), (262, 712), (240, 690)], 10, K, 1, (.05, .6)))                     # 左手平衡
    p.append(ink([(308, 728), (346, 708), (366, 668)], 12, K, 1, (.05, .2)))                     # 送拍
    p.append(ink([(366, 668), (360, 620)], 6, K, 1, (0, 0)))
    p.append('<ellipse cx="356" cy="594" rx="16" ry="27" transform="rotate(-10 356 594)" fill="none" stroke="#101412" stroke-width="6"/>')
    p.append(ink([(380, 640), (450, 610), (510, 596)], 3, '#F4F7D0', .5, (.9, 0)))                # 球路
    p.append(glow(528, 594, 34, 34, '#E4F76A', .55, 28))
    p.append(gball(528, 594, 15, 0, '88'))
    p.append(seal(110, 120, 36))
    return page(frame(''.join(p), '没约到人，就跟墙打。', 'THE WALL', 88))
