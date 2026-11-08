from lib import *
from people import person, wall_shadow, mark

META = dict(
    id=163, slug='scene-walk', title='下班，去打球', lines=['下班，去打球。'],
    style=['场景', '生活', '光影', '插画'], tone='浅色', demo=False,
    concept='借好的服饰广告的场景法（不仿真人）：午后斜阳照在一面浅色的墙上，三个朋友背着球拍包并肩走过，有人搭着肩、有人在笑；墙上投着他们的影子；人在画面中间偏右，左下留白放一行细字标题和一句功能说明',
    use='下班后约球；七天内的球局（业务规则：浏览今天起 7 天）',
)


def svg():
    p = ['<defs><linearGradient id="wl163" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7F3EE"/><stop offset="1" stop-color="#ECE6EE"/></linearGradient>'
         '<clipPath id="wc163"><rect width="1080" height="1180"/></clipPath>'
         '<filter id="tx163"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .12 0"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#wl163)"/>', '<rect width="1080" height="1180" filter="url(#tx163)"/>',
         '<path d="M0 0 L380 0 L0 520Z" fill="#FFFFFF" opacity=".5"/>']                                         # 斜进来的一块亮光
    folks = [
        lambda m=None: person(650, 1200, 2.05, 'walk', -1, 0, 2, '#A8D8C0', '#3E5E9A', hairstyle='long', bag='#2E3438', mono=m),
        lambda m=None: person(840, 1204, 2.08, 'hold', -1, 2, 0, '#F6C6D0', '#7FA0CC', hairstyle='pony', mono=m),
        lambda m=None: person(1020, 1200, 2.05, 'walk', -1, 1, 1, '#E8D6B8', '#F2EADA', hairstyle='short', bag='#2E7A5A', mono=m),
    ]
    for f in folks:
        p.append(wall_shadow(lambda col, f=f: f(col), 80, -20, .14, '#5A5068', 'wc163'))
    p.append('<rect y="1180" width="1080" height="170" fill="#DDD4CA"/>')
    for x in range(-40, 1100, 120):
        p.append(f'<line x1="{x}" y1="1180" x2="{x - 60}" y2="1350" stroke="#CFC5BA" stroke-width="2"/>')
    p.append('<ellipse cx="840" cy="1206" rx="300" ry="10" fill="#B8AEA4" opacity=".5" filter="url(#bl6)"/>')
    for f in folks:
        p.append(f())
    bx, by = 840 - 44 * 2.08 - 6, 1204 - 246 * 2.08 - 14
    p.append(f'<circle cx="{bx:.0f}" cy="{by:.0f}" r="15" fill="#C6EA3D"/><path d="M{bx-8:.0f} {by-9:.0f} C{bx-3:.0f} {by-3:.0f} {bx-3:.0f} {by+3:.0f} {bx-8:.0f} {by+9:.0f}" stroke="#F6F8E0" stroke-width="2.4" fill="none"/>')   # 中间那位手里的球
    p.append(f'<text x="84" y="1060" font-family="{SANS}" font-weight="400" font-size="56" letter-spacing="2" fill="#2A2A2E">下班，去打球。</text>')
    p.append(f'<text x="86" y="1110" font-family="{SANS}" font-weight="300" font-size="24" letter-spacing="1" fill="#4A4A50">今天起 7 天内的球局，挑一场下班后的。</text>')
    p.append(mark(996, 1290, '#2A2A2E'))
    return page(''.join(p))
