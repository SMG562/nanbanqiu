from lib import *
from people import person
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish, lesson, schoolyard

META = dict(
    id=181, slug='textbook-pe', title='体育课', lines=['好好打球，', '天天向上。'],
    style=['课本插画', '年代感', '远景', '南伴绿'], tone='浅色', demo=False,
    concept='六七十年代课本插画的画法，高机位远景：从教学楼上往下看——远处教学楼和一排白杨；中间一块被围网围住的南伴绿网球场，远端围网上挂着八块红色标语牌「好好打球　天天向上」；场上几个白衬衫蓝裤子的孩子在上体育课，老师站在网边吹哨，场边长凳上坐着等轮换的同学',
    use='年代感 / 回忆共鸣；开学季、节日、社群活动',
)


def svg():
    r = random.Random(181)
    p = [f'<defs>{DEFS}</defs>', f'<rect width="1080" height="1350" fill="{PAPER}"/>']
    T = schoolyard(p, r, 'summer')
    def kid(u, v, pose, f, sk=0, hr=0, hs='short', rk=None, s=1.0, top='#FFFFFF', bot=BLUE):
        x, y = T(u, v)
        sc = (.28 + .2 * v) * s
        p.append(outlined(person(x, y, sc, pose, f, sk, hr, top, bot, shoe='#FFFFFF', sleeve='short', hairstyle=hs, racket_hand=rk)))
    kid(.3, .9, 'five', 1, 0, 0, 'short', 'fh')
    kid(.62, .2, 'hold', -1, 1, 0, 'pony', 'fh')
    kid(.36, .24, 'teach', 1, 0, 1, 'short', 'fh')
    kid(.72, .82, 'hold', -1, 2, 2, 'pony', 'fh')
    kid(.97, .52, 'hold', -1, 0, 0, 'short', None, 1.0, '#F2EADA', '#6A6A6A')               # 老师在网边
    bx, by = T(.31, .72)
    p.append(f'<circle cx="{bx:.0f}" cy="{by - 104:.0f}" r="9" fill="#C6EA3D" stroke="{INK}" stroke-width="2"/>')
    # 场外长凳上的同学
    p.append(outlined('<rect x="60" y="1036" width="170" height="12" fill="#B8864A"/><rect x="70" y="1048" width="8" height="30" fill="#8A5A3A"/><rect x="212" y="1048" width="8" height="30" fill="#8A5A3A"/>'))
    for i, x in enumerate((90, 135, 180)):
        p.append(outlined(person(x, 1076, .42, 'drink', 1, i % 3, i % 2, '#FFFFFF', BLUE, shoe='#FFFFFF', sleeve='short', hairstyle=['short', 'pony', 'short'][i])))
    p.append(f'<text x="540" y="86" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="30" letter-spacing="12" fill="{INK}">体 育 课</text>')
    lesson(p, '十二', '体育课', ['下午第三节是体育课。老师说：今天打网球。', '小林发球，小芳在网前，大家轮流上场。'])
    finish(p)
    return page(''.join(p))
