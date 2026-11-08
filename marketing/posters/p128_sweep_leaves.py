from lib import *
from lin import DEFS, blob, ink, glow, wash, poem, seal

META = dict(
    id=128, slug='sweep-leaves', title='又落一大把', lines=['秋叶落满场，', '扫完再开打。', '一局还没完，', '又落一大把。'],
    style=['题画诗', '幽默', '秋天', '光亮'], tone='暖色', demo=False,
    concept='诗画配：一棵撑开半个天的银杏，金黄的扇叶一片片往下落；树下的人拿着扫帚，旁边扫好的一堆叶子，身后又落满了——球拍还靠在网柱上等着',
    use='秋天球场；好笑、明亮、季节感',
)


def fan(r, x, y, s, rot, c):
    a = math.radians(rot)
    return (f'<path d="M{x:.0f} {y:.0f} L{x + s * math.cos(a - .55):.0f} {y + s * math.sin(a - .55):.0f} Q{x + s * 1.15 * math.cos(a):.0f} {y + s * 1.15 * math.sin(a):.0f} '
            f'{x + s * math.cos(a + .55):.0f} {y + s * math.sin(a + .55):.0f}Z" fill="{c}"/>')


def svg():
    r = random.Random(128)
    p = [f'<defs>{DEFS}<linearGradient id="sk128" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8E6B8"/><stop offset="1" stop-color="#FCF6E6"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk128)"/>', glow(760, 300, 340, 260, '#FFF4C8', .9)]
    t = [ink([(880, 1000), (870, 760), (840, 560), (800, 420)], 46, '#4A3624', 1, (.02, .3)),
         ink([(850, 600), (700, 470), (560, 420)], 20, '#4A3624', 1, (.05, .8)),
         ink([(830, 480), (930, 360), (1010, 320)], 16, '#4A3624', 1, (.05, .8)),
         ink([(810, 440), (760, 300), (720, 220)], 14, '#4A3624', 1, (.05, .8))]
    for _ in range(420):                                                                                          # 银杏树冠
        a, d = r.uniform(0, 2 * math.pi), math.sqrt(r.random())
        x, y = 780 + 330 * d * math.cos(a), 360 + 240 * d * math.sin(a)
        t.append(fan(r, x, y, r.uniform(12, 22), r.uniform(0, 360), r.choice(['#F2C230', '#F6D458', '#E8A820', '#FBE38A'])))
    for _ in range(36):                                                                                           # 正在落的
        x, y = r.uniform(420, 1060), r.uniform(560, 980)
        t.append(fan(r, x, y, r.uniform(10, 16), r.uniform(0, 360), r.choice(['#F2C230', '#F6D458'])))
    p.append('<g filter="url(#paint2)">' + ''.join(t) + '</g>')
    n0 = len(p)
    p.append('<path d="M0 960 C320 950 760 970 1080 950 L1080 1350 L0 1350Z" fill="#5BAA86"/>')
    p.append(wash(r, 960, 1170, ['#64B48E', '#4E9C7A', '#74C098'], 14, (14, 30), (.4, .7), -100, 1080))
    for d in ['M-20 1000 L1100 988', 'M-20 1120 L1100 1104']:
        p.append(f'<path d="{d}" stroke="#FFFBEE" stroke-width="5" fill="none"/>')
    lv = []
    for _ in range(140):                                                                                          # 场上又落满了
        lv.append(fan(r, r.uniform(0, 1080), r.uniform(970, 1170), r.uniform(9, 14), r.uniform(0, 360), r.choice(['#F2C230', '#F6D458', '#E8A820'])))
    for _ in range(60):                                                                                           # 扫好的一堆
        a, d = r.uniform(math.pi, 2 * math.pi), r.random() ** .5
        lv.append(fan(r, 200 + 80 * d * math.cos(a), 1080 + 40 * d * math.sin(a), r.uniform(9, 14), r.uniform(0, 360), r.choice(['#E8A820', '#F2C230', '#D9961A'])))
    K = '#2A2420'
    lv += [ink([(360, 1110), (368, 1068), (372, 1030)], 9, K, 1, (.1, .1)), ink([(384, 1110), (386, 1068), (380, 1030)], 9, K, 1, (.1, .1)),
           ink([(376, 1032), (372, 996), (364, 966)], 26, '#FFFFFF', 1, (.35, .3)), f'<circle cx="360" cy="948" r="11" fill="{K}"/>',
           ink([(366, 980), (340, 1010), (316, 1040)], 6, K, 1, (.1, .1)), ink([(372, 984), (352, 1030)], 6, K, 1, (.1, .1)),
           ink([(300, 960), (330, 1050), (300, 1110)], 4, '#6A4A2A', 1, (0, 0)),                                     # 扫帚杆
           ink([(286, 1100), (300, 1112), (330, 1108)], 18, '#C89A4A', 1, (.2, .2))]                                 # 扫帚头
    lv += [ink([(640, 1100), (640, 980)], 6, K, 1, (0, 0)), ink([(650, 1060), (676, 990)], 4, K, 1, (0, 0)),                    # 网柱和靠着的拍子
           f'<ellipse cx="682" cy="972" rx="11" ry="18" transform="rotate(20 682 972)" fill="none" stroke="{K}" stroke-width="3.5"/>',
           '<circle cx="700" cy="1092" r="6" fill="#C6EA3D" stroke="#7FA21C" stroke-width="1.2"/>']
    p.append('<g filter="url(#paint2)">' + ''.join(lv) + '</g>')
    p[n0:] = ['<g transform="translate(540 1180) scale(1.3) translate(-540 -1180)">' + ''.join(p[n0:]) + '</g>']
    txt, xl, yb = poem(META['lines'], 300, 200, 40, '#2A2A26')
    p.append(txt)
    p.append(seal(xl - 44, yb + 34, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.08, light=True))
    return page(''.join(p))
