from lib import *
from lin import blob, glow
from wide import open_frame, close_frame, tiny, court, IX, IY, IW, IH, INK, RED, GREEN, outlined

META = dict(
    id=195, slug='wide-road-home', title='骑车回家', lines=['打完球，', '骑车回家，天刚好黑。'],
    style=['课本插画', '宽幅', '长镜头', '故事'], tone='深色', demo=False,
    concept='长镜头的宽幅大远景：傍晚，一条田埂路横穿稻田，路边一排电线杆；三个米粒大的孩子骑着自行车往家走，车后座夹着拍子；身后很远的地方，学校那块球场的灯还亮着',
    use='放学 / 一天结束；温暖、一眼看懂',
)


def bike(x, y, shirt):
    return (f'<circle cx="{x - 12}" cy="{y}" r="8" fill="none" stroke="{INK}" stroke-width="1.8"/><circle cx="{x + 12}" cy="{y}" r="8" fill="none" stroke="{INK}" stroke-width="1.8"/>'
            f'<path d="M{x - 12} {y} L{x - 2} {y - 12} L{x + 12} {y} M{x - 2} {y - 12} L{x + 8} {y - 12}" stroke="{INK}" stroke-width="1.8" fill="none"/>'
            f'<rect x="{x - 6}" y="{y - 34}" width="10" height="20" rx="2" fill="{shirt}"/><circle cx="{x - 1}" cy="{y - 40}" r="5" fill="#2A1E18"/>'
            f'<line x1="{x - 20}" y1="{y - 18}" x2="{x - 10}" y2="{y - 6}" stroke="{INK}" stroke-width="1.6"/><ellipse cx="{x - 23}" cy="{y - 22}" rx="4" ry="6" fill="none" stroke="{INK}" stroke-width="1.4"/>')


def svg():
    r = random.Random(195)
    p = []
    open_frame(p, '<linearGradient id="sk195" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A4A70"/><stop offset=".6" stop-color="#C8806A"/><stop offset="1" stop-color="#F2C08A"/></linearGradient>')
    p.append(f'<rect x="0" y="{IY}" width="1080" height="{IH}" fill="url(#sk195)"/>')
    p.append(outlined('<path d="M0 640 C200 600 400 620 600 600 C800 584 950 610 1080 596 L1080 860 L0 860Z" fill="#2E4A3A"/>'))   # 远处田野（暗）
    p.append(outlined(court(860, 600, 120, 26)))                                                               # 很远的学校球场
    p.append(glow(920, 590, 70, 34, '#FFF2C0', .7, 14))
    p.append('<rect x="870" y="560" width="3" height="40" fill="#1E2A24"/><rect x="968" y="560" width="3" height="40" fill="#1E2A24"/><circle cx="871" cy="560" r="5" fill="#FFF6D8"/><circle cx="969" cy="560" r="5" fill="#FFF6D8"/>')
    p.append('<rect y="690" width="1080" height="170" fill="#3E6A48"/>')                                     # 近处稻田
    for k in range(7):
        p.append(f'<line x1="0" y1="{700 + k * 24}" x2="1080" y2="{706 + k * 24}" stroke="#5A8A58" stroke-width="2"/>')
    p.append('<path d="M0 760 C300 740 700 760 1080 730 L1080 750 C700 778 300 760 0 780Z" fill="#D8C8A0"/>')   # 田埂路
    for k in range(7):                                                                                         # 电线杆
        x = 60 + k * 160
        p.append(f'<rect x="{x}" y="620" width="4" height="{140 - k * 2}" fill="#1E2A24"/><rect x="{x - 12}" y="628" width="28" height="3" fill="#1E2A24"/>')
    p.append('<path d="M62 630 Q140 650 222 630 Q300 650 382 630 Q460 650 542 630 Q620 650 702 630 Q780 650 862 630 Q940 650 1022 630" stroke="#1E2A24" stroke-width="1.4" fill="none"/>')
    for x, shirt in [(300, '#FFFFFF'), (360, '#F2C8C0'), (418, '#C8DCF0')]:
        p.append(bike(x, 758 - (x - 300) * .02, shirt))
    close_frame(p, 4, '打完球，骑车回家，', '天刚好黑。回头看，球场的灯还亮着。')
    return page(''.join(p))
