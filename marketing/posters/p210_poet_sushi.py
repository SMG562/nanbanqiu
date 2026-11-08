from lib import *
from poet import scholar, vtext, seal, footer, DAI

META = dict(
    id=210, slug='poet-sushi', title='一蓑烟雨任平生', lines=['一蓑烟雨任平生'],
    style=['古风', '诗人', '雨', '现代版式'], tone='亮色', demo=False,
    concept='苏轼《定风波》：竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。烟雨里的远山只剩几层淡青，下半截是一整块被雨打湿的南伴绿球场，白线一路收向远处；场中一个戴斗笠、披蓑衣的小人扛着拍往前走，湿地上映着他的倒影，雨丝斜斜地下。',
    use='诗人打球系列 · 苏轼；雨天照打 / 坚持主题',
)


def svg():
    r = random.Random(210)
    p = ['<defs><linearGradient id="sky210" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D6E8E2"/><stop offset="1" stop-color="#A8CFC2"/></linearGradient>'
         '<linearGradient id="ct210" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FA982"/><stop offset="1" stop-color="#1F7A58"/></linearGradient>'
         '<filter id="mist210"><feGaussianBlur stdDeviation="6"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#sky210)"/>']
    for pts, c, op in [('0 640 L160 520 L300 600 L470 470 L640 590 L820 500 L1080 610 V760 H0Z', '#8FBFAE', .7),
                       ('0 700 L220 600 L420 690 L640 610 L860 690 L1080 640 V760 H0Z', '#6FA894', .75)]:
        p.append(f'<path d="M{pts}" fill="{c}" opacity="{op}" filter="url(#mist210)"/>')
    p.append('<rect y="690" width="1080" height="80" fill="#D6E8E2" opacity=".55" filter="url(#mist210)"/>')
    # 湿球场：透视
    p.append('<path d="M0 760 H1080 V1350 H0Z" fill="url(#ct210)"/>')
    L = lambda y: (600 + (380 - 600) * (y - 800) / 550, 960 + (1500 - 960) * (y - 800) / 550)   # 左右边线在 y 处的 x
    ln = ''
    for y in (800, 960):
        x0, x1 = L(y); ln += f'<path d="M{x0:.0f} {y} H{x1:.0f}"/>'
    ln += f'<path d="M600 800 L380 1350 M960 800 L1500 1350 M{(L(960)[0] + L(960)[1]) / 2:.0f} 960 L{(L(1180)[0] + L(1180)[1]) / 2:.0f} 1180"/>'
    ln += f'<path d="M{L(1180)[0]:.0f} 1180 H{L(1180)[1]:.0f}" stroke-width="7"/>'
    p.append(f'<path d="M600 800 L960 800 L1500 1350 L380 1350Z" fill="#FFFFFF" opacity=".06"/>')
    p.append(f'<g stroke="#E8F4EC" stroke-width="5" fill="none" opacity=".85">{ln}</g>')
    for _ in range(26):                                                                                       # 积水反光
        x, y = r.uniform(0, 1080), r.uniform(790, 1200)
        w = r.uniform(40, 160) * (y - 640) / 500
        p.append(f'<path d="M{x:.0f} {y:.0f} h{w:.0f}" stroke="#FFFFFF" stroke-width="2" opacity=".3"/>')
    for _ in range(18):                                                                                       # 雨点涟漪
        x, y = r.uniform(300, 1060), r.uniform(800, 1220)
        k = (y - 640) / 500
        p.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{14 * k:.0f}" ry="{4 * k:.0f}" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity=".45"/>')
    # 人 + 倒影
    fig = scholar(780, 1060, 1.35, robe='#C9A46A', sash='#7A5A2E', flip=1, arm='down', wind=.4, hat='douli')
    p.append(f'<g transform="translate(0 2120) scale(1 -1)" opacity=".28">{fig}</g>')
    p.append(fig)
    # 雨丝
    rain = ''.join(f'<path d="M{x:.0f} {y:.0f} l-14 46" />' for x, y in [(r.uniform(0, 1120), r.uniform(-20, 1300)) for _ in range(170)])
    p.append(f'<g stroke="#FFFFFF" stroke-width="1.6" opacity=".55">{rain}</g>')
    # 字
    p.append(vtext('一蓑烟雨任平生', 150, 180, 86, DAI, 1.12, 700))
    p.append(vtext('竹杖芒鞋轻胜马', 256, 196, 30, '#3E5E58', 1.5, 500))
    p.append(f'<text x="256" y="{196 + 7 * 45 + 14}" text-anchor="middle" font-family="{SERIF}" font-weight="700" font-size="34" fill="#C23A2B">谁</text>'
             f'<text x="256" y="{196 + 8 * 45 + 18}" text-anchor="middle" font-family="{SERIF}" font-weight="700" font-size="34" fill="#C23A2B">怕</text>')
    p.append(seal(127, 900, 46, '南伴'))
    footer(p, '下雨也去，谁怕？', '诗人打球 · 肆 / 苏轼《定风波》', 'RAIN OR SHINE, I PLAY')
    return page(''.join(p))
