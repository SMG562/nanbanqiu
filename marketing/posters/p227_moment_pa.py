from lib import *
from lin import ink
from moment import frame

META = dict(
    id=227, slug='moment-pa', title='啪。', lines=['啪。'],
    style=['瞬间', '夜场', '动势', '幽默'], tone='亮色', demo=False,
    concept='打得正起劲，啪一下，夜场的灯关了：记分牌上正好是 40 平；近处的人背对镜头，一个正手已经拉开、身子扭到一半，对面的人还在往前冲，球悬在半空，是全场唯一还亮着的东西；灯头里剩一点橘红，刚才的光锥只剩淡淡的残影。不是收工，是被迫暂停——这一分下周接着打。',
    use='瞬间系列 · 06；夜场 / 打球的热情 / 下周接着约',
)

C = '#0A1F1A'   # 剪影色


def player():
    """近处的人，背对镜头拉开正手：两腿岔开、膝盖弯、身子扭、拍子在身后，左手指着来球。"""
    o = [ink([(566, 860), (530, 960), (500, 1040), (470, 1126)], 54, C, 1, (0, 0), press=lambda t: 1 - .45 * t),       # 后腿
         ink([(616, 860), (668, 950), (700, 1030), (712, 1126)], 54, C, 1, (0, 0), press=lambda t: 1 - .45 * t),       # 前腿
         f'<ellipse cx="458" cy="1132" rx="34" ry="13" fill="{C}"/><ellipse cx="726" cy="1132" rx="34" ry="13" fill="{C}"/>',
         ink([(596, 690), (600, 760), (592, 870)], 118, C, 1, (0, 0), press=lambda t: .9 + .1 * t),                    # 躯干
         ink([(566, 706), (500, 690), (430, 664)], 30, C, 1, (0, .3)),                                                    # 左手指向来球
         ink([(630, 708), (704, 742), (770, 712)], 32, C, 1, (0, 0)),                                                     # 持拍手往后拉
         f'<path d="M770 712 L826 652" stroke="{C}" stroke-width="12" stroke-linecap="round"/>',
         f'<ellipse cx="858" cy="606" rx="42" ry="58" transform="rotate(38 858 606)" fill="none" stroke="{C}" stroke-width="11"/>',
         f'<circle cx="598" cy="640" r="34" fill="{C}"/>']
    return ''.join(o)


def svg():
    r = random.Random(227)
    p = ['<defs><linearGradient id="n227" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1E22"/><stop offset="1" stop-color="#123630"/></linearGradient>'
         '<linearGradient id="ghost227" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4D2" stop-opacity=".05"/><stop offset="1" stop-color="#FFF4D2" stop-opacity="0"/></linearGradient>'
         '<filter id="g227" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="16"/></filter>'
         '<filter id="g227s" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="5"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#n227)"/>']
    for _ in range(26):
        p.append(f'<circle cx="{r.uniform(0, 1080):.0f}" cy="{r.uniform(0, 420):.0f}" r="{r.uniform(.6, 1.6):.1f}" fill="#F4EDCF" opacity="{r.uniform(.2, .5):.2f}"/>')
    # 灯杆：刚灭，灯头剩一点橘红；光锥只剩残影
    for x, top in [(150, 300), (930, 300)]:
        p.append(f'<path d="M{x - 30} {top + 20} L{x + 30} {top + 20} L{x + (260 if x < 540 else -260)} 1000 L{x + (-60 if x < 540 else 60)} 1000Z" fill="url(#ghost227)"/>')
        p.append(f'<path d="M{x} {top + 18} V820" stroke="#1E3A38" stroke-width="8"/><rect x="{x - 34}" y="{top}" width="68" height="22" rx="4" fill="#2A1E18"/>'
                 f'<rect x="{x - 28}" y="{top + 6}" width="56" height="10" rx="3" fill="#E8783A"/><circle cx="{x}" cy="{top + 11}" r="30" fill="#F29A4A" opacity=".4" filter="url(#g227)"/>')
    # 围网 + 记分牌 40 : 40
    p.append('<path d="M0 640 H1080" stroke="#2A4844" stroke-width="3"/><g stroke="#2A4844" stroke-width="1" opacity=".5">' + ''.join(f'<path d="M{x} 640 V780"/>' for x in range(0, 1080, 20)) + '</g>')
    sx, sy = 196, 676
    p.append(f'<rect x="{sx}" y="{sy}" width="200" height="110" rx="8" fill="#1A2E2C"/>'
             f'<rect x="{sx + 16}" y="{sy + 14}" width="78" height="82" rx="6" fill="#E8E4D6"/><rect x="{sx + 106}" y="{sy + 14}" width="78" height="82" rx="6" fill="#E8E4D6"/><path d="M{sx + 16} {sy + 55} H{sx + 94} M{sx + 106} {sy + 55} H{sx + 184}" stroke="#1A2E2C" stroke-width="2"/>'
             f'<text x="{sx + 55}" y="{sy + 79}" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="54" fill="#1A2E2C">40</text>'
             f'<text x="{sx + 145}" y="{sy + 79}" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="54" fill="#1A2E2C">40</text>')
    # 球场（透视，从近处底线看过去）
    p.append('<path d="M330 780 L750 780 L1180 1350 L-100 1350Z" fill="#17473C"/>')
    p.append('<path d="M340 786 L740 786 L1160 1350 M340 786 L-80 1350 M540 786 V1350 M262 890 H818" stroke="#9FC2B4" stroke-width="3" fill="none" opacity=".35"/>')
    p.append('<path d="M240 890 H840" stroke="#E8E4D6" stroke-width="5" opacity=".55"/><path d="M240 890 V858 H840 V890" stroke="#9FC2B4" stroke-width="2" fill="none" opacity=".4"/>')
    # 对面的人：还在往前冲
    p.append(ink([(512, 778), (500, 800), (488, 818)], 8, C, 1, (0, 0)) + ink([(520, 778), (534, 798), (548, 816)], 8, C, 1, (0, 0))
             + f'<rect x="506" y="742" width="20" height="38" rx="6" fill="{C}"/><circle cx="516" cy="732" r="9" fill="{C}"/><path d="M526 752 L552 736" stroke="{C}" stroke-width="5" stroke-linecap="round"/><ellipse cx="560" cy="728" rx="8" ry="11" fill="none" stroke="{C}" stroke-width="3"/>')
    # 球：全场唯一还亮着的
    p.append('<path d="M520 720 Q470 600 410 586" stroke="#E8F7A0" stroke-width="3" stroke-dasharray="4 8" fill="none" opacity=".55"/>')
    p.append('<circle cx="400" cy="584" r="30" fill="#DDF35A" opacity=".45" filter="url(#g227)"/><circle cx="400" cy="584" r="16" fill="#DDF35A"/>'
             '<path d="M390 572 q10 12 2 24 M410 572 q-10 12 -2 24" stroke="#FFFFFF" stroke-width="2.4" fill="none" opacity=".8"/>')
    # 近处的人 + 一点冷月光的轮廓 + 甩出去的汗
    p.append(f'<g transform="translate(-5 -4)" opacity=".55"><g fill="none">{player().replace(C, "#4E7A70")}</g></g>')
    p.append(player())
    for x, y, rr in [(560, 610, 4), (546, 596, 3), (640, 608, 3.4)]:
        p.append(f'<circle cx="{x}" cy="{y}" r="{rr}" fill="#BFE0D4" opacity=".8"/>')
    frame(p, 6, '啪。', '40 平，灯关了。这一分，下周接着打。', '夜场的球局，在南伴球上约。', ink='#F4EDCF', sub_c='#D9E6DD', info_c='#8FB5A6', mark_c='#F4EDCF', total=None)
    p = [x.replace('font-size="92" fill="#F4EDCF">啪。', 'font-size="150" fill="#F4EDCF">啪。') for x in p]
    return page(''.join(p))
