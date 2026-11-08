from lib import *
from lin import blob
from wide import open_frame, close_frame, tiny, court, IX, IY, IW, IH, INK, RED, GREEN, outlined

META = dict(
    id=192, slug='wide-train', title='火车经过的时候', lines=['火车经过的时候，', '大家都停下来看。'],
    style=['课本插画', '宽幅', '长镜头', '故事'], tone='浅色', demo=False,
    concept='长镜头的宽幅大远景：远处一排青山，田野中间一块小小的球场，围网上挂着八块红牌子；一列绿皮火车从画面中间横穿而过，场上四个米粒大的人都停下拍子，扭头看着它',
    use='一起打球的日常 / 时间慢下来的一刻；一眼看懂',
)


def svg():
    r = random.Random(192)
    p = []
    open_frame(p, '<linearGradient id="sk192" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC8E4"/><stop offset="1" stop-color="#E6EEDC"/></linearGradient>')
    p.append(f'<rect x="0" y="{IY}" width="1080" height="{IH}" fill="url(#sk192)"/>')
    for i, (y, c) in enumerate([(520, '#8AAAA8'), (560, '#6E9A80')]):                                          # 远山两层
        pts = ' '.join(f'L{x} {y - 60 * abs(math.sin(x / (160 + i * 50) + i)) - r.uniform(0, 10):.0f}' for x in range(0, 1100, 40))
        p.append(outlined(f'<path d="M0 {y + 200} {pts} L1080 {y + 200}Z" fill="{c}"/>'))
    p.append(f'<rect y="600" width="1080" height="260" fill="#C8D890"/>')                                     # 田野
    for k in range(9):
        y = 620 + k * 26
        p.append(f'<line x1="0" y1="{y}" x2="1080" y2="{y + 4}" stroke="#A8C070" stroke-width="2"/>')
    p.append(outlined(court(560, 760, 300, 80)))
    for x, y, a in [(600, 800, 'up'), (690, 836, 'side'), (760, 790, 'side'), (820, 830, 'up')]:
        p.append(tiny(x, y, 1.0, arm=a))
    # 绿皮火车：从左到右横穿中景
    p.append('<rect y="690" width="1080" height="6" fill="#6A5A4A"/><rect y="700" width="1080" height="3" fill="#6A5A4A"/>')
    tr = ''
    for k in range(6):
        x = -40 + k * 150
        tr += f'<rect x="{x}" y="636" width="142" height="54" rx="6" fill="#2E6E4E"/><rect x="{x}" y="664" width="142" height="5" fill="#F2E8C8"/>'
        tr += ''.join(f'<rect x="{x + 10 + w * 22}" y="644" width="14" height="14" fill="#E8EED8"/>' for w in range(6))
    tr += '<path d="M860 636 L920 636 C944 636 956 652 956 690 L860 690Z" fill="#2E6E4E"/><rect x="900" y="644" width="34" height="18" fill="#E8EED8"/>'
    p.append(outlined(tr))
    p.append(''.join(f'<circle cx="{960 + k * 30}" cy="{620 - k * 14}" r="{10 + k * 4}" fill="#FFFFFF" opacity="{.7 - k * .12:.2f}"/>' for k in range(4)))
    close_frame(p, 1, '火车经过的时候，', '大家都停下来看。看完了，再接着打。')
    return page(''.join(p))
