from lib import *
from lin import blob, glow
from wide import open_frame, close_frame, tiny, court, IX, IY, IW, IH, INK, RED, GREEN, outlined

META = dict(
    id=194, slug='wide-mountain', title='山里的学校', lines=['山里的学校，', '只有一块场。'],
    style=['课本插画', '宽幅', '长镜头', '故事'], tone='浅色', demo=False,
    concept='长镜头的宽幅大远景：层层叠叠的梯田一直铺到山顶，山顶上一座小学校和一块挂着八块红牌子的球场，云在半山腰；场上两个人在打，场边一排米粒大的孩子蹲着等，手里都拿着拍子',
    use='轮着打 / 珍惜的一块场；一眼看懂',
)


def svg():
    r = random.Random(194)
    p = []
    open_frame(p, '<linearGradient id="sk194" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A8CCE4"/><stop offset="1" stop-color="#EEF0E4"/></linearGradient>')
    p.append(f'<rect x="0" y="{IY}" width="1080" height="{IH}" fill="url(#sk194)"/>')
    p.append(outlined('<path d="M0 860 L0 640 C200 560 380 470 540 440 C700 470 880 560 1080 640 L1080 860Z" fill="#6E9A60"/>'))   # 大山
    for k in range(9):                                                                                         # 梯田
        y = 470 + k * 44
        half = 60 + k * 70
        p.append(f'<path d="M{540 - half} {y} Q540 {y - 16} {540 + half} {y}" stroke="#A8C878" stroke-width="5" fill="none"/>')
    p.append(outlined('<rect x="420" y="400" width="90" height="44" fill="#F4ECD8"/><path d="M412 400 L465 380 L518 400Z" fill="#9A4A34"/>'))   # 小学校
    p.append(outlined(court(520, 420, 150, 34)))
    p.append(tiny(560, 448, .7, arm='up') + tiny(640, 452, .7, arm='side'))
    for k in range(5):                                                                                         # 场边一排等着的孩子
        p.append(tiny(530 + k * 16, 476, .55, racket=True, arm='up'))
    for cx, cy in [(180, 640), (900, 620), (380, 700), (760, 720)]:                                            # 半山腰的云
        p.append(glow(cx, cy, 170, 26, '#FFFFFF', .95, 14))
    close_frame(p, 3, '山里的学校，只有一块场。', '大家蹲在场边，排着队，轮着打。')
    return page(''.join(p))
