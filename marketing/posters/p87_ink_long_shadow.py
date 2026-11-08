from lib import *
from lin import blob, ink, seal, gball, frame, wash, X0, Y0, S

META = dict(
    id=87, slug='ink-long-shadow', title='影子先到', lines=['下午四点，', '影子先到了网前。'],
    style=['水墨重彩', '平面构成', '俯视'], tone='暖色', demo=False,
    concept='学林风眠的色彩和平面：俯看半个球场，只有三块大色——赭红的场外、青绿的场地、一道浓墨；人从上面看只是一个点和一只拍子，下午的太阳把影子拉成一笔墨，一直伸到网前',
    use='下午场 / 秋冬太阳低；画面一眼能认的大实话',
)


def svg():
    r = random.Random(87)
    x1, y1 = X0 + S, Y0 + S
    p = [f'<rect x="{X0}" y="{Y0}" width="{S}" height="{S}" fill="#A8442A"/>']
    p.append(wash(r, Y0, y1, ['#B4522E', '#93391F', '#C2643A', '#8A3420'], 30, (40, 90), (.35, .6)))
    g = ['<g transform="rotate(-9 540 560)">']
    g.append('<rect x="250" y="40" width="600" height="1040" fill="#2C6E72"/>')
    g.append('<clipPath id="ct87"><rect x="250" y="40" width="600" height="1040"/></clipPath>')
    g.append('<g clip-path="url(#ct87)">' + wash(r, 40, 1080, ['#357A7C', '#245E64', '#3C8682'], 26, (30, 70), (.3, .55), 200, 900) + '</g>')
    L = '#F1E6CC'
    for a, b in [((250, 40), (250, 1080)), ((850, 40), (850, 1080)), ((318, 40), (318, 1080)), ((782, 40), (782, 1080)),
                 ((318, 420), (782, 420)), ((550, 40), (550, 420)), ((250, 960), (850, 960)), ((550, 960), (550, 940))]:
        g.append(ink([a, b], 9, L, .92, (0, 0)))
    g.append(ink([(200, 60), (900, 60)], 26, '#0E1112', 1, (0, 0)))                               # 网
    g.append(ink([(200, 80), (900, 80)], 6, '#0E1112', .5, (0, 0)))
    # 影子：一笔浓墨，从人脚下伸到网前
    g.append(ink([(612, 900), (560, 600), (500, 300), (466, 84)], 64, '#101418', .88, (.05, .5)))
    g.append(ink([(610, 820), (640, 640), (650, 470)], 14, '#101418', .8, (0, .6)))                # 拍子的影子
    g.append(blob(r, 650, 452, 26, 40, '#101418', .8, 8))
    g.append(blob(r, 616, 920, 28, 20, '#E9D7B8', 1, 20))                                          # 人：俯看只剩肩和头
    g.append(f'<circle cx="614" cy="918" r="15" fill="#15110E"/>')
    g.append(ink([(640, 924), (676, 900), (700, 870)], 6, '#15110E', 1, (0, 0)))
    g.append('<ellipse cx="710" cy="852" rx="15" ry="22" transform="rotate(30 710 852)" fill="none" stroke="#15110E" stroke-width="5"/>')
    g.append(gball(400, 610, 16, 30, '87'))
    g.append('</g>')
    p.append(''.join(g))
    p.append(seal(944, 900, 36))
    return page(frame(''.join(p), '下午四点，影子先到了网前。', '4 PM', 87))
