from lib import *
from mao4 import fuzzball, face4, bow4, tuft4, LIME_P, PINK_P

META = dict(
    id=83, slug='mao-fuzz', title='小毛和小绒，毛茸茸的', lines=['小毛和小绒，', '毛茸茸的。'],
    style=['插画', '角色', '拟人', '写实光影'], tone='浅色', demo=False,
    concept='v4 特写：两颗真正毛茸茸的网球——黄绿的小毛、奶油棉花糖粉的小绒；轮廓一圈逆光的细毛、表面几千根绒毛、带毛边的球缝；婴儿比例的大眼睛、小嘴、柔和腮红，没有睫毛',
    use='形象特写：头像、小红书封面、角色介绍页',
)


def svg():
    random.seed(83)
    a = (350, 800, 225, 5)    # 小毛
    b = (742, 830, 205, -6)   # 小绒
    def head(id, cx, cy, r, tilt, pal, mood, hair, look=0, seed=1):
        return (f'<ellipse cx="{cx + .06*r:.0f}" cy="{cy + r*1.02:.0f}" rx="{r*.78:.0f}" ry="{r*.09:.0f}" fill="#0B3B2A" opacity=".16" filter="url(#bl28)"/>'
                f'<g transform="rotate({tilt} {cx} {cy})">{fuzzball(id, cx, cy, r, pal, seed)}{face4(id, cx, cy, r, mood, look, pal)}'
                f'<g filter="url(#rough2)">{hair(cx, cy, r, max(2.0, .032*r))}</g></g>')
    body = f'''
<defs><linearGradient id="bg83" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF4E3"/><stop offset="1" stop-color="#F1E3C4"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg83)"/>
{tag('XIAO MAO · XIAO RONG', color='#0B3B2A', rule='#0B3B2A', op=.8, weight=700)}
{headline(META['lines'], y=290, size=70, colors=('#0B3B2A', '#C2410C'), ls=4, lh=78)}
{head('m', *a[:3], a[3], LIME_P, 'happy', tuft4, 0, 5)}
{head('r', *b[:3], b[3], PINK_P, 'smile', bow4, -1, 11)}
<path d="M0 1204 Q540 1172 1080 1204 V1350 H0 Z" fill="#0B3B2A"/>
{wordmark(1276, '#F3E6CC', sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
