from lib import *
from lin import blob, ink
from people import person
from film import DEFS

META = dict(
    id=174, slug='film-last-ball', title='最后一颗球', lines=['最后一颗球'],
    style=['日本电影', '夜', '光影', '南伴绿'], tone='深色', demo=False,
    concept='借是枝裕和电影海报的版式和光：整张是虚化的深南伴绿夜色树影，上方居中一个大的宋体片名和一块演职员表小字；画面最底下四个人蹲在围网边的草丛里，一部手机的电筒是唯一的光，暖光只照亮他们的手和脸，草里那颗荧光球亮着——夜场打完，找最后一颗球',
    use='夜场 / 一起打球的人情味；电影海报级的主视觉',
)


def svg():
    r = random.Random(174)
    W2 = 1080
    p = [f'<defs>{DEFS}'
         '<linearGradient id="bg174" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#061C17"/><stop offset=".6" stop-color="#0B3B2A"/><stop offset="1" stop-color="#071E17"/></linearGradient>'
         '<filter id="bk174" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="16"/></filter>'
         '<radialGradient id="lt174" cx="540" cy="1130" r="460" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
         '<mask id="mk174"><rect width="1080" height="1350" fill="url(#lt174)"/></mask>'
         '<radialGradient id="gl174" cx="540" cy="1170" r="320" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFF1C8" stop-opacity=".55"/><stop offset="1" stop-color="#FFF1C8" stop-opacity="0"/></radialGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#bg174)"/>']
    leaves = ''
    for _ in range(140):                                                                                       # 虚化的夜树影
        x, y = r.uniform(-60, 1140), r.uniform(-40, 1180)
        leaves += blob(r, x, y, r.uniform(40, 110), r.uniform(26, 70), r.choice(['#0E4A38', '#145A44', '#0A3428', '#1E6A50', '#2A7A5E']), r.uniform(.35, .8), r.uniform(0, 180))
    p.append(f'<g filter="url(#bk174)">{leaves}</g>')
    p.append('<g opacity=".25">' + ''.join(f'<circle cx="{r.uniform(0, 1080):.0f}" cy="{r.uniform(0, 900):.0f}" r="{r.uniform(10, 30):.0f}" fill="#8FD6B8" filter="url(#bl14)"/>' for _ in range(14)) + '</g>')   # 远处路灯的光斑
    # 四个蹲着的人：先画暗的，再画被电筒照亮的（遮罩只露出光附近）
    folks = [(220, 1, 0, 2, '#F2EADA', '#2E3A34', 'long'), (385, 1, 2, 0, '#C6EA3D', '#0B3B2A', 'pony'),
             (695, -1, 1, 1, '#FFFFFF', '#3E5E9A', 'short'), (860, -1, 3, 3, '#E8C8C0', '#F2EADA', 'bob')]
    dark = ''.join(person(x, 1250, 1.9, 'squat', f, sk, hr, '#1E3A30', '#132A22', shoe='#1E3A30', sleeve='short', hairstyle=hs, mono=None).replace('#', '#') for x, f, sk, hr, top, bot, hs in folks)
    dark = ''.join(person(x, 1250, 1.9, 'squat', f, sk, hr, top, bot, sleeve='short', hairstyle=hs, mono='#0A2A20') for x, f, sk, hr, top, bot, hs in folks)
    lit = ''.join(person(x, 1250, 1.9, 'squat', f, sk, hr, top, bot, sleeve='short', hairstyle=hs) for x, f, sk, hr, top, bot, hs in folks)
    p.append(dark)
    p.append(f'<g mask="url(#mk174)">{lit}</g>')
    p.append('<rect width="1080" height="1350" fill="url(#gl174)" style="mix-blend-mode:screen"/>')            # 暖光
    # 草和球、手机
    grass = ''.join(ink([(x, 1360), (x + r.uniform(-14, 14), 1360 - r.uniform(60, 150))], r.uniform(3, 6), r.choice(['#0E3B2A', '#145A44', '#2A7A5E']), .95, (.02, .9)) for x in range(-10, 1090, 9))
    p.append(grass)
    p.append('<circle cx="540" cy="1232" r="60" fill="#E4F76A" opacity=".35" filter="url(#bl14)"/>')
    p.append('<circle cx="540" cy="1232" r="16" fill="#C6EA3D"/><path d="M530 1222 C536 1228 536 1236 530 1242" stroke="#F6F8E0" stroke-width="2.4" fill="none"/>')
    p.append('<g transform="rotate(-20 470 1150)"><rect x="456" y="1122" width="26" height="48" rx="5" fill="#1A1E1C"/><circle cx="469" cy="1128" r="4" fill="#FFF8E0"/></g>')
    p.append('<path d="M466 1130 L560 1240 L520 1250Z" fill="#FFF6D8" opacity=".18"/>')
    # 片名 + 演职员表（居中，像电影海报）
    p.append(f'<text x="540" y="330" text-anchor="middle" font-family="{SERIF}" font-weight="500" font-size="118" letter-spacing="16" fill="#BFE6D4">最后一颗球</text>')
    p.append(f'<text x="540" y="392" text-anchor="middle" font-family="{SERIF}" font-weight="400" font-size="22" letter-spacing="12" fill="#9CCDB8">THE LAST BALL</text>')
    rows = ['出演　夜场打完不肯走的四个人　　场地　三号场东边的围网外　　时间　晚上十点零五分',
            '灯光　一部手机的电筒，电量 12%　　道具　一罐少了一颗的球　　天气　晴，草是湿的',
            '原案　每个打过夜场的人　　剪辑　找到了就回家　　片长　大概十分钟']
    for i, row in enumerate(rows):
        p.append(f'<text x="540" y="{448 + i * 26}" text-anchor="middle" font-family="{SANS}" font-weight="400" font-size="15" letter-spacing="2" fill="#8FBFAA">{row}</text>')
    p.append(f'<text x="540" y="566" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="10" fill="#D8F0E4">南伴球　出品</text>')
    p.append('<circle cx="404" cy="556" r="8" fill="#C6EA3D"/><circle cx="418" cy="566" r="5" fill="#C6EA3D"/>')
    p.append('<rect width="1080" height="1350" filter="url(#fg_f)" opacity=".1" style="mix-blend-mode:screen"/>')
    p.append('<rect width="1080" height="1350" fill="url(#vig_f)"/>')
    return page(''.join(p))
