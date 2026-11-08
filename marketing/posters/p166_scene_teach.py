from lib import *
from people import person, mark
from scene_common import fence_court

META = dict(
    id=166, slug='scene-teach', title='新手也能约', lines=['新手也能约。'],
    style=['场景', '生活', '光影', '插画'], tone='浅色', demo=False,
    concept='借好的服饰广告的场景法：网前，一个人帮另一个人调握拍，两人都在笑；阳光从左边斜照，影子落在蓝绿场地上；网的白带横过画面；左下一行细字和一句功能说明',
    use='新手友好；按水平分档（业务规则：按水平匹配）',
)


def svg():
    p = []
    fence_court(p, court='#86C8C0', fence_y=700)
    p.append('<rect x="0" y="880" width="1080" height="10" fill="#FFFFFF"/>')                                              # 网带
    p.append('<g opacity=".35">' + ''.join(f'<line x1="{x}" y1="890" x2="{x}" y2="1010" stroke="#2E3438" stroke-width="1.6"/>' for x in range(0, 1080, 18))
             + ''.join(f'<line x1="0" y1="{y}" x2="1080" y2="{y}" stroke="#2E3438" stroke-width="1.6"/>' for y in range(900, 1010, 18)) + '</g>')
    p.append('<rect x="0" y="1006" width="1080" height="4" fill="#2E3438" opacity=".5"/>')
    for x, k in [(560, .14), (800, .14)]:
        p.append(f'<ellipse cx="{x + 90}" cy="1214" rx="140" ry="14" fill="#2E6A66" opacity=".35" filter="url(#bl6)"/>')
    p.append(person(600, 1214, 2.05, 'teach', 1, 0, 0, '#FFFFFF', '#2E3438', sleeve='short', hairstyle='short'))
    p.append(person(800, 1214, 2.05, 'grip', -1, 1, 2, '#F6C6D0', '#FFFFFF', skirt=True, sleeve='short', hairstyle='pony', racket_hand='fh'))
    p.append(f'<text x="84" y="1080" font-family="{SANS}" font-weight="400" font-size="52" letter-spacing="2" fill="#FFFFFF">新手也能约。</text>')
    p.append(f'<text x="86" y="1128" font-family="{SANS}" font-weight="300" font-size="24" letter-spacing="1" fill="#F4FAF8">按水平找局，新手有新手的局。</text>')
    p.append(mark(996, 1290, '#FFFFFF'))
    return page(''.join(p))
