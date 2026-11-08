from lib import *
from lin import blob
from people import person
from film import DEFS, finish, vtitle, vline, credits

META = dict(
    id=171, slug='film-summer', title='夏天的球场', lines=['打完球，', '西瓜刚好冰透了。'],
    style=['日本电影', '日常', '留白', '光亮'], tone='浅色', demo=False,
    concept='日本电影海报的质感：过曝的夏日天空占了大半，电线杆和电线横过画面，远处一线发白的海；海边一块褪了色的小球场，四个人坐在场边的矮墙上吃西瓜，拍子随手放在地上；竖排宋体片名，底下一行旁白和一排演职员表小字',
    use='夏天 / 打完球的日常；慢、安静、温柔',
)


def svg():
    r = random.Random(171)
    p = [f'<defs>{DEFS}<linearGradient id="sk171" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCE7EC"/><stop offset=".7" stop-color="#F2F2EC"/><stop offset="1" stop-color="#F6F1E6"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sk171)"/>']
    for cx, cy in [(260, 260), (760, 180)]:
        p.append('<g filter="url(#paint2)">' + ''.join(blob(r, cx + r.uniform(-130, 130), cy + r.uniform(-20, 30), r.uniform(50, 90), r.uniform(20, 34), '#FFFFFF', .7) for _ in range(9)) + '</g>')
    p.append('<line x1="180" y1="120" x2="186" y2="760" stroke="#5A605C" stroke-width="9"/><line x1="150" y1="170" x2="216" y2="170" stroke="#5A605C" stroke-width="6"/>')   # 电线杆
    p.append('<line x1="800" y1="560" x2="802" y2="742" stroke="#7A807C" stroke-width="5"/><line x1="784" y1="572" x2="820" y2="572" stroke="#7A807C" stroke-width="3"/>')   # 远处第二根电线杆
    for y1, y2, sag in [(170, 566, 120), (172, 572, 140), (186, 578, 160)]:
        p.append(f'<path d="M186 {y1} Q500 {(y1 + y2) / 2 + sag:.0f} 800 {y2}" stroke="#5A605C" stroke-width="1.6" fill="none" opacity=".8"/>')
    p.append('<rect y="742" width="1080" height="26" fill="#A9C6CA"/><rect y="742" width="1080" height="4" fill="#FFFFFF" opacity=".7"/>')   # 远处的海
    p.append('<rect y="768" width="1080" height="70" fill="#BCC8B2"/>')
    p.append('<path d="M0 838 L1080 838 L1080 1350 L0 1350Z" fill="#9DB8A4"/>')                                              # 褪色的场地
    p.append('<g opacity=".5">' + ''.join(f'<line x1="{x}" y1="760" x2="{x}" y2="850" stroke="#5A605C" stroke-width="2"/>' for x in range(0, 1080, 60)) + '<line x1="0" y1="770" x2="1080" y2="770" stroke="#5A605C" stroke-width="2"/></g>')
    p.append('<path d="M-20 930 L1100 910 M300 838 L120 1350" stroke="#E8ECE4" stroke-width="5" opacity=".85" fill="none"/>')
    p.append('<rect x="0" y="1010" width="760" height="40" fill="#D6D0C2"/><rect x="0" y="1050" width="760" height="10" fill="#B8B0A0"/>')   # 场边矮墙
    folks = [(130, 0, 0, '#F2EADA', '#9AB0C4', 'long'), (240, 2, 3, '#FFFFFF', '#5A6A62', 'short'), (350, 1, 1, '#E8C8C0', '#F2EADA', 'pony'), (460, 3, 0, '#C8D6C4', '#F2EADA', 'bob')]
    for x, sk, hr, top, bot, hs in folks:
        p.append(person(x, 1120, .72, 'drink', 1, sk, hr, top, bot, sleeve='short', hairstyle=hs))
        p.append(f'<path d="M{x + 2} {1120 - 256*.72:.0f} l26 -8 l-8 22Z" fill="#E8564A"/><path d="M{x + 2} {1120 - 256*.72:.0f} l26 -8" stroke="#3E7A4A" stroke-width="3"/>')   # 西瓜
    p.append('<line x1="560" y1="1094" x2="620" y2="1060" stroke="#3A3E3C" stroke-width="3"/><ellipse cx="634" cy="1052" rx="11" ry="15" transform="rotate(-60 634 1052)" fill="none" stroke="#3A3E3C" stroke-width="3"/>')
    p.append('<circle cx="600" cy="1100" r="6" fill="#C6EA3D"/>')
    p.append(vtitle('夏天的球场', 960, 150))
    p.append(vline('打完球，西瓜刚好冰透了。', 880, 170))
    credits(p, ['出演　周日下午的四个人　　场地　海边那块旧场　　天气　晴，有一点风', '西瓜　超市买的　　冰　放在球包里两个小时'])
    finish(p)
    return page(''.join(p))
