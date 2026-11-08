from lib import *
from lin import blob, ink
from people import person
from film import DEFS, finish, vtitle, vline, credits

META = dict(
    id=173, slug='film-bicycle', title='顺风', lines=['骑车去球场，', '风是顺的。'],
    style=['日本电影', '日常', '春天', '留白'], tone='浅色', demo=False,
    concept='日本电影海报的质感：春天的河堤，大半是浅浅的天，一排开着淡粉花的树沿着河岸；一个人骑着自行车从堤上经过，背着球拍包，车筐里放着一罐球，衣角和头发被风吹向前；竖排片名「顺风」',
    use='去打球的路上；春天、轻、慢',
)


def svg():
    r = random.Random(173)
    p = [f'<defs>{DEFS}<linearGradient id="sk173" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4E9AD0"/><stop offset=".7" stop-color="#A8D4EC"/><stop offset="1" stop-color="#E2F0EA"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sk173)"/>']
    trees = ''
    for i in range(7):                                                                                                   # 一排开花的树
        x = 80 + i * 150 + r.uniform(-20, 20)
        trees += ink([(x, 900), (x + 4, 780)], 10, '#6A5A50', 1, (0, .3))
        trees += ''.join(blob(r, x + r.uniform(-70, 70), 740 + r.uniform(-50, 40), r.uniform(26, 44), r.uniform(20, 34), r.choice(['#F4C2C8', '#EEA8B4', '#FFFFFF', '#2F7A5E']), .95) for _ in range(12))
    p.append(f'<g filter="url(#paint2)">{trees}</g>')
    p.append('<path d="M0 900 L1080 880 L1080 960 L0 980Z" fill="#176B4D"/>')                                            # 河堤
    p.append('<path d="M0 960 L1080 940 L1080 948 L0 968Z" fill="#F2EADA"/>')                                             # 堤上的小路
    p.append('<path d="M0 980 L1080 960 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')                                           # 河
    p.append('<g opacity=".55">' + ''.join(f'<rect x="{r.uniform(0, 1060):.0f}" y="{r.uniform(990, 1170):.0f}" width="{r.uniform(40, 120):.0f}" height="2.5" fill="#2F7A5E"/>' for _ in range(40)) + '</g>')
    for _ in range(26):                                                                                                  # 飘的花瓣
        p.append(f'<ellipse cx="{r.uniform(200, 1000):.0f}" cy="{r.uniform(600, 960):.0f}" rx="4" ry="2.5" fill="#EEC6C8" transform="rotate({r.uniform(0, 180):.0f})" opacity=".9"/>')
    # 自行车 + 人
    bx, by = 640, 946
    p.append(f'<circle cx="{bx - 70}" cy="{by - 34}" r="34" fill="none" stroke="#3A3E3C" stroke-width="4"/><circle cx="{bx + 70}" cy="{by - 34}" r="34" fill="none" stroke="#3A3E3C" stroke-width="4"/>'
             f'<path d="M{bx - 70} {by - 34} L{bx - 10} {by - 34} L{bx + 30} {by - 90} L{bx - 30} {by - 90}Z M{bx - 10} {by - 34} L{bx - 30} {by - 100} M{bx + 30} {by - 90} L{bx + 70} {by - 34} M{bx + 30} {by - 90} L{bx + 36} {by - 110}" stroke="#3A3E3C" stroke-width="4" fill="none"/>'
             f'<rect x="{bx + 36}" y="{by - 116}" width="40" height="26" fill="none" stroke="#3A3E3C" stroke-width="3"/><rect x="{bx + 44}" y="{by - 112}" width="22" height="18" rx="3" fill="#FFFFFF"/>')
    p.append(person(bx - 34, by - 4, .78, 'ride', 1, 0, 2, '#FFFFFF', '#0B3B2A', sleeve='long', hairstyle='long', bag='#0B3B2A'))
    p.append(f'<circle cx="{bx + 55}" cy="{by - 118}" r="6" fill="#C6EA3D"/>')
    p.append(vtitle('顺风', 950, 170, 110, '#0B3B2A'))
    p.append(vline('骑车去球场，风是顺的。', 850, 196, 26, '#0B3B2A'))
    credits(p, ['出演　一个人和一辆旧自行车　　路线　沿着河走二十分钟　　天气　晴，顺风', '车筐里　一罐新球　　回程　大概是逆风'], color='#D8E8DE', mark_text='#FFFFFF')
    finish(p)
    return page(''.join(p))
