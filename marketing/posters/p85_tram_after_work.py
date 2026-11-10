import base64, os
from lib import *


META = dict(
    id=85, slug='tram-after-work', title='下班了，去打球', lines=['下班了，', '去打球。'],
    style=['插画', '绘本', '故事', '意境'], tone='深色', demo=False,
    concept='绘本风插画（底图由所有者用生图工具生成，去掉了原图的文字、印章和酒瓶）：墨尔本傍晚，大月亮和满天小星，电车静静停在远处；穿驼色风衣、斜挎小皮包的女生笑着走过来，路灯下穿白外套、绿围巾的男生把一罐新球举过头顶',
    use='下班后约晚场的朋友圈 / 小红书配图',
)

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'art', '85-tram-base.webp')


def can(x, y, w, h):
    """透明球罐 + 三颗荧光球，画得软一点，和底图的水彩质感贴合。"""
    r = w * .42
    balls = ''.join(f'<circle cx="{x + w/2}" cy="{y + 16 + r + i*(2*r + 1):.1f}" r="{r:.1f}" fill="url(#cb85)"/>'
                    f'<path d="M{x + w/2 - r*.8:.1f} {y + 16 + r + i*(2*r + 1) - r*.25:.1f} Q{x + w/2:.1f} {y + 16 + r + i*(2*r + 1) + r*.35:.1f} {x + w/2 + r*.8:.1f} {y + 16 + r + i*(2*r + 1) - r*.25:.1f}" stroke="#F4F8E2" stroke-width="1.8" fill="none" opacity=".9"/>'
                    for i in range(3))
    return f'''
<defs><radialGradient id="cb85" cx=".38" cy=".35" r=".7"><stop offset="0" stop-color="#E6F77A"/><stop offset=".7" stop-color="#C6EA3D"/><stop offset="1" stop-color="#93B52A"/></radialGradient>
<linearGradient id="ct85" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".3" stop-color="#fff" stop-opacity=".45"/><stop offset=".55" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient></defs>
<g filter="url(#bl1)">
 <rect x="{x}" y="{y + 10}" width="{w}" height="{h - 10}" rx="9" fill="#DDE8E2" fill-opacity=".35" stroke="#F2F5EE" stroke-opacity=".8" stroke-width="1.6"/>
 {balls}
 <rect x="{x}" y="{y + 10}" width="{w}" height="{h - 10}" rx="9" fill="url(#ct85)"/>
 <rect x="{x - 3}" y="{y}" width="{w + 6}" height="15" rx="5" fill="#F3EFE4"/>
 <rect x="{x - 3}" y="{y + 11}" width="{w + 6}" height="4" fill="#CFC8B8"/>
</g>'''


def svg():
    b64 = base64.b64encode(open(BASE, 'rb').read()).decode()
    body = f'''
<defs><filter id="bl1" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".6"/></filter></defs>
<image href="data:image/webp;base64,{b64}" x="0" y="0" width="{W}" height="{H}"/>
{can(764, 606, 42, 128)}
<g filter="url(#bl1)">
 <path d="M764 722 C762 730 763 740 768 746 C776 751 790 751 797 746 C801 740 801 730 799 722 C790 718 772 718 764 722 Z" fill="#F4D6C2" stroke="#B98A74" stroke-width="1.1"/>
 <path d="M765 731 Q772 733 778 731 M765 739 Q772 741 778 739" stroke="#C99A84" stroke-width="1" fill="none"/>
 <path d="M798 724 C790 726 784 732 782 738" stroke="#B98A74" stroke-width="1.1" fill="none"/>
</g>
{tag('MELBOURNE · 6:40 PM')}
{headline(META['lines'], y=290, size=64, colors=(C['cream'], C['lime']), lh=82)}
{wordmark(1268, '#fff', sub=False)}
{grain(.08)}'''
    return page(body)
