from lib import *
from people import person
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish, lesson, schoolyard, falling

META = dict(
    id=184, slug='textbook-spring', title='春天', lines=['开学了，', '操场边的桃花开了。'],
    style=['课本插画', '年代感', '远景', '春天'], tone='浅色', demo=False,
    concept='课本插画、高机位远景，春天：教学楼前的一排树开满粉白的花，花瓣飘进球场；开学第一节体育课，老师站在前面领操，孩子们在网前排成两排伸展手臂；围网上还是那八块红牌子',
    use='开学季 / 春天的第一场球；年代感、回忆共鸣',
)


def svg():
    r = random.Random(184)
    p = [f'<defs>{DEFS}</defs>', f'<rect width="1080" height="1350" fill="{PAPER}"/>']
    T = schoolyard(p, r, 'spring')
    for row, v in enumerate((.72, .9)):                                                                       # 两排孩子伸展
        for k in range(5):
            u = .26 + k * .12
            x, y = T(u, v)
            sc = (.28 + .2 * v)
            p.append(outlined(person(x, y, sc, 'five', 1 if k % 2 else -1, (k + row) % 4, (k * 3 + row) % 4, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle=['short', 'pony', 'bob', 'short'][(k + row) % 4])))
    x, y = T(.5, .58)                                                                                          # 领操的老师（面朝孩子）
    p.append(outlined(person(x, y, .34, 'five', -1, 0, 0, '#F2EADA', '#6A6A6A', shoe='#2A2622', sleeve='long', hairstyle='short')))
    bx, by = T(.86, .92)
    p.append(f'<path d="M{bx - 24:.0f} {by - 30:.0f} l48 0 l-6 30 l-36 0Z" fill="#C8A060" stroke="{INK}" stroke-width="2"/>')    # 场边一筐球
    for i in range(5):
        p.append(f'<circle cx="{bx - 14 + (i % 3) * 14:.0f}" cy="{by - 34 - (i // 3) * 10:.0f}" r="7" fill="#C6EA3D" stroke="{INK}" stroke-width="1.4"/>')
    falling(p, r, 'spring', 50)
    p.append(f'<text x="540" y="86" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="30" letter-spacing="12" fill="{INK}">春　天</text>')
    lesson(p, '一', '春天', ['开学了，操场边的桃花开了。', '第一节体育课，先做操，再打球。'])
    finish(p)
    return page(''.join(p))
