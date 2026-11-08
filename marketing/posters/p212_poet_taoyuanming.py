from lib import *
from poet import scholar, vtext, seal, footer, DAI, ZHU

META = dict(
    id=212, slug='poet-taoyuanming', title='悠然见南山', lines=['悠然见南山'],
    style=['古风', '诗人', '现代版式', '南伴绿'], tone='亮色', demo=False,
    concept='陶渊明《饮酒》：采菊东篱下，悠然见南山。缃色的秋天，前景一道竹篱、一丛丛黄菊；篱后一个人提着拍，抬头望山——那座南山画成一个大大的绿色半球，一道白色的弧线划过山脊，就是网球的缝。山气日夕佳，飞鸟相与还：一轮朱红小日，一行雁。现代的一句：悠然见南伴。',
    use='诗人打球系列 · 陶渊明；秋季 / 品牌名谐音',
)


def ju(cx, cy, r, c, c2):
    """平面菊：两圈细长花瓣 + 小花心。"""
    o = ''
    for k, (n, f, col) in enumerate([(22, 1.0, c2), (16, .72, c)]):
        for i in range(n):
            a = i * 360 / n + k * 7
            o += f'<ellipse cx="{cx}" cy="{cy - r * f * .55:.1f}" rx="{r * .09:.1f}" ry="{r * f * .5:.1f}" fill="{col}" transform="rotate({a:.0f} {cx} {cy})"/>'
    return o + f'<circle cx="{cx}" cy="{cy}" r="{r * .18:.1f}" fill="#B9781E"/>'


def svg():
    r = random.Random(212)
    p = ['<defs><linearGradient id="sky212" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF0D4"/><stop offset="1" stop-color="#F3DDAE"/></linearGradient>'
         '<linearGradient id="hill212" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FA474"/><stop offset="1" stop-color="#176B4D"/></linearGradient>'
         '<clipPath id="hc212"><circle cx="680" cy="1060" r="540"/></clipPath></defs>',
         '<rect width="1080" height="1350" fill="url(#sky212)"/>']
    p.append(f'<circle cx="900" cy="250" r="44" fill="{ZHU}" opacity=".9"/>')
    for x, y, s in [(560, 300, 1), (610, 270, .9), (660, 240, .8), (700, 280, .75), (745, 250, .7)]:
        p.append(f'<path d="M{x - 14 * s:.0f} {y - 5 * s:.0f} Q{x - 6 * s:.0f} {y - 9 * s:.0f} {x} {y} Q{x + 6 * s:.0f} {y - 9 * s:.0f} {x + 14 * s:.0f} {y - 5 * s:.0f}" stroke="{DAI}" stroke-width="2.4" fill="none"/>')
    # 南山 = 一颗大网球
    p.append('<circle cx="680" cy="1060" r="540" fill="url(#hill212)"/>')
    p.append('<g clip-path="url(#hc212)" fill="none" stroke="#F4EED8" stroke-width="14" stroke-linecap="round" opacity=".9"><path d="M300 620 Q620 760 520 1200"/><path d="M1000 560 Q840 860 1240 1000"/></g>')
    p.append('<g clip-path="url(#hc212)" opacity=".18">' + ''.join(f'<path d="M{x:.0f} {y:.0f} q30 -12 60 0" stroke="#FFFFFF" stroke-width="3" fill="none"/>' for x, y in [(r.uniform(200, 1080), r.uniform(560, 1000)) for _ in range(26)]) + '</g>')
    # 地面
    p.append('<path d="M0 1040 Q300 1010 620 1040 T1080 1030 V1350 H0Z" fill="#2F8A6E"/>')
    # 篱后的人
    p.append(scholar(330, 1060, 1.3, robe='#F3EEE0', sash='#C23A2B', flip=1, arm='down', wind=.4))
    # 东篱：竹竿 + 横杆
    for i, x in enumerate(range(-10, 1100, 46)):
        h = 150 + (i % 3) * 18
        p.append(f'<rect x="{x}" y="{1180 - h}" width="22" height="{h + 20}" rx="10" fill="#D4AE6E"/><rect x="{x + 4}" y="{1180 - h}" width="5" height="{h + 20}" fill="#E9CB92"/>'
                 f'<path d="M{x} {1180 - h * .55:.0f} h22 M{x} {1180 - h * .2:.0f} h22" stroke="#A9823E" stroke-width="3"/>')
    p.append('<rect x="-10" y="1070" width="1100" height="14" rx="7" fill="#B88F4E"/><rect x="-10" y="1130" width="1100" height="14" rx="7" fill="#B88F4E"/>')
    # 菊丛
    for _ in range(60):
        x, y = r.uniform(-30, 1110), r.uniform(1070, 1180)
        p.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r.uniform(20, 36):.0f}" ry="10" transform="rotate({r.uniform(-60, 60):.0f} {x:.0f} {y:.0f})" fill="{r.choice(["#2F8A6E", "#3FA474", "#1F7A58"])}"/>')
    for x, y, rr, c, c2 in [(40, 1110, 34, '#F2C23A', '#E8A21E'), (130, 1150, 28, '#FFFFFF', '#EDE6D3'), (520, 1100, 36, '#F2C23A', '#E8A21E'),
                            (610, 1150, 30, '#F59A3A', '#E07A1E'), (700, 1095, 30, '#F2C23A', '#E8A21E'), (820, 1140, 36, '#FFFFFF', '#EDE6D3'),
                            (920, 1100, 32, '#F2C23A', '#E8A21E'), (1020, 1150, 34, '#F59A3A', '#E07A1E'), (430, 1160, 26, '#F2C23A', '#E8A21E')]:
        p.append(ju(x, y, rr, c, c2))
    p.append('<path d="M0 1196 Q300 1176 620 1194 T1080 1188 V1350 H0Z" fill="#176B4D"/>')
    # 字
    p.append(vtext('悠然见南山', 150, 180, 104, DAI, 1.12, 700))
    p.append(vtext('采菊东篱下', 256, 196, 30, '#6A4E36', 1.5, 500))
    p.append(seal(236, 450, 40, '南伴'))
    footer(p, '悠然见南伴', '诗人打球 · 陆 / 陶渊明《饮酒》', 'SEEING THE SOUTH HILL, AT EASE')
    return page(''.join(p))
