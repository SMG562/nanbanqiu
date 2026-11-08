from lib import *
from candy import DEFS, char3d, boxed, dotline, vtext, mountain, cloud, tree, ball

META = dict(
    id=204, slug='kaixue-3d', title='好好打球 天天向上（立体字）', lines=['好好打球', '天天向上'],
    style=['开学季', '立体字', '纸雕', '明亮'], tone='亮色', demo=False,
    concept='开学季海报的路数：橙色圆日托着一个个歪斜的立体白字「好好打球 / 天天向上」，黄色立体箭头往上冲，「COME ON!」小圆章；田字格副标题「以球会友，结伴同行」；下面是纸雕的南伴绿山林，网球当太阳，一辆写着南伴球、车顶绑着球包的黄色校车开去球场。',
    use='开学季 / 新一季招新；朋友圈、小红书竖图',
)


def arrow3d(x, y, s, rot):
    """黄色立体箭头。"""
    d = 'M0 -60 L52 0 L22 0 L22 70 L-22 70 L-22 0 L-52 0 Z'
    side = ''.join(f'<path d="{d}" transform="translate({-k * .55:.1f} {k * .85:.1f})" fill="#F0A21E"/>' for k in range(14, 0, -1))
    return (f'<g transform="translate({x} {y}) rotate({rot}) scale({s})" filter="url(#tsh)">{side}'
            f'<path d="{d}" fill="#FFD23F"/><path d="M0 -60 L52 0 L22 0 L22 70 L0 70 Z" fill="#FFE27A"/></g>')


def bus(x, y):
    """纸雕黄色校车，车头朝右，(x,y) 为车身左下角。"""
    o = [f'<g filter="url(#pc)">',
         f'<rect x="{x + 40}" y="{y - 178}" width="200" height="26" rx="8" fill="#2F7A5E"/>',                                     # 车顶球包
         f'<path d="M{x + 60} {y - 165} h160" stroke="#C6EA3D" stroke-width="4"/>',
         f'<ellipse cx="{x + 270}" cy="{y - 168}" rx="34" ry="14" fill="#E85A4F" transform="rotate(-12 {x + 270} {y - 168})"/>',  # 球拍
         f'<path d="M{x + 240} {y - 160} l-40 8" stroke="#3B4B5C" stroke-width="7" stroke-linecap="round"/>',
         f'<path d="M{x} {y - 150} H{x + 330} Q{x + 360} {y - 150} {x + 366} {y - 120} L{x + 380} {y - 70} H{x + 440} Q{x + 460} {y - 66} {x + 460} {y - 40} V{y} H{x} Z" fill="#FFC93C"/>',
         f'<rect x="{x}" y="{y - 46}" width="460" height="46" fill="#F5AE1F"/>',
         f'<path d="M{x} {y - 74} H{x + 440}" stroke="#3B4B5C" stroke-width="5"/>']
    for i in range(4):
        o.append(f'<rect x="{x + 26 + i * 78}" y="{y - 134}" width="62" height="50" rx="6" fill="#BFE8F7"/><path d="M{x + 36 + i * 78} {y - 92} l26 -34" stroke="#FFFFFF" stroke-width="5" opacity=".8"/>')
    o.append(f'<path d="M{x + 342} {y - 132} L{x + 366} {y - 82} H{x + 342}Z" fill="#BFE8F7"/>')
    o.append(f'<text x="{x + 175}" y="{y - 12}" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="30" letter-spacing="10" fill="#FFFFFF">南伴球</text>')
    o.append(f'<circle cx="{x + 446}" cy="{y - 54}" r="8" fill="#FFF3B0"/>')
    for wx in (x + 90, x + 370):
        o.append(f'<circle cx="{wx}" cy="{y}" r="34" fill="#3B4B5C"/><circle cx="{wx}" cy="{y}" r="15" fill="#DDE3E8"/>')
    o.append('</g>')
    return ''.join(o)


def svg():
    p = [f'<defs>{DEFS}<linearGradient id="sky204" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9DDF3"/><stop offset=".6" stop-color="#CDEEF6"/><stop offset="1" stop-color="#E4F6EC"/></linearGradient>'
         '<radialGradient id="sun204" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#FFD98A"/><stop offset="1" stop-color="#FFB255"/></radialGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sky204)"/>',
         f'<text x="540" y="54" text-anchor="middle" font-family="{SANS}" font-size="18" letter-spacing="12" fill="#7A8A99">— 南 伴 球 · 周 末 约 球 季 —</text>',
         vtext('GOOD GOOD PLAY · DAY DAY UP', 34, 300), vtext('NANBANQIU · TENNIS SEASON', 1046, 300)]
    # 圆日：大橙圆 + 内浅圆 + 左边挂个小圆章
    p.append('<g filter="url(#pc)"><circle cx="560" cy="390" r="290" fill="#FFB255"/><circle cx="585" cy="370" r="225" fill="url(#sun204)"/></g>')
    p.append('<g filter="url(#pc)"><circle cx="165" cy="600" r="86" fill="#FF9A3D"/></g>')
    p.append(f'<g transform="rotate(-10 165 600)"><text x="167" y="613" text-anchor="middle" font-family="{SANS}" font-weight="900" font-style="italic" font-size="34" fill="#C9621A">COME ON!</text>'
             f'<text x="163" y="609" text-anchor="middle" font-family="{SANS}" font-weight="900" font-style="italic" font-size="34" fill="#FFFFFF">COME ON!</text></g>')
    p.append(arrow3d(905, 205, 1.15, 28))
    # 立体字：一个个歪斜、大小不一
    for ch, x, y, s, r in [('好', 195, 345, 170, -8), ('好', 360, 330, 150, 5), ('打', 520, 315, 170, -4), ('球', 700, 300, 185, 6),
                           ('天', 365, 580, 175, 4), ('天', 535, 590, 160, -6), ('向', 710, 570, 180, 3), ('上', 880, 560, 170, -5)]:
        p.append(char3d(ch, x, y, s, r))
    p.append(boxed('以球会友，结伴同行', 540, 735))
    p.append(dotline('周末约球季 · 你好新球友', 540, 868))
    # 纸雕山林
    p.append(cloud(250, 960, 1.0))
    p.append(cloud(760, 925, .7))
    p.append(mountain(((-60, 1230), (300, 900), (640, 1230)), '#8ED9B0', '#6CC597'))
    p.append(f'<g filter="url(#pc)">{ball(810, 1000, 92)}</g>')
    p.append(cloud(930, 1040, .7))
    p.append(mountain(((380, 1230), (720, 960), (1140, 1230)), '#5FC08E', '#3FA474'))
    p.append(mountain(((-80, 1240), (140, 1060), (420, 1240)), '#3FA474', '#2A8A5E'))
    p.append(f'<path d="M0 1120 Q200 1080 400 1120 T800 1110 T1080 1100 V1350 H0Z" fill="#2A8A5E" filter="url(#pc)"/>')
    for x, h, a, b in [(40, 130, '#9BE0B8', '#6CC597'), (120, 160, '#7BD3A3', '#4DB27F'), (205, 120, '#A8E6C2', '#7BD3A3'),
                       (840, 140, '#7BD3A3', '#4DB27F'), (930, 165, '#9BE0B8', '#6CC597'), (1020, 125, '#6CC597', '#3FA474')]:
        p.append(tree(x, 1205, h, a, b))
    p.append('<path d="M0 1210 H1080 V1290 H0Z" fill="#F6E6C4" filter="url(#pcs)"/><path d="M40 1252 H1040" stroke="#FFFFFF" stroke-width="5" stroke-dasharray="40 30"/>')
    p.append(bus(300, 1262))
    p.append('<path d="M0 1350 V1290 Q60 1250 120 1280 Q170 1240 230 1285 Q300 1262 340 1300 L340 1350Z" fill="#176B4D" filter="url(#pc)"/>')
    p.append('<path d="M1080 1350 V1280 Q1020 1245 960 1278 Q900 1236 840 1285 Q780 1270 750 1310 L750 1350Z" fill="#176B4D" filter="url(#pc)"/>')
    p.append('<path d="M0 1350 V1318 Q90 1296 160 1320 Q240 1300 300 1330 V1350Z M1080 1350 V1316 Q990 1298 920 1322 Q850 1306 800 1334 V1350Z" fill="#0E5139"/>')
    return page(''.join(p))
