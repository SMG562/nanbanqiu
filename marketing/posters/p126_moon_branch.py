from lib import *
from lin import DEFS, blob, ink, glow, wash, poem, seal

META = dict(
    id=126, slug='moon-branch', title='像球挂枝头', lines=['三盘打完了，', '球拍懒得收。', '抬头看月亮，', '像球挂枝头。'],
    style=['题画诗', '意境', '形似双关', '光亮'], tone='亮色', demo=False,
    concept='借老树画画「一幅画配一首打油诗」的路子，往上走一步：月夜不画黑，画成透亮的蓝；一枝墨色的树枝伸进画面，满月正好卡在枝杈间，像打飞挂在树上的球；树下长凳上坐着个人，拍子靠在一边',
    use='夜场打完 / 中秋；画和诗互相成全，看一会儿才笑',
)


def svg():
    r = random.Random(126)
    p = [f'<defs>{DEFS}<linearGradient id="sk126" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22336E"/><stop offset=".55" stop-color="#4E6FB4"/><stop offset="1" stop-color="#9DBCE4"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk126)"/>']
    p.append(glow(640, 400, 300, 300, '#DCE8FF', .55))
    p.append(glow(640, 400, 160, 160, '#FFF8E0', .7, 28))
    p.append('<circle cx="640" cy="400" r="96" fill="#FFF6DA"/><circle cx="616" cy="380" r="70" fill="#FFFBEC" opacity=".7"/>')
    br = [ink([(-30, 300), (200, 330), (420, 360), (560, 420), (700, 440)], 30, '#141826', 1, (.02, .85)),       # 主枝穿过月亮下沿
          ink([(420, 360), (520, 300), (600, 290), (690, 300)], 13, '#141826', 1, (.05, .9)),
          ink([(560, 420), (600, 470), (650, 500)], 9, '#141826', 1, (.05, .9)),
          ink([(200, 330), (260, 250), (330, 210)], 14, '#141826', 1, (.05, .9)),
          ink([(300, 345), (330, 420), (380, 470)], 10, '#141826', 1, (.05, .9))]
    for _ in range(46):
        a = r.random()
        x, y = r.choice([(300, 220), (360, 460), (630, 500), (500, 310), (690, 300), (130, 320)])
        br.append(blob(r, x + r.uniform(-50, 50), y + r.uniform(-30, 30), r.uniform(7, 14), r.uniform(4, 7), r.choice(['#1E3A40', '#24485A', '#2E5A5C']), .95, r.uniform(0, 180)))
    p.append('<g filter="url(#paint2)">' + ''.join(br) + '</g>')
    p.append(f'<path d="M0 960 C300 945 760 965 1080 950 L1080 1350 L0 1350Z" fill="#3E6E8E"/>')                    # 月光下的场地
    p.append(wash(r, 960, 1160, ['#4C7E9E', '#3A6886', '#5E8EAE'], 14, (14, 30), (.4, .7), -100, 1080))
    for d in ['M-20 1010 L1100 990', 'M560 1000 L600 1180']:
        p.append(f'<path d="{d}" stroke="#E8EEF4" stroke-width="5" opacity=".8" fill="none"/>')
    n0 = len(p)
    # 长凳和人：几笔
    K = '#141826'
    fig = [ink([(120, 1060), (380, 1054)], 12, '#6A4A30', 1, (0, 0)), ink([(140, 1062), (140, 1110)], 7, K, 1, (0, 0)), ink([(362, 1056), (362, 1104)], 7, K, 1, (0, 0)),
           ink([(244, 1054), (240, 1016), (246, 984)], 30, '#FFFFFF', 1, (.35, .3)),
           ink([(236, 1058), (270, 1066), (272, 1108)], 9, K, 1, (.1, .1)), ink([(250, 1058), (286, 1064), (290, 1108)], 9, K, 1, (.1, .1)),
           ink([(240, 1000), (220, 1030), (236, 1050)], 6, K, 1, (.1, .1)), ink([(250, 1000), (268, 1028), (256, 1048)], 6, K, 1, (.1, .1))]
    fig.append(f'<circle cx="248" cy="966" r="12" fill="{K}"/>')
    fig.append(ink([(254, 960), (262, 948)], 3, K, .8, (0, 0)))                                                    # 仰头的方向
    fig.append(ink([(390, 1108), (420, 1020)], 5, K, 1, (0, 0)))                                                    # 靠着凳子的拍子
    fig.append(f'<ellipse cx="428" cy="996" rx="13" ry="22" transform="rotate(18 428 996)" fill="none" stroke="{K}" stroke-width="4"/>')
    p.append('<g filter="url(#paint2)">' + ''.join(fig) + '</g>')
    p[n0:] = ['<g transform="translate(250 1110) scale(1.6) translate(-250 -1110)">' + ''.join(p[n0:]) + '</g>']
    txt, xl, yb = poem(META['lines'], 980, 640, 40, '#FFF6DC')
    p.append(txt)
    p.append(seal(xl - 44, yb + 34, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.1))
    return page(''.join(p))
