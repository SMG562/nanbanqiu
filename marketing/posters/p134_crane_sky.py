from lib import *
from lin import DEFS, blob, ink, glow, poem, seal
from song import crane

META = dict(
    id=134, slug='crane-sky', title='放得有点高', lines=['这个高球，', '放得有点高。'],
    style=['宋画', '宫阙', '云天', '光亮'], tone='亮色', demo=False,
    concept='借《瑞鹤图》的格局：整张是一片石青的天，祥云从宫阙的屋脊上涌起，一群白鹤在天上盘旋；鹤群里多了一颗荧光球——高球放得太高，飞进了鹤群；下方金瓦朱墙托住整个画面',
    use='高球 / 挑高球；云天、宫墙的大气象，配一句好笑的大实话',
)


def svg():
    r = random.Random(134)
    p = [f'<defs>{DEFS}<linearGradient id="sk134" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A68AE"/><stop offset=".55" stop-color="#4E8CC8"/><stop offset="1" stop-color="#9CC6E4"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk134)"/>', glow(560, 860, 520, 200, '#D8ECF8', .7)]
    for _ in range(60):                                                                                       # 石青天的细微笔触
        x, y = r.uniform(0, 1080), r.uniform(0, 900)
        p.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r.uniform(60, 160):.0f}" ry="{r.uniform(3, 8):.0f}" fill="#FFFFFF" opacity="{r.uniform(.03, .07):.2f}"/>')
    flock = [(220, 420, .9, -8, 1), (420, 330, .75, -14, 1), (610, 460, 1.0, -4, 1), (820, 380, .8, 6, -1), (340, 560, .7, 2, 1), (900, 560, .85, -10, -1),
             (520, 220, .6, -18, 1), (720, 600, .7, 8, -1), (160, 650, .65, -6, 1), (150, 230, .6, -12, 1), (640, 700, .55, -2, 1)]
    for c in flock:
        p.append(crane(*c))
    p.append('<path d="M120 1020 C300 760 520 480 760 250" stroke="#FFFFFF" stroke-width="2.4" stroke-dasharray="2 12" fill="none" stroke-linecap="round" opacity=".6"/>')   # 高球的弧线
    p.append(glow(760, 250, 34, 34, '#E4F76A', .7, 14))
    p.append('<circle cx="760" cy="250" r="17" fill="#C6EA3D"/><path d="M748 238 C756 246 756 254 748 262" stroke="#F6F8E0" stroke-width="2.4" fill="none"/>')
    # 祥云：从屋脊后涌起，白身蓝勾边
    cl = ''
    for _ in range(40):                                                                                     # 祥云：柔的白团 + 几笔卷云勾线
        x, y = r.uniform(-60, 1140), r.uniform(900, 1070)
        cl += blob(r, x, y, r.uniform(70, 130), r.uniform(30, 50), r.choice(['#FFFFFF', '#F4F8FA', '#E6EEF4']), .95)
    for _ in range(16):
        x, y = r.uniform(0, 1060), r.uniform(900, 1040)
        cl += f'<path d="M{x:.0f} {y:.0f} c14 -26 50 -26 56 -4 c4 14 -14 22 -24 12 c-6 -8 4 -16 10 -10" fill="none" stroke="#8EB4D2" stroke-width="2.6" stroke-linecap="round"/>'
    p.append(glow(540, 960, 600, 90, '#FFFFFF', .7, 28))
    p.append(f'<g filter="url(#paint2)">{cl}</g>')
    # 宫阙屋顶：金瓦、正脊、鸱吻、起翘的檐角
    roof = '<path d="M60 1180 C150 1150 210 1110 270 1080 L810 1080 C870 1110 930 1150 1020 1180Z" fill="#E2A93B"/>'
    for i in range(46):
        x = 120 + i * 18.6
        roof += f'<line x1="{x:.0f}" y1="{1180 - 0:.0f}" x2="{540 + (x - 540) * .62:.0f}" y2="1082" stroke="#B87A1E" stroke-width="2.2" opacity=".7"/>'
    roof += '<rect x="262" y="1066" width="556" height="18" rx="4" fill="#C08422"/><rect x="262" y="1062" width="556" height="6" fill="#F2C760"/>'
    roof += '<path d="M262 1068 C246 1060 238 1040 250 1022 C262 1030 272 1046 276 1066Z" fill="#C08422"/><path d="M818 1068 C834 1060 842 1040 830 1022 C818 1030 808 1046 804 1066Z" fill="#C08422"/>'
    roof += '<path d="M60 1180 C40 1172 30 1160 26 1146 C46 1156 64 1164 84 1170Z" fill="#C08422"/><path d="M1020 1180 C1040 1172 1050 1160 1054 1146 C1034 1156 1016 1164 996 1170Z" fill="#C08422"/>'
    p.append(roof)
    p.append('<rect x="0" y="1176" width="1080" height="174" fill="#B8322A"/>')                                   # 朱墙托底
    for x in range(90, 1080, 180):
        p.append(f'<rect x="{x}" y="1176" width="14" height="174" fill="#9A2620" opacity=".6"/>')
    p.append('<rect x="0" y="1176" width="1080" height="10" fill="#7A1E18" opacity=".5"/>')
    txt, xl, yb = poem(META['lines'], 980, 130, 42, '#FBF6E6')
    p.append(txt)
    p.append(seal(xl - 40, yb + 34, 30))
    p.append(wordmark(1270, '#fff', sub=False))
    p.append(grain(.08))
    return page(''.join(p))
