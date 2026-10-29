from lib import *
from mao2 import face2
from mao3 import pen, hand3, shoe3, tuft3, face3, PEN

META = dict(
    id=79, slug='mao-swing-pen', title='等你推一把（线条版）', lines=['等你来，', '推一把。'],
    style=['插画', '意境', '拟人', '极简'], tone='浅色', demo=False,
    concept='34 号的场景换成白天的浅色底：深绿的老树枝垂下秋千，小毛坐着，两只手只有黑色细线，抓着绳子，脚悬空晃',
    use='鼓励主动邀约：「约 TA 打球」',
)


def svg():
    import random as _r
    rr = _r.Random(34)
    leaves = ''
    for i in range(46):
        t = rr.random()
        x = 1080 - t * 640
        y = 520 + (1 - (1 - t) ** 2) * 70 + rr.uniform(-6, 6)
        for side in (-1, 1):
            if rr.random() < .8:
                ln = rr.uniform(34, 70)
                leaves += f'<ellipse cx="{x:.0f}" cy="{y + side * ln * .55:.0f}" rx="{ln*.22:.0f}" ry="{ln*.5:.0f}" transform="rotate({side * rr.uniform(10, 40):.0f} {x:.0f} {y:.0f})" fill="{rr.choice(["#0B3B2A", "#0B3B2A", "#176B4D"])}"/>'
    r, cx, cy = 92, 560, 828
    w = 3.2
    p = lambda x, y: f'{cx + x*r:.1f} {cy + y*r:.1f}'
    arms = (pen(f'M{p(-.93,.12)} Q{p(-1.10,-.22)} {p(-1.18,-.62)}', w) + pen(f'M{p(.93,.12)} Q{p(1.10,-.22)} {p(1.18,-.62)}', w)
            + hand3(cx - 1.18*r, cy - .62*r, r, w*.9) + hand3(cx + 1.18*r, cy - .62*r, r, w*.9))
    sy = 946
    legs = (pen(f'M{cx-.34*r:.1f} {sy-2} Q{cx-.44*r:.1f} {sy+.26*r:.1f} {cx-.40*r:.1f} {sy+.56*r:.1f}', w)
            + pen(f'M{cx+.34*r:.1f} {sy-2} Q{cx+.56*r:.1f} {sy+.20*r:.1f} {cx+.56*r:.1f} {sy+.50*r:.1f}', w)
            + shoe3(cx - .46*r, sy + .62*r, r, w*.9, 12) + shoe3(cx + .64*r, sy + .56*r, r, w*.9, -22))
    body = f'''
<defs>
 <linearGradient id="bg79" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF4E3"/><stop offset=".75" stop-color="#F4E2BE"/><stop offset="1" stop-color="#EBCB98"/></linearGradient>
 <radialGradient id="sun79" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FFF3C4" stop-opacity=".9"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg79)"/>
{tag('GIVE ME A PUSH', color='#0B3B2A', rule='#0B3B2A', op=.8, weight=700)}
{headline(META['lines'], y=330, size=104, colors=('#0B3B2A', '#C2410C'), ls=4)}
<path d="M1100 500 C980 520 840 570 640 592 C540 602 470 596 430 586" fill="none" stroke="#0B3B2A" stroke-width="34" stroke-linecap="round"/>
{leaves}
<g transform="rotate(7 560 596)">
  <g filter="url(#rough2)">{pen('M470 596 L440 930', 3)}{pen('M650 598 L680 930', 3)}</g>
  <ellipse cx="560" cy="1070" rx="160" ry="12" fill="#0B3B2A" opacity=".16" filter="url(#bl14)"/>
  <g filter="url(#rough2)">{arms}</g>{ball('b', cx, cy, r)}{face3(cx + 8, cy + 6, r/118, 'happy', 1)}<g filter="url(#rough2)">{tuft3(cx, cy, r, 3.2)}</g>
  <rect x="408" y="920" width="304" height="26" rx="10" fill="#B0582F"/><rect x="408" y="920" width="304" height="8" rx="4" fill="#D9854F"/>
  <g filter="url(#rough2)">{legs}</g>
</g>
<path d="M0 1150 Q540 1112 1080 1150 V1350 H0 Z" fill="#0B3B2A"/>
{wordmark(1268, '#F3E6CC', sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
