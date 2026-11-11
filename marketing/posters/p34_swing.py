from lib import *

META = dict(
    id=34, slug='swing', title='等你推一把', lines=['等你来，', '推一把。'],
    style=['插画', '意境', '拟人'], tone='深色', demo=False,
    concept='夜里一棵老树伸出的枝丫上垂着秋千，小球坐在上面朝你望；“推一把”= 约一下',
    use='鼓励主动邀约：「约 TA 打球」',
)


def svg():
    random.seed(34)
    stars = ''.join(f'<circle cx="{random.uniform(30,1050):.0f}" cy="{random.uniform(50,900):.0f}" r="{random.uniform(.8,2.2):.1f}" fill="#F7EBD6" opacity="{random.uniform(.3,.9):.2f}"/>' for _ in range(80)
                    if True)
    # 树枝：从右侧伸来，沿枝撒叶片（固定种子）
    import random as _r
    rr = _r.Random(34)
    leaves = ''
    for i in range(46):
        t = rr.random()
        x = 1080 - t * 640
        y = 520 + (1 - (1 - t) ** 2) * 70 + rr.uniform(-6, 6) - (1 - t) * 0
        for side in (-1, 1):
            if rr.random() < .8:
                ln = rr.uniform(34, 70)
                ang = rr.uniform(35, 75) * side + 90
                leaves += f'<ellipse cx="{x:.0f}" cy="{y + side * ln * .55:.0f}" rx="{ln*.22:.0f}" ry="{ln*.5:.0f}" transform="rotate({side * rr.uniform(10, 40):.0f} {x:.0f} {y:.0f})" fill="#020B07"/>'
    body = f'''
<defs><linearGradient id="bg34" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03100B"/><stop offset=".7" stop-color="#0B3B2A"/><stop offset="1" stop-color="#176B4D"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg34)"/>{stars}
<circle cx="250" cy="700" r="260" fill="#F6E7B8" opacity=".08" filter="url(#bl60)"/>
{tag('GIVE ME A PUSH')}
{headline(META['lines'], y=330, size=104, colors=(C['cream'], C['lime']), ls=4)}
<path d="M1100 500 C980 520 840 570 640 592 C540 602 470 596 430 586" fill="none" stroke="#020B07" stroke-width="34" stroke-linecap="round"/>
{leaves}
<g transform="rotate(7 560 596)">
  <path d="M470 596 L440 930 M650 598 L680 930" stroke="#D9C9A0" stroke-width="5" stroke-linecap="round" opacity=".9"/>
  <ellipse cx="560" cy="1000" rx="170" ry="14" fill="#000" opacity=".4" filter="url(#bl14)"/>
  {ball('b', 560, 840, 92)}{face(572, 845, .78, 'smile', 1)}
  <rect x="408" y="920" width="304" height="26" rx="10" fill="#B0582F"/><rect x="408" y="920" width="304" height="8" rx="4" fill="#D9854F"/>
</g>
<path d="M0 1130 Q540 1090 1080 1130 V1350 H0 Z" fill="#04180F"/>
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
