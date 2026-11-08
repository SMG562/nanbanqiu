from lib import *
from han import figure, flat, POP

META = dict(
    id=152, slug='pop-week', title='都在等周六', lines=['周一到周五，', '都在等周六。'],
    style=['平面设计', '网格', '汉画像', '多彩'], tone='亮色', demo=False,
    concept='一周七天排成七根竖格：周一到周五是安静的浅色格子，小人在里面上班、挤电车、喝咖啡、看钟；周六周日两格换成大胆的亮色，小人腾空扣杀、跨步挥拍，身子和球拍冲出了格子——古人活在当下，今人活在周末',
    use='周末约球；网格 + 打破网格的现代版式',
)


def svg():
    C = POP
    p = [f'<rect width="{W}" height="{H}" fill="{C["cream"]}"/>']
    x0, y0, cw, ch, gap = 60, 430, 132, 640, 6
    days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    cols = ['#E8E2D6', '#E4DED2', '#E8E2D6', '#E4DED2', '#E8E2D6', C['coral'], C['cobalt']]
    poses = [('sit', 1), ('stand', 1), ('sip', 1), ('stand', -1), ('sit', -1)]
    for i in range(7):
        x = x0 + i * (cw + gap)
        p.append(f'<rect x="{x}" y="{y0}" width="{cw}" height="{ch}" fill="{cols[i]}"/>')
        p.append(f'<text x="{x + 14}" y="{y0 + 34}" font-family="{SANS}" font-weight="700" font-size="18" letter-spacing="4" fill="{"#FFFFFF" if i > 4 else "#8A8476"}">{days[i]}</text>')
        if i < 5:
            pose, f = poses[i]
            p.append(flat(figure(x + cw / 2 - 10 * f, y0 + ch - 40, .62, pose, f, sash=False), '#8A8476'))
            p.append(f'<rect x="{x + 12}" y="{y0 + ch - 40}" width="{cw - 24}" height="3" fill="#8A8476"/>')
    p.append(f'<circle cx="{x0 + 2*(cw+gap) + 96}" cy="{y0 + ch - 110}" r="8" fill="#8A8476"/>')                # 周三的咖啡杯
    p.append(f'<circle cx="{x0 + 4*(cw+gap) + 66}" cy="{y0 + 120}" r="26" fill="none" stroke="#8A8476" stroke-width="4"/>'
             f'<path d="M{x0 + 4*(cw+gap) + 66} {y0 + 120} l0 -18 M{x0 + 4*(cw+gap) + 66} {y0 + 120} l-2 18" stroke="#8A8476" stroke-width="4"/>')   # 周五的钟 5:59
    # 周末：冲出格子
    sx = x0 + 5 * (cw + gap)
    p.append(flat(figure(sx + 60, y0 + ch - 20, 1.6, 'leap', 1), C['navy']))
    p.append(flat(figure(sx + cw + gap + 80, y0 + ch - 20, 1.55, 'lunge', -1), C['butter']))
    p.append(f'<circle cx="{sx + 40}" cy="{y0 + 70}" r="22" fill="#C6EA3D"/><path d="M{sx + 26} {y0 + 56} C{sx + 34} {y0 + 64} {sx + 34} {y0 + 76} {sx + 26} {y0 + 84}" stroke="#F6F8E0" stroke-width="3" fill="none"/>')
    p.append(f'<path d="M{sx - 120} {y0 - 20} Q{sx - 40} {y0 - 70} {sx + 30} {y0 + 44}" stroke="{C["navy"]}" stroke-width="3" stroke-dasharray="3 9" fill="none" stroke-linecap="round"/>')
    p.append(tag('THIS WEEK', color=C['navy'], rule=C['coral'], op=.8))
    p.append(headline(META['lines'], y=272, size=56, colors=(C['navy'], C['coral']), lh=78, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
