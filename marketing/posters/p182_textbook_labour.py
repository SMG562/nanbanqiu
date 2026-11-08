from lib import *
from people import person
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish, lesson, schoolyard

META = dict(
    id=182, slug='textbook-labour', title='劳动课', lines=['打球之前，', '先把场地弄干净。'],
    style=['课本插画', '年代感', '远景', '南伴绿'], tone='浅色', demo=False,
    concept='六七十年代课本插画的画法，高机位远景：同一个学校运动场，围网上挂着「好好打球　天天向上」；南伴绿的场地上上劳动课——有人扫落叶、两个人推着石头压路滚、有人提着石灰桶画一条画了一半的白线、两个人抬着一筐球往场边走',
    use='年代感 / 一起搭把手；回忆共鸣',
)


def svg():
    r = random.Random(182)
    p = [f'<defs>{DEFS}</defs>', f'<rect width="1080" height="1350" fill="{PAPER}"/>']
    T = schoolyard(p, r)
    for _ in range(60):                                                                                        # 场上的落叶
        u, v = r.uniform(.02, .98), r.uniform(.4, 1)
        x, y = T(u, v)
        p.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="5" ry="2.5" fill="{r.choice(["#D8A040", "#B8742A", "#E8C060"])}"/>')
    def kid(u, v, pose, f, sk=0, hr=0, hs='short', s=1.0):
        x, y = T(u, v)
        sc = (.28 + .2 * v) * s
        p.append(outlined(person(x, y, sc, pose, f, sk, hr, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle=hs)))
        return x, y, sc
    x, y, sc = kid(.2, .86, 'teach', 1, 0, 1, 'pony')                                                         # 扫地
    p.append(outlined(f'<line x1="{x + 60*sc:.0f}" y1="{y - 210*sc:.0f}" x2="{x + 95*sc:.0f}" y2="{y - 6:.0f}" stroke="#8A6A3A" stroke-width="4"/><path d="M{x + 80*sc:.0f} {y - 10:.0f} l40 8 l-6 12 l-40 -8Z" fill="#D8B060"/>'))
    rx, ry = T(.55, .28)                                                                                      # 压路滚
    p.append(outlined(f'<rect x="{rx - 40:.0f}" y="{ry - 26:.0f}" width="80" height="44" rx="22" fill="#9A9A90"/><line x1="{rx:.0f}" y1="{ry - 4:.0f}" x2="{rx + 56:.0f}" y2="{ry - 52:.0f}" stroke="#6A4A30" stroke-width="5"/>'))
    kid(.66, .26, 'grip', -1, 2, 0, 'short')
    kid(.71, .3, 'grip', -1, 0, 3, 'short')
    (a, b), (c, d) = T(.18, .7), T(.55, .7)                                                                   # 画了一半的线
    p.append(f'<line x1="{a:.0f}" y1="{b:.0f}" x2="{c:.0f}" y2="{d:.0f}" stroke="#FFFFFF" stroke-width="4"/>')
    lx, ly, ls = kid(.58, .74, 'walk', 1, 1, 2, 'bob')
    p.append(outlined(f'<path d="M{lx + 30:.0f} {ly - 110:.0f} l22 0 l-3 26 l-16 0Z" fill="#E8E8E0"/>'))
    x1, y1, s1 = kid(.8, .9, 'hold', 1, 0, 0, 'short')                                                       # 抬球筐
    x2, y2, s2 = kid(.95, .9, 'hold', -1, 3, 3, 'pony')
    p.append(outlined(f'<line x1="{x1 + 40*s1:.0f}" y1="{y1 - 248*s1:.0f}" x2="{x2 - 40*s2:.0f}" y2="{y2 - 248*s2:.0f}" stroke="#8A6A3A" stroke-width="5"/><path d="M{(x1 + x2) / 2 - 30:.0f} {y1 - 244*s1:.0f} l60 0 l-8 44 l-44 0Z" fill="#C8A060"/>'))
    for i in range(6):
        p.append(f'<circle cx="{(x1 + x2) / 2 - 18 + (i % 3) * 18:.0f}" cy="{y1 - 248*s1 + 8 - (i // 3) * 10:.0f}" r="7" fill="#C6EA3D" stroke="{INK}" stroke-width="1.4"/>')
    p.append(f'<text x="540" y="86" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="30" letter-spacing="12" fill="{INK}">劳 动 课</text>')
    lesson(p, '十三', '劳动课', ['打球之前，先把场地弄干净。', '扫落叶，压场地，画白线，把球捡回筐里。'])
    finish(p)
    return page(''.join(p))
