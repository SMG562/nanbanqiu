from lib import *
from poet import scholar, vtext, seal, latin, egret, DAI

META = dict(
    id=209, slug='poet-dufu', title='两个黄鹂鸣翠柳', lines=['两个黄鹂鸣翠柳'],
    style=['古风', '诗人', '现代版式', '南伴绿'], tone='亮色', demo=False,
    concept='杜甫《绝句》：两个黄鹂鸣翠柳，一行白鹭上青天。满屏垂下来的柳丝是南伴绿的细线，两颗黄绿网球停在柳丝间，就是那两个黄鹂；一行白鹭斜着飞上青天。柳下草岸上，一个青袍小人提着拍仰头看——两个人，就能开一局。',
    use='诗人打球系列 · 杜甫；春季 / 双打搭子主题',
)


def strand(x0, y0, length, sway, r, greens):
    """一根柳丝：二次曲线 + 沿线两侧的小叶。"""
    x1, y1 = x0 + sway, y0 + length
    cx, cy = x0 + sway * .2, y0 + length * .6
    c = r.choice(greens)
    o = [f'<path d="M{x0:.0f} {y0:.0f} Q{cx:.0f} {cy:.0f} {x1:.0f} {y1:.0f}" stroke="{c}" stroke-width="1.6" fill="none"/>']
    n = int(length / 15)
    for i in range(2, n):
        t = i / n
        px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1
        py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1
        side = 1 if i % 2 else -1
        sz = 9 * (1 - t * .5)
        o.append(f'<ellipse cx="{px + side * sz * .55:.1f}" cy="{py:.1f}" rx="{sz * .32:.1f}" ry="{sz:.1f}" transform="rotate({side * 28} {px + side * sz * .55:.1f} {py:.1f})" fill="{c}"/>')
    return ''.join(o)


def bird_ball(cx, cy, r):
    return (f'<circle cx="{cx + 3}" cy="{cy + 5}" r="{r}" fill="#0B3B2A" opacity=".18"/><circle cx="{cx}" cy="{cy}" r="{r}" fill="#DDF04A"/>'
            f'<path d="M{cx - r * .9:.1f} {cy - r * .35:.1f} Q{cx - r * .15:.1f} {cy:.1f} {cx - r * .45:.1f} {cy + r * .85:.1f} M{cx + r * .45:.1f} {cy - r * .85:.1f} Q{cx + r * .15:.1f} {cy:.1f} {cx + r * .9:.1f} {cy + r * .35:.1f}" stroke="#FFFFFF" stroke-width="{r * .1:.1f}" fill="none"/>')


def svg():
    r = random.Random(209)
    p = ['<defs><linearGradient id="sky209" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FBFE6"/><stop offset=".7" stop-color="#BFE5F2"/><stop offset="1" stop-color="#E6F5EC"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sky209)"/>']
    # 柳枝 + 柳丝（右边三分之二）
    p.append('<path d="M1100 30 Q900 70 720 50 Q560 36 430 80" stroke="#4A3A2A" stroke-width="12" fill="none" stroke-linecap="round"/>'
             '<path d="M880 62 Q840 110 780 120" stroke="#4A3A2A" stroke-width="6" fill="none" stroke-linecap="round"/>')
    greens = ['#2FA36B', '#3FA474', '#1F8A5A', '#6CC597', '#176B4D', '#8ED9A8']
    for i in range(52):
        t = i / 51
        x0 = 440 + t * 660 + r.uniform(-12, 12)
        y0 = 70 - t * 20 + r.uniform(-6, 10)
        length = r.uniform(300, 980) if not (560 < x0 < 760) else r.uniform(200, 420)
        p.append(strand(x0, y0, length, r.uniform(-60, 20), r, greens))
    p.append(bird_ball(640, 470, 30))
    p.append(bird_ball(860, 560, 26))
    # 一行白鹭上青天：从左下往右上
    for i, (x, y, s) in enumerate([(350, 900, .55), (400, 835, .6), (452, 770, .64), (505, 705, .68), (560, 640, .72), (612, 575, .76)]):
        p.append(egret(x + r.uniform(-8, 8), y + r.uniform(-8, 8), s, -34 + r.uniform(-6, 6)))
    # 草岸 + 小人
    p.append('<path d="M0 1130 Q300 1090 620 1120 T1080 1100 V1350 H0Z" fill="#3FA474"/><path d="M0 1190 Q360 1160 700 1190 T1080 1180 V1350 H0Z" fill="#176B4D"/>')
    p.append('<path d="M560 1190 L1080 1170" stroke="#FFFFFF" stroke-width="4" opacity=".75"/>')
    p.append(scholar(790, 1150, 1.15, robe='#DDEBEE', sash='#1E4E62', flip=-1, arm='down', wind=.6))
    # 字
    p.append(vtext('两个黄鹂鸣翠柳', 150, 190, 96, DAI, 1.12, 700))
    p.append(vtext('一行白鹭上青天', 258, 204, 30, '#2E5466', 1.5, 500))
    p.append(seal(127, 965, 46, '南伴'))
    p.append(f'<text x="64" y="1262" font-family="{SERIF}" font-weight="600" font-size="38" letter-spacing="6" fill="#FFFFFF">两个人，就能开一局</text>')
    p.append(latin('诗人打球 · 叁 / 杜甫《绝句》', 66, 1300, '#BFE6CF', 18, ls=3))
    p.append(latin('TWO ORIOLES, ONE RALLY', 66, 1328, '#9FD3B8', 12, ls=5))
    p.append(f'<g transform="translate(1030 1300)"><circle cx="-158" cy="-8" r="9" fill="#C6EA3D"/><circle cx="-142" cy="2" r="6" fill="#C6EA3D" stroke="#0B3B2A" stroke-width="2"/>'
             f'<text x="0" y="6" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="28" letter-spacing="8" fill="#FFFFFF">南伴球</text></g>')
    return page(''.join(p))
