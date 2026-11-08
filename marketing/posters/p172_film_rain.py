from lib import *
from people import person
from film import DEFS, finish, vtitle, vline, credits

META = dict(
    id=172, slug='film-rain', title='等雨停', lines=['下雨了。', '等一会儿，说不定会停。'],
    style=['日本电影', '日常', '雨', '静'], tone='浅色', demo=False,
    concept='日本电影海报的质感：雨天，画面上方是遮雨棚的檐口，雨丝细细地落；檐下两个人并排坐在长凳上，捧着冒热气的纸杯，伞靠在一边，球包放在脚下；外面的球场湿亮，映着灰白的天；竖排片名「等雨停」',
    use='雨天改期 / 等雨；慢下来的一刻',
)


def svg():
    r = random.Random(172)
    p = [f'<defs>{DEFS}<linearGradient id="sk172" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8DEDC"/><stop offset="1" stop-color="#EEF0EC"/></linearGradient>'
         '<linearGradient id="wt172" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B4C6BE"/><stop offset="1" stop-color="#8EA89C"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sk172)"/>']
    p.append('<rect y="620" width="1080" height="420" fill="url(#wt172)"/>')                                              # 湿球场
    p.append('<rect y="620" width="1080" height="420" fill="#FFFFFF" opacity=".12"/>')
    p.append('<path d="M-20 720 L1100 700 M240 620 L60 1040 M840 620 L1020 1040" stroke="#EEF2EE" stroke-width="5" opacity=".6" fill="none"/>')
    p.append('<g opacity=".45">' + ''.join(f'<rect x="{r.uniform(0, 1060):.0f}" y="{r.uniform(640, 1020):.0f}" width="{r.uniform(40, 140):.0f}" height="3" rx="1.5" fill="#F4F6F2"/>' for _ in range(30)) + '</g>')
    p.append('<g opacity=".5">' + ''.join(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x - 6:.0f}" y2="{y + 40:.0f}" stroke="#FFFFFF" stroke-width="1.4"/>' for x, y in ((r.uniform(0, 1080), r.uniform(120, 1000)) for _ in range(160))) + '</g>')
    p.append('<rect y="0" width="1080" height="110" fill="#5A605C"/><rect y="110" width="1080" height="10" fill="#3E4440"/>')   # 檐口
    for x in range(30, 1080, 70):
        p.append(f'<circle cx="{x}" cy="{126 + (x % 3) * 6}" r="3" fill="#FFFFFF" opacity=".7"/>')
    p.append('<rect y="1040" width="1080" height="310" fill="#CFCBC0"/>')                                               # 棚下的水泥地
    p.append('<rect x="300" y="960" width="500" height="18" fill="#8A6A4A"/><rect x="320" y="978" width="12" height="70" fill="#5A4A3A"/><rect x="768" y="978" width="12" height="70" fill="#5A4A3A"/>')
    p.append(person(450, 1048, 1.0, 'drink', 1, 0, 1, '#E8E2D6', '#5A6A62', sleeve='long', hairstyle='long'))
    p.append(person(640, 1048, 1.0, 'laugh', -1, 2, 0, '#9DB0A4', '#F2EADA', sleeve='long', hairstyle='short'))
    p.append('<rect x="452" y="768" width="16" height="22" rx="3" fill="#FFFFFF"/><path d="M458 762 c-6 -12 6 -18 0 -30" stroke="#FFFFFF" stroke-width="2.4" fill="none" opacity=".8"/>')
    p.append('<line x1="860" y1="1046" x2="830" y2="860" stroke="#3A3E3C" stroke-width="5"/><path d="M830 860 C800 900 806 980 840 1010 L860 1000 C850 960 846 900 830 860Z" fill="#3E5A4E"/>')   # 靠着的伞
    p.append('<rect x="560" y="1018" width="110" height="30" rx="12" fill="#2E3438"/><circle cx="690" cy="1040" r="7" fill="#C6EA3D"/>')
    p.append(vtitle('等雨停', 140, 250, 84, '#2E3432'))
    p.append(vline('下雨了。等一会儿，说不定会停。', 230, 270))
    credits(p, ['出演　两个约好的人　　场地　三号场的遮雨棚下　　天气　小雨，转阴', '热茶　自动贩卖机　　改期　还没决定'], color='#4A504C')
    finish(p, leak=False)
    return page(''.join(p))
