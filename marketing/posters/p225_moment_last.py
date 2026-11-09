from lib import *
from moment import frame

META = dict(
    id=225, slug='moment-last', title='最后一球。', lines=['最后一球。'],
    style=['瞬间', '夜场', '极简', '幽默'], tone='亮色', demo=False,
    concept='夜场快要关灯：远远一块球场，四根灯杆里三盏已经灭了，只剩最后一盏还亮着，光正好罩住半个场；两个米粒大的人还在打，一颗荧光球悬在光里。心里那句「最后一球」，今晚已经说了第三次。',
    use='瞬间系列 · 04；夜场 / 舍不得走',
)


def svg():
    r = random.Random(225)
    p = ['<defs><linearGradient id="n225" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E2A30"/><stop offset=".7" stop-color="#16434A"/><stop offset="1" stop-color="#123A36"/></linearGradient>'
         '<linearGradient id="cone225" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4D2" stop-opacity=".7"/><stop offset="1" stop-color="#FFF4D2" stop-opacity=".06"/></linearGradient>'
         '<radialGradient id="pool225" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF4D2" stop-opacity=".5"/><stop offset="1" stop-color="#FFF4D2" stop-opacity="0"/></radialGradient>'
         '<filter id="gl225" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="6"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#n225)"/>']
    for _ in range(36):
        p.append(f'<circle cx="{r.uniform(0, 1080):.0f}" cy="{r.uniform(0, 520):.0f}" r="{r.uniform(.8, 2):.1f}" fill="#F4EDCF" opacity="{r.uniform(.25, .7):.2f}"/>')
    # 远处地面 + 树线
    p.append('<path d="M0 760 Q200 730 420 750 T820 740 T1080 748 V1350 H0Z" fill="#0F3A34"/>')
    # 球场（透视）
    p.append('<path d="M300 800 L780 800 L960 1060 L120 1060Z" fill="#1F6B4F"/>')
    # 光锥 + 光池（右前那盏）
    p.append('<path d="M846 520 L884 520 L960 1060 L520 1060 L540 860Z" fill="url(#cone225)"/>')
    p.append('<ellipse cx="720" cy="960" rx="300" ry="110" fill="url(#pool225)"/>')
    p.append('<path d="M540 800 L780 800 L960 1060 L540 1060Z" fill="#2F9A6A" opacity=".75"/>')
    p.append('<path d="M310 806 L770 806 L948 1054 L132 1054Z M540 806 V1054 M228 930 H852" stroke="#F4EED8" stroke-width="3" fill="none" opacity=".75"/>')
    p.append('<path d="M222 930 H858" stroke="#F4EED8" stroke-width="5"/><path d="M222 930 V906 H858 V930" stroke="#F4EED8" stroke-width="2" fill="none" opacity=".6"/>')
    # 四根灯杆：三盏灭、一盏亮
    for x, y0, h, on in [(250, 520, 290, False), (820, 520, 290, False), (90, 560, 500, False), (866, 500, 560, True)]:
        p.append(f'<path d="M{x} {y0 + 20} V{y0 + h}" stroke="#2B4A50" stroke-width="7"/>')
        p.append(f'<rect x="{x - 24}" y="{y0}" width="48" height="20" rx="4" fill="{"#FFF4D2" if on else "#2B4A50"}"/>')
        if on:
            p.append(f'<rect x="{x - 30}" y="{y0 - 6}" width="60" height="32" rx="6" fill="#FFF4D2" opacity=".6" filter="url(#gl225)"/>')
    # 两个米粒小人 + 球
    for x, y, k in [(640, 1010, 1.1), (470, 868, .8)]:
        p.append(f'<rect x="{x - 5 * k:.0f}" y="{y - 30 * k:.0f}" width="{10 * k:.0f}" height="{18 * k:.0f}" rx="3" fill="#F4EED8"/><rect x="{x - 4 * k:.0f}" y="{y - 13 * k:.0f}" width="{8 * k:.0f}" height="{13 * k:.0f}" fill="#1E2A22"/><circle cx="{x}" cy="{y - 35 * k:.0f}" r="{5 * k:.1f}" fill="#1E2A22"/>')
    p.append('<path d="M650 976 Q600 860 560 820" stroke="#F4FFD0" stroke-width="2" stroke-dasharray="3 6" fill="none" opacity=".7"/>')
    p.append('<circle cx="556" cy="814" r="14" fill="#DDF35A" opacity=".6" filter="url(#gl225)"/><circle cx="556" cy="814" r="7" fill="#DDF35A"/>')
    frame(p, 4, '最后一球。', '这句话，今晚已经说了第三次。', '夜场的球局，也能在南伴球上约。', ink='#F4EDCF', sub_c='#C9DCD2', info_c='#8FB5A6', mark_c='#F4EDCF')
    return page(''.join(p))
