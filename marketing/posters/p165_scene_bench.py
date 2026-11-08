from lib import *
from people import person, mark
from scene_common import fence_court, bench

META = dict(
    id=165, slug='scene-bench', title='换边的九十秒', lines=['换边的九十秒。'],
    style=['场景', '生活', '光影', '插画'], tone='浅色', demo=False,
    concept='借好的服饰广告的抓拍法：换边时两个人坐在场边长凳上，一个仰头喝水，一个笑弯了腰；拍子靠在凳边，毛巾搭着，地上一罐球；虚化的围网、午后的光；左下一行细字',
    use='一起打球的轻松时刻；打完直接约 TA（业务规则：邀约）',
)


def svg():
    p = []
    fence_court(p, fence_y=820)
    p.append(bench(480, 994, 560))
    p.append('<ellipse cx="760" cy="1216" rx="320" ry="14" fill="#4E8E8E" opacity=".45" filter="url(#bl6)"/>')
    p.append(person(620, 1214, 2.0, 'drink', 1, 0, 1, '#F6C6D0', '#F2EADA', sleeve='short', hairstyle='long'))
    p.append(person(880, 1214, 2.0, 'laugh', -1, 2, 0, '#E8D6B8', '#3E5E9A', sleeve='long', hairstyle='short'))
    p.append('')        # 水壶
    p.append('<path d="M960 994 L1010 994 L1006 1044 L964 1044Z" fill="#B8CDB8"/>')                                      # 毛巾搭着
    p.append('<line x1="440" y1="1210" x2="470" y2="1060" stroke="#2E3438" stroke-width="7" stroke-linecap="round"/><ellipse cx="478" cy="1020" rx="26" ry="36" transform="rotate(12 478 1020)" fill="none" stroke="#2E3438" stroke-width="7"/>')
    p.append('<rect x="380" y="1166" width="36" height="48" rx="6" fill="#FFFFFF"/><rect x="380" y="1166" width="36" height="10" rx="4" fill="#2E3438"/>')
    p.append(f'<text x="84" y="900" font-family="{SANS}" font-weight="400" font-size="52" letter-spacing="2" fill="#FFFFFF">换边的九十秒。</text>')
    p.append(f'<text x="86" y="948" font-family="{SANS}" font-weight="300" font-size="24" letter-spacing="1" fill="#F4FAF8">打得开心，下次直接约 TA。</text>')
    p.append(mark(996, 1290, '#FFFFFF'))
    return page(''.join(p))
