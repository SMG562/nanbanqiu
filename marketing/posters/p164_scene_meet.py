from lib import *
from people import person, mark
from scene_common import fence_court, bench

META = dict(
    id=164, slug='scene-meet', title='有人等你', lines=['周六上午，有人等你。'],
    style=['场景', '生活', '光影', '插画'], tone='浅色', demo=False,
    concept='借好的服饰广告的场景法：周六上午的阳光，虚化的球场围网，蓝绿色场地；两个人一见面就击掌，一个手里攥着新开的球；右边长凳上放着球包和水壶；左下留白，一行细字和一句功能说明',
    use='约到球友的那一刻；按水平匹配（业务规则）',
)


def svg():
    p = []
    fence_court(p)
    p.append(bench(820, 820))
    p.append('<path d="M880 820 C880 770 920 750 960 756 C1000 762 1020 790 1016 820Z" fill="#2E3438"/><rect x="1030" y="758" width="30" height="62" rx="10" fill="#7CC8D8"/><rect x="1034" y="750" width="22" height="12" rx="3" fill="#2E3438"/>')
    p.append('<ellipse cx="720" cy="1214" rx="260" ry="14" fill="#4E8E8E" opacity=".45" filter="url(#bl6)"/>')
    p.append(person(600, 1210, 2.05, 'five', 1, 1, 0, '#FFFFFF', '#2E3438', skirt=True, sleeve='short', hairstyle='pony'))
    p.append(person(850, 1214, 2.08, 'five', -1, 3, 3, '#2E7A5A', '#F2EADA', sleeve='short', hairstyle='cap'))
    bx, by = 440 + 0 * 2, 1210
    p.append('<circle cx="438" cy="702" r="0"/>')
    hx, hy = 600 - 20 * 2.05 + 4, 1210 - 176 * 2.05
    p.append(f'<circle cx="{hx + 10:.0f}" cy="{hy + 4:.0f}" r="15" fill="#C6EA3D"/>')
    p.append(f'<text x="84" y="1080" font-family="{SANS}" font-weight="400" font-size="52" letter-spacing="2" fill="#FFFFFF">周六上午，有人等你。</text>')
    p.append(f'<text x="86" y="1128" font-family="{SANS}" font-weight="300" font-size="24" letter-spacing="1" fill="#F4FAF8">按水平找球友，附近 10 公里的球局。</text>')
    p.append(mark(996, 1290, '#FFFFFF'))
    return page(''.join(p))
