from lib import *
from poet import sit, racket_lean, vtext, seal, footer, DAI

META = dict(
    id=211, slug='poet-wangwei', title='坐看云起时', lines=['行到水穷处', '坐看云起时'],
    style=['古风', '诗人', '祥云', '现代版式'], tone='亮色', demo=False,
    concept='王维《终南别业》：行到水穷处，坐看云起时。崖顶一条小溪流到崖边就没了，打完球的人在溪尽头坐下，拍子靠在一旁；对面整个山谷涌满云海，几座南伴绿的山峰从云里冒出来。云海用一串串半圆的云纹一层层叠出来——古人的纹样，现代的平涂。',
    use='诗人打球系列 · 王维；打完球歇一歇 / 慢生活主题',
)


def band(y, r0, color, shade, x0=-80, x1=1160, seed=0):
    """一层云海：上沿是一串大小不一的半圆（云纹），下面平铺到底。"""
    rr = random.Random(seed)
    d, x = f'M{x0} 1400 L{x0} {y}', x0
    while x < x1:
        rad = r0 * rr.uniform(.7, 1.25)
        d += f' A{rad:.0f} {rad:.0f} 0 0 1 {x + 2 * rad:.0f} {y}'
        x += 2 * rad
    d += f' L{x:.0f} 1400Z'
    return f'<path d="{d}" fill="{shade}" transform="translate(0 10)"/><path d="{d}" fill="{color}"/>'


def curl(x, y, s, c='#FFFFFF'):
    """往上卷的一缕祥云尾巴。"""
    return f'<path transform="translate({x} {y}) scale({s})" d="M0 0 Q-10 -60 30 -80 Q66 -94 70 -60 Q72 -36 48 -38 Q32 -40 36 -56" stroke="{c}" stroke-width="16" fill="none" stroke-linecap="round"/>'


def svg():
    p = ['<defs><linearGradient id="sky211" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CC4E6"/><stop offset=".7" stop-color="#CBEBF3"/><stop offset="1" stop-color="#E8F7F2"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sky211)"/>']
    # 云海里冒出来的山峰（后浅前深，圆头）
    def peak(x, top, w, c1, c2):
        return (f'<path d="M{x - w} 900 Q{x - w * .35:.0f} {top + 90} {x - 18} {top + 8} Q{x} {top - 6} {x + 18} {top + 8} Q{x + w * .4:.0f} {top + 120} {x + w} 900Z" fill="{c1}"/>'
                f'<path d="M{x + 8} {top + 2} Q{x + 22} {top + 14} {x + 30} {top + 40} Q{x + w * .45:.0f} {top + 160} {x + w} 900 L{x + w * .3:.0f} 900 Q{x + 30} {top + 200} {x + 8} {top + 2}Z" fill="{c2}"/>')
    p.append(peak(980, 470, 200, '#8ED9B0', '#6CC597'))
    p.append(peak(560, 520, 180, '#6CC597', '#4DB27F'))
    p.append(peak(800, 400, 230, '#3FA474', '#2A8A5E'))
    p.append(curl(470, 700, 1.1))
    p.append(curl(1000, 680, .9))
    for y, r0, c, sh, sd in [(720, 34, '#FFFFFF', '#BFDCD2', 1), (830, 48, '#E4F3EC', '#B5D6CB', 2), (960, 62, '#FFFFFF', '#BFDCD2', 3), (1100, 76, '#E8F5EF', '#B5D6CB', 4)]:
        p.append(band(y, r0, c, sh, -80, 1160, sd))
    # 近处石崖（左），溪水流到崖边就没了
    p.append('<path d="M0 760 L250 750 Q330 748 350 800 L390 1000 Q400 1080 360 1350 H0Z" fill="#176B4D"/>')
    p.append('<path d="M330 760 Q352 770 360 810 L398 1000 L372 1010 L338 800Z" fill="#0E5139"/>')
    p.append('<path d="M0 790 Q120 800 200 776 Q260 760 330 768" stroke="#A9DDF0" stroke-width="10" fill="none" stroke-linecap="round"/>'
             '<path d="M334 770 Q350 800 352 840" stroke="#A9DDF0" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>')
    p.append(sit(232, 756, 1.25, robe='#F3EEE0', sash='#2F8A6E', flip=1))
    p.append(racket_lean(176, 760, 1.15, -16))
    p.append('<path d="M0 1196 Q300 1170 620 1192 T1080 1184 V1350 H0Z" fill="#176B4D"/>')
    # 字
    p.append(vtext('坐看云起时', 150, 180, 100, DAI, 1.12, 700))
    p.append(vtext('行到水穷处', 256, 196, 30, '#2E5466', 1.5, 500))
    p.append(seal(236, 450, 40, '南伴'))
    footer(p, '打累了，就坐下看云', '诗人打球 · 伍 / 王维《终南别业》', 'SIT AND WATCH THE CLOUDS RISE')
    return page(''.join(p))
