from lib import *
from xia import DEFS, hero, brush_v, qi
from poet import vtext, seal, footer

META = dict(
    id=219, slug='xia-bamboo', title='以球会友', lines=['以球会友'],
    style=['侠气', '竹林', '对决', '现代版式'], tone='亮色', demo=False,
    concept='竹林里的一块空地，两个侠客隔着几步远对峙，一颗网球拖着一道剑气似的光带从左边的拍子飞向右边；光带划过一片落下的竹叶，竹叶断成两半。满屏竖向的竹竿是南伴绿的层次，左上留一片雾白放字。约球就是切磋：点到为止。',
    use='侠气系列 · 贰；约球 / 找对手 / 同水平切磋',
)


def stalk(x, w, c, node, top=-40, bot=1350):
    o = f'<rect x="{x - w / 2:.0f}" y="{top}" width="{w:.0f}" height="{bot - top}" fill="{c}"/>'
    o += f'<rect x="{x - w / 2 + w * .18:.0f}" y="{top}" width="{w * .14:.1f}" height="{bot - top}" fill="#FFFFFF" opacity=".12"/>'
    y = top + 60
    while y < bot:
        o += f'<rect x="{x - w / 2 - 1:.0f}" y="{y:.0f}" width="{w + 2:.0f}" height="{max(3, w * .12):.0f}" fill="{node}"/>'
        y += 150 + (x * 7) % 60
    return o


def leaf(x, y, l, rot, c):
    return f'<path transform="translate({x} {y}) rotate({rot})" d="M0 0 Q{l * .5:.0f} {-l * .16:.0f} {l} 0 Q{l * .5:.0f} {l * .16:.0f} 0 0Z" fill="{c}"/>'


def svg():
    r = random.Random(219)
    p = [f'<defs>{DEFS}<linearGradient id="mist219" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1F7EE"/><stop offset=".55" stop-color="#CFE8D6"/><stop offset="1" stop-color="#8ECFA8"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#mist219)"/>']
    # 远竹：浅、细
    for x in range(380, 1100, 46):
        p.append(stalk(x + r.uniform(-10, 10), r.uniform(10, 16), '#A8DCBC', '#8ECFA8'))
    # 中竹
    for x in [430, 560, 700, 790, 940, 1040]:
        p.append(stalk(x + r.uniform(-14, 14), r.uniform(18, 26), '#4DB27F', '#3FA474'))
    # 竹叶团（上方）
    for _ in range(120):
        x, y = r.uniform(380, 1100), r.uniform(-20, 300)
        p.append(leaf(round(x), round(y), r.uniform(40, 80), r.uniform(100, 160), r.choice(['#2F9A6A', '#3FA474', '#1F7A52', '#6CC597'])))
    # 空地
    p.append('<ellipse cx="640" cy="1110" rx="620" ry="120" fill="#2F8A6E"/><ellipse cx="640" cy="1100" rx="520" ry="80" fill="#3FA474" opacity=".6"/>')
    # 两个侠客 + 剑气
    p.append(hero(480, 1090, 1.25, robe='#F3EEE0', cape='#1E4E62', flip=1, wind=.8, hat=None, back=False, arm='up'))
    p.append(qi([(524, 884), (600, 690), (720, 690), (816, 812)], 22, 'url(#qi)'))
    p.append('<circle cx="816" cy="812" r="16" fill="#DDF35A"/><path d="M806 802 q10 10 2 22 M826 800 q-10 12 -2 24" stroke="#FFFFFF" stroke-width="2.4" fill="none"/>')
    p.append(hero(900, 1100, 1.35, robe='#2B3A3A', cape='#C23A2B', flip=-1, wind=.9, hat='douli', back=False, arm='down'))
    # 被剑气切开的竹叶 + 落叶
    p.append(leaf(612, 676, 64, 160, '#2F9A6A') + leaf(588, 700, 50, 200, '#2F9A6A'))
    p.append('<path d="M570 696 L604 680" stroke="#FFFFFF" stroke-width="2" opacity=".8"/>')
    for _ in range(14):
        p.append(leaf(round(r.uniform(400, 1060)), round(r.uniform(340, 1000)), r.uniform(30, 50), r.uniform(0, 360), r.choice(['#3FA474', '#6CC597'])))
    # 近竹：深、粗，压两边
    p.append(stalk(1050, 60, '#176B4D', '#0E5139'))
    p.append(stalk(345, 30, '#1F7A52', '#14603F', top=260))
    p.append('<path d="M0 1196 Q300 1176 620 1194 T1080 1188 V1350 H0Z" fill="#0E5139"/>')
    p.append(brush_v('以球会友', 150, 210, 118, '#1E2A22', 1.06, 5))
    p.append(vtext('切磋点到为止', 256, 224, 30, '#3E5E4E', 1.5, 500))
    p.append(seal(236, 540, 40, '南伴'))
    footer(p, '来，过两招。', '侠气 · 贰 / 竹林', 'A FRIENDLY DUEL, NOTHING MORE')
    return page(''.join(p))
