import importlib.util, os
from lib import *
from candy import DEFS, char3d, boxed, dotline, vtext, mountain, cloud, tree, ball
from wide import tiny

_spec = importlib.util.spec_from_file_location('p204', os.path.join(os.path.dirname(__file__), 'p204_kaixue_3d.py'))
_p204 = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(_p204)
arrow3d = _p204.arrow3d

META = dict(
    id=206, slug='kaixue-court', title='好好打球 天天向上（网球日）', lines=['好好打球', '天天向上'],
    style=['开学季', '立体字', '纸雕', '南伴绿'], tone='亮色', demo=False,
    concept='204 的同一套路换成品牌色：太阳换成一颗大网球，立体白字的侧面是南伴绿，副标题田字格「一周一约，越打越好」；下面是层层纸雕的绿山和树，中间一块纸雕球场，两个小人隔网对打。',
    use='开学季 / 新一季招新；品牌色更重的版本',
)


def svg():
    p = [f'<defs>{DEFS}<linearGradient id="sky206" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FD3F2"/><stop offset=".6" stop-color="#C9EEF6"/><stop offset="1" stop-color="#E4F6EC"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sky206)"/>',
         f'<text x="540" y="54" text-anchor="middle" font-family="{SANS}" font-size="18" letter-spacing="12" fill="#5E7A8C">— 南 伴 球 · 网 球 日 —</text>',
         vtext('GOOD GOOD PLAY · DAY DAY UP', 34, 300, '#5E7A8C'), vtext('NANBANQIU · TENNIS SEASON', 1046, 300, '#5E7A8C')]
    p.append(f'<g filter="url(#pc)"><circle cx="560" cy="390" r="296" fill="#FFFFFF" opacity=".55"/>{ball(560, 390, 278, "#E4F76A", "#B2D62A")}</g>')
    p.append('<g filter="url(#pc)"><circle cx="165" cy="600" r="86" fill="#FF9A3D"/></g>')
    p.append(f'<g transform="rotate(-10 165 600)"><text x="167" y="613" text-anchor="middle" font-family="{SANS}" font-weight="900" font-style="italic" font-size="34" fill="#C9621A">COME ON!</text>'
             f'<text x="163" y="609" text-anchor="middle" font-family="{SANS}" font-weight="900" font-style="italic" font-size="34" fill="#FFFFFF">COME ON!</text></g>')
    p.append(arrow3d(905, 205, 1.15, 28))
    side = ('#7FD3A6', '#1F7A52')
    for ch, x, y, s, r in [('好', 195, 345, 170, -8), ('好', 360, 330, 150, 5), ('打', 520, 315, 170, -4), ('球', 700, 300, 185, 6),
                           ('天', 365, 580, 175, 4), ('天', 535, 590, 160, -6), ('向', 710, 570, 180, 3), ('上', 880, 560, 170, -5)]:
        p.append(char3d(ch, x, y, s, r, side=side))
    p.append(boxed('一周一约，越打越好', 540, 735, color='#2E4A5C'))
    p.append(dotline('按水平找球友 · 今天起 7 天的球局', 540, 868, '#2E4A5C', half=330))
    p.append(cloud(200, 960, .9))
    p.append(cloud(880, 940, .75))
    p.append(mountain(((-80, 1150), (260, 930), (620, 1150)), '#8ED9B0', '#6CC597'))
    p.append(mountain(((420, 1150), (800, 950), (1160, 1150)), '#7BD3A3', '#4DB27F'))
    p.append('<path d="M0 1080 Q270 1040 540 1070 T1080 1060 V1350 H0Z" fill="#3FA474" filter="url(#pc)"/>')
    for x, h, a, b in [(50, 130, '#9BE0B8', '#6CC597'), (130, 165, '#7BD3A3', '#4DB27F'), (950, 160, '#9BE0B8', '#6CC597'), (1035, 125, '#7BD3A3', '#4DB27F')]:
        p.append(tree(x, 1150, h, a, b))
    # 纸雕球场
    p.append('<g transform="translate(0 -62)">')
    p.append('<path d="M0 1150 Q300 1120 540 1135 T1080 1140 V1350 H0Z" fill="#2A8A5E" filter="url(#pc)"/>')
    p.append('<g filter="url(#pc)"><path d="M290 1160 L790 1160 L900 1320 L180 1320Z" fill="#2F9E6B"/></g>')
    p.append('<path d="M310 1170 L770 1170 L870 1310 L210 1310Z M265 1240 L815 1240 M540 1170 V1310 M245 1268 H835" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linejoin="round"/>')
    p.append(tiny(440, 1210, 1.6, '#FFFFFF', '#2E4A5C'))
    p.append('<path d="M232 1240 H848" stroke="#0E5139" stroke-width="3"/><path d="M232 1240 V1212 H848 V1240" fill="#FFFFFF" fill-opacity=".35" stroke="#FFFFFF" stroke-width="3"/>')
    p.append(tiny(650, 1300, 2.0, '#FFC93C', '#2E4A5C'))
    p.append('<circle cx="565" cy="1170" r="7" fill="#DDF35A"/></g>')
    p.append('<path d="M0 1350 V1260 Q60 1228 120 1255 Q170 1222 230 1260 L240 1350Z" fill="#176B4D"/><path d="M1080 1350 V1255 Q1020 1225 960 1252 Q900 1220 850 1265 L840 1350Z" fill="#176B4D"/>')
    p.append('<rect y="1282" width="1080" height="68" fill="#176B4D"/>')
    p.append(wordmark(1300, '#fff', sub=False))
    return page(''.join(p))
