from lib import *
from lin import blob
from people import person
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish, lesson, schoolyard, falling

META = dict(
    id=185, slug='textbook-winter', title='下雪了', lines=['下雪了，', '大家一起把球场扫干净。'],
    style=['课本插画', '年代感', '远景', '冬天'], tone='浅色', demo=False,
    concept='课本插画、高机位远景，冬天：树枝光秃秃挂着雪，标语牌顶上积了一层白；球场远半边还盖着雪，近半边已经扫出了南伴绿；穿红蓝棉袄的孩子们推着雪铲、拿着扫帚，一串脚印穿过雪地；角落里堆了个雪人，手里拿着一支球拍',
    use='冬天 / 一起出力；年代感、回忆共鸣、好笑',
)


def svg():
    r = random.Random(185)
    p = [f'<defs>{DEFS}</defs>', f'<rect width="1080" height="1350" fill="{PAPER}"/>']
    T = schoolyard(p, r, 'winter')
    snow = ' '.join(f'{a:.0f},{b:.0f}' for a, b in [T(0, 0), T(1, 0), T(1, .58), T(.8, .62), T(.6, .56), T(.4, .63), T(.2, .57), T(0, .6)])
    p.append(f'<polygon points="{snow}" fill="#F8FAF8"/>')                                                    # 远半边还盖着雪
    p.append(f'<polygon points="{snow}" fill="url(#dots_t)" opacity=".06"/>')
    (a, b), (c, d) = T(.06, .5), T(.94, .5)
    p.append(f'<line x1="{a:.0f}" y1="{b:.0f}" x2="{c:.0f}" y2="{d:.0f}" stroke="#FFFFFF" stroke-width="9"/>')
    for k in range(14):                                                                                        # 雪地上的一串脚印
        x, y = T(.3 + k * .012, .08 + k * .035)
        p.append(f'<ellipse cx="{x + (5 if k % 2 else -5):.0f}" cy="{y:.0f}" rx="4" ry="2.4" fill="#C8D0D4"/>')
    kids = [(.22, .66, 'grip', 1, 0, 1, '#C8402E', 'short'), (.44, .7, 'teach', 1, 2, 0, '#3E5E9A', 'pony'),
            (.66, .68, 'grip', -1, 1, 2, '#2F6E4E', 'short'), (.8, .86, 'hold', -1, 3, 3, '#C8402E', 'bob')]
    for u, v, pose, f, sk, hr, coat, hs in kids:
        x, y = T(u, v)
        sc = .28 + .2 * v
        p.append(outlined(person(x, y, sc, pose, f, sk, hr, coat, '#2A3A4A', shoe='#2A2622', sleeve='long', hairstyle=hs)))
        if pose == 'grip':                                                                                     # 雪铲
            p.append(outlined(f'<line x1="{x + 50*sc*f:.0f}" y1="{y - 210*sc:.0f}" x2="{x + 110*sc*f:.0f}" y2="{y - 4:.0f}" stroke="#8A6A3A" stroke-width="4"/><path d="M{x + 90*sc*f:.0f} {y:.0f} l{50*f} 0 l{-4*f} -16 l{-42*f} 0Z" fill="#9AA0A4"/>'))
        if pose == 'teach':                                                                                    # 扫帚
            p.append(outlined(f'<line x1="{x + 60*sc:.0f}" y1="{y - 210*sc:.0f}" x2="{x + 95*sc:.0f}" y2="{y - 6:.0f}" stroke="#8A6A3A" stroke-width="4"/><path d="M{x + 80*sc:.0f} {y - 10:.0f} l40 8 l-6 12 l-40 -8Z" fill="#D8B060"/>'))
    sx, sy = 140, 1050                                                                                         # 雪人拿着球拍
    p.append(outlined(f'<circle cx="{sx}" cy="{sy - 40}" r="40" fill="#FFFFFF"/><circle cx="{sx}" cy="{sy - 104}" r="28" fill="#FFFFFF"/>'
                      f'<rect x="{sx - 26}" y="{sy - 140}" width="52" height="10" fill="{RED}"/><rect x="{sx - 16}" y="{sy - 166}" width="32" height="28" fill="{RED}"/>'
                      f'<line x1="{sx + 30}" y1="{sy - 60}" x2="{sx + 70}" y2="{sy - 110}" stroke="#6A4A30" stroke-width="4"/><line x1="{sx + 70}" y1="{sy - 110}" x2="{sx + 84}" y2="{sy - 140}" stroke="#2E3438" stroke-width="4"/>'
                      f'<ellipse cx="{sx + 92}" cy="{sy - 162}" rx="15" ry="22" transform="rotate(20 {sx + 92} {sy - 162})" fill="none" stroke="#2E3438" stroke-width="4"/>'))
    p.append(f'<circle cx="{sx - 10}" cy="{sy - 108}" r="3" fill="{INK}"/><circle cx="{sx + 10}" cy="{sy - 108}" r="3" fill="{INK}"/><path d="M{sx} {sy - 100} l12 4 l-12 2Z" fill="#E8843A"/>')
    p.append(f'<circle cx="{sx}" cy="{sy - 40}" r="9" fill="#C6EA3D" stroke="{INK}" stroke-width="1.6"/>')
    falling(p, r, 'winter', 90)
    p.append(f'<text x="540" y="86" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="30" letter-spacing="12" fill="{INK}">下 雪 了</text>')
    lesson(p, '二十', '下雪了', ['下雪了。大家一起把球场上的雪扫干净，', '雪人也拿起了球拍。'])
    finish(p)
    return page(''.join(p))
