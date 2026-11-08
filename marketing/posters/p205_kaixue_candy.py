from lib import *
from candy import DEFS, bubbly, cloud, ball

META = dict(
    id=205, slug='kaixue-candy', title='好好打球 天天向上（糖果字）', lines=['好好打球', '天天向上'],
    style=['开学季', '糖果字', '童趣', '明亮'], tone='亮色', demo=False,
    concept='开学季横幅的路数改成竖图：天蓝底、泡泡光斑和格子纸，八个颜色各不相同、鼓鼓的糖果字「好好打球 / 天天向上」，上面一行彩色小英文 good good play · day day up；纸飞机拖着虚线飞过，右上两支扎着蝴蝶结的球拍像棒棒糖；下半截是南伴绿的草坡、花丛和藏在花里的网球。',
    use='开学季 / 少儿班招生 / 亲子球局；朋友圈、小红书竖图',
)

DARK = '#2B4A6B'


def plane(x, y, s, rot, line=DARK, fill='#FFFFFF'):
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})" stroke="{line}" stroke-width="3" stroke-linejoin="round" fill="{fill}">'
            '<path d="M0 0 L120 -40 L40 30 Z"/><path d="M40 30 L52 6 L120 -40" fill="#E3EEF7"/><path d="M40 30 L36 52 L52 6"/></g>')


def flower(x, y, r, c, rot=0, center='#FFF6D8'):
    pet = ''.join(f'<ellipse cx="{x}" cy="{y - r * .55:.1f}" rx="{r * .42:.1f}" ry="{r * .58:.1f}" fill="{c}" transform="rotate({rot + k * 72} {x} {y})"/>' for k in range(5))
    return f'<g filter="url(#pcs)">{pet}<circle cx="{x}" cy="{y}" r="{r * .3:.1f}" fill="{center}"/><circle cx="{x}" cy="{y}" r="{r * .14:.1f}" fill="#FFB02E"/></g>'


def blade(x, y, h, lean, c):
    return f'<path d="M{x - 9} {y} Q{x - 4 + lean * .3:.0f} {y - h * .6:.0f} {x + lean} {y - h} Q{x + 6 + lean * .2:.0f} {y - h * .55:.0f} {x + 9} {y} Z" fill="{c}"/>'


def racket(x, y, rot, c1, c2, bow='#FFD23F'):
    lines = ''.join(f'<path d="M{-34 + i * 11} -100 V0" />' for i in range(7)) + ''.join(f'<path d="M-40 {-92 + i * 13} H40"/>' for i in range(7))
    return (f'<g transform="translate({x} {y}) rotate({rot})" filter="url(#pcs)">'
            f'<rect x="-6" y="0" width="12" height="130" rx="6" fill="#F4E4C8" stroke="#C9A97A" stroke-width="2"/>'
            f'<clipPath id="rk{x}"><ellipse cx="0" cy="-48" rx="44" ry="56"/></clipPath>'
            f'<ellipse cx="0" cy="-48" rx="50" ry="62" fill="{c1}"/><ellipse cx="0" cy="-48" rx="44" ry="56" fill="#FFFFFF" opacity=".9"/>'
            f'<g clip-path="url(#rk{x})" stroke="{c2}" stroke-width="2" opacity=".6">{lines}</g>'
            f'<path d="M0 22 q-30 -22 -34 6 q16 10 34 -6 q30 -22 34 6 q-16 10 -34 -6z" fill="{bow}"/><path d="M-4 26 l-14 30 M4 26 l14 30" stroke="{bow}" stroke-width="7" stroke-linecap="round"/></g>')


def svg():
    r = random.Random(205)
    p = [f'<defs>{DEFS}<linearGradient id="sky205" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FD8F7"/><stop offset=".55" stop-color="#D6F0FF"/><stop offset="1" stop-color="#EAF8F0"/></linearGradient>'
         '<radialGradient id="gf205"><stop offset=".55" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
         '<mask id="gm205"><ellipse cx="540" cy="560" rx="470" ry="330" fill="url(#gf205)"/></mask>'
         '<pattern id="grid205" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0 V28 H0" fill="none" stroke="#7FB8E6" stroke-width="1" opacity=".5"/></pattern></defs>',
         '<rect width="1080" height="1350" fill="url(#sky205)"/>',
         '<rect x="60" y="230" width="960" height="660" fill="#EAF6FF" opacity=".8" mask="url(#gm205)"/><rect x="60" y="230" width="960" height="660" fill="url(#grid205)" mask="url(#gm205)"/>']
    for _ in range(14):                                                                                       # 泡泡光斑
        x, y, rr = r.uniform(0, 1080), r.uniform(0, 900), r.uniform(30, 110)
        p.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rr:.0f}" fill="#FFFFFF" opacity="{r.uniform(.12, .3):.2f}" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="2"/>')
    for x, y, s in [(-10, 260, 1.8), (1090, 330, 1.6), (40, 860, 1.6), (1060, 820, 1.9)]:
        p.append(f'<g opacity=".95">{cloud(x, y, s)}</g>')
    # 太阳涂鸦
    p.append('<g transform="translate(150 140)"><circle r="54" fill="#FFE066"/><path d="M0 0 m-6 0 a6 6 0 1 1 12 0 a14 14 0 1 1 -28 0 a22 22 0 1 1 44 0 a30 30 0 1 1 -60 0" fill="none" stroke="#FFB02E" stroke-width="4" stroke-linecap="round"/>'
             + ''.join(f'<path d="M{70 * math.cos(math.radians(a)):.0f} {70 * math.sin(math.radians(a)):.0f} L{92 * math.cos(math.radians(a)):.0f} {92 * math.sin(math.radians(a)):.0f}" stroke="#FFC93C" stroke-width="6" stroke-linecap="round"/>' for a in range(0, 360, 36))
             + '</g>')
    # 纸飞机 + 虚线
    p.append(f'<path d="M90 320 Q160 220 270 250" fill="none" stroke="{DARK}" stroke-width="3" stroke-dasharray="10 10" opacity=".5"/>')
    p.append(plane(270, 250, 1.1, -12))
    p.append('<path d="M520 120 Q600 60 680 110" fill="none" stroke="#FF9A3D" stroke-width="3" stroke-dasharray="10 10" opacity=".7"/>')
    p.append(plane(690, 110, 1.1, 18, '#FF7A1A', '#FFF4E8'))
    p.append(racket(870, 230, -18, '#FF8AB8', '#F05C93'))
    p.append(racket(960, 250, 14, '#8FA8FF', '#5B6CF0', '#7ED957'))
    # 彩色小英文
    eng = 'good good play  day day up'
    cols = ['#FF7A59', '#FFB02E', '#7ED957', '#3EB6F0', '#8F7CFF', '#FF6FA8']
    sp = ''.join(f'<tspan fill="{cols[i % 6]}">{ch}</tspan>' for i, ch in enumerate(eng))
    p.append(f'<text x="540" y="352" text-anchor="middle" font-family="{SANS}" font-weight="900" font-style="italic" font-size="36" letter-spacing="3" stroke="#FFFFFF" stroke-width="7" paint-order="stroke" xml:space="preserve">{sp}</text>')
    # 虚线环绕
    p.append('<path d="M150 640 Q90 470 230 420 M860 760 Q1000 700 960 560 Q940 500 990 470" fill="none" stroke="#FF9A3D" stroke-width="4" stroke-dasharray="12 12" stroke-linecap="round"/>')
    for x, y in [(130, 560), (975, 640), (520, 805)]:
        p.append(f'<path d="M{x} {y - 16} Q{x + 3} {y - 3} {x + 16} {y} Q{x + 3} {y + 3} {x} {y + 16} Q{x - 3} {y + 3} {x - 16} {y} Q{x - 3} {y - 3} {x} {y - 16}Z" fill="#FFFFFF"/>')
    # 糖果字
    for ch, x, y, s, c1, c2, rot in [
        ('好', 250, 560, 185, '#FF8A65', '#EE5A33', -6), ('好', 430, 545, 175, '#FFC93C', '#F29B12', 4),
        ('打', 615, 555, 185, '#7ED957', '#36A84A', -3), ('球', 805, 545, 190, '#5BC8F5', '#2390DE', 5),
        ('天', 300, 765, 180, '#4FB8F2', '#2A7FD8', 3), ('天', 480, 775, 170, '#8FA0FF', '#5A63E8', -5),
        ('向', 665, 765, 185, '#FF8AB8', '#EC4F8A', 4), ('上', 850, 760, 190, '#FFB255', '#F07E22', -4)]:
        p.append(bubbly(ch, x, y, s, c1, c2, rot))
    # 下半截：草坡 + 花丛
    p.append('<path d="M0 1010 Q270 920 560 990 T1080 960 V1350 H0Z" fill="#7FD3A6" filter="url(#pc)"/>')
    p.append('<path d="M0 1090 Q300 1020 620 1080 T1080 1050 V1350 H0Z" fill="#3FA474" filter="url(#pc)"/>')
    p.append('<path d="M0 1180 Q300 1130 600 1170 T1080 1150 V1350 H0Z" fill="#2A8A5E" filter="url(#pc)"/>')
    p.append(f'<rect x="300" y="900" width="480" height="64" rx="32" fill="#FFFFFF" filter="url(#pcs)"/>'
             f'<text x="540" y="943" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="30" letter-spacing="6" fill="{DARK}">以球会友 · 结伴同行</text>')
    greens = ['#2FA36B', '#4DB27F', '#6CC597', '#1F8A5A', '#8EDB9F']
    for _ in range(70):
        x = r.uniform(-10, 1090)
        p.append(blade(x, 1290 - r.uniform(0, 60), r.uniform(70, 170), r.uniform(-50, 50), r.choice(greens)))
    p.append(f'<g filter="url(#pcs)">{ball(470, 1215, 30)}</g><g filter="url(#pcs)">{ball(720, 1245, 24)}</g>')
    for x, y, rr, c in [(70, 1150, 46, '#FF8A3D'), (190, 1200, 38, '#FFC93C'), (330, 1170, 42, '#FF7A59'), (600, 1190, 40, '#FFC93C'),
                        (850, 1160, 46, '#FF8A3D'), (980, 1210, 40, '#FFC93C'), (120, 1260, 34, '#FFB02E'), (900, 1265, 34, '#FF7A59')]:
        p.append(f'<path d="M{x} {y} Q{x + 6} {y + 50} {x} {y + 120}" stroke="#2F8F5C" stroke-width="6" fill="none"/>')
        p.append(flower(x, y, rr, c, r.uniform(0, 70)))
    for _ in range(40):
        x = r.uniform(-10, 1090)
        p.append(blade(x, 1310, r.uniform(40, 110), r.uniform(-30, 30), r.choice(greens[:4])))
    p.append('<rect y="1282" width="1080" height="68" fill="#176B4D"/>')
    p.append(wordmark(1300, '#fff', sub=False))
    return page(''.join(p))
