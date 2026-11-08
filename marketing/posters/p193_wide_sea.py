from lib import *
from lin import blob
from wide import open_frame, close_frame, tiny, court, IX, IY, IW, IH, INK, RED, GREEN, outlined

META = dict(
    id=193, slug='wide-sea', title='涨潮之前', lines=['涨潮之前，', '再打一盘。'],
    style=['课本插画', '宽幅', '长镜头', '故事'], tone='浅色', demo=False,
    concept='长镜头的宽幅大远景：一大片海和天，山坡上挤着白墙小屋，堤岸边一块小球场挂着八块红牌子；海浪一层层往堤岸推，两个米粒大的人还在打，一个人站在堤上挥手叫他们回家',
    use='海边 / 夕阳前的最后一盘；一眼看懂',
)


def svg():
    r = random.Random(193)
    p = []
    open_frame(p, '<linearGradient id="sk193" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4C89A"/><stop offset="1" stop-color="#FBE6C8"/></linearGradient>')
    p.append(f'<rect x="0" y="{IY}" width="1080" height="300" fill="url(#sk193)"/>')
    p.append('<circle cx="250" cy="560" r="44" fill="#FFF2D0"/>')
    p.append('<rect y="600" width="1080" height="260" fill="#3E86A8"/>')                                      # 海
    for k in range(10):
        y = 612 + k * 22
        p.append(f'<path d="M0 {y} ' + ' '.join(f'q20 -6 40 0' for _ in range(28)) + f'" stroke="#A8D0E0" stroke-width="2" fill="none" opacity="{.4 + k * .04:.2f}"/>')
    p.append(outlined('<path d="M600 600 C700 470 820 420 1080 400 L1080 860 L700 860 C660 780 640 700 600 600Z" fill="#8AB07A"/>'))   # 山坡
    for _ in range(18):                                                                                        # 白墙小屋
        x, y = r.uniform(700, 1060), r.uniform(450, 640)
        p.append(outlined(f'<rect x="{x:.0f}" y="{y:.0f}" width="34" height="24" fill="#F4F0E4"/><path d="M{x - 3:.0f} {y:.0f} L{x + 17:.0f} {y - 14:.0f} L{x + 37:.0f} {y:.0f}Z" fill="#B8503A"/>'))
    p.append(outlined('<path d="M380 860 L560 700 L1080 700 L1080 860Z" fill="#C8BCA0"/>'))                  # 堤岸
    p.append(outlined(court(640, 740, 280, 90)))
    p.append(tiny(700, 800, 1.0, arm='up') + tiny(860, 818, 1.0, arm='side'))
    p.append(tiny(560, 728, 1.0, shirt='#E8843A', pants='#5A5A5A', racket=False) + f'<line x1="563" y1="694" x2="574" y2="676" stroke="{INK}" stroke-width="2"/>')   # 堤上挥手的人
    for k in range(4):                                                                                        # 推向堤岸的浪
        p.append(f'<path d="M{100 + k * 60} {820 - k * 30} q60 -18 120 0 q60 18 120 0" stroke="#FFFFFF" stroke-width="4" fill="none" opacity="{.8 - k * .15:.2f}"/>')
    p.append(outlined('<path d="M120 680 l50 0 l-8 12 l-34 0Z" fill="#B8503A"/><line x1="145" y1="680" x2="145" y2="650" stroke="#4A3A2A" stroke-width="2"/>'))   # 远处的渔船
    close_frame(p, 2, '涨潮之前，再打一盘。', '堤上有人在喊，回家吃饭了。')
    return page(''.join(p))
