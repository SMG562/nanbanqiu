from lib import *

META = dict(
    id=30, slug='crescent-cradle', title='月亮摇篮', lines=['晚安，', '明天球场见。'],
    style=['插画', '意境', '拟人'], tone='深色', demo=False,
    concept='弯月像一只摇篮，网球闭着眼睡在里面，飘着小小的 z；夜深了，约好明天再打',
    use='睡前 / 晚安图；约好下一场',
)


def svg():
    random.seed(30)
    cx, cy, R = 540, 720, 290
    stars = ''.join(f'<circle cx="{random.uniform(40,1040):.0f}" cy="{random.uniform(60,1050):.0f}" r="{random.uniform(.8,2.4):.1f}" fill="#F7EBD6" opacity="{random.uniform(.3,.9):.2f}"/>'
                    for _ in range(90) if True)
    def spark(x, y, s):
        return f'<path transform="translate({x} {y}) scale({s})" d="M0 -14 Q1.5 -1.5 14 0 Q1.5 1.5 0 14 Q-1.5 1.5 -14 0 Q-1.5 -1.5 0 -14Z" fill="#F7EBD6" opacity=".9"/>'
    body = f'''
<defs>
 <linearGradient id="bg30" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03100B"/><stop offset=".6" stop-color="#0A3326"/><stop offset="1" stop-color="#0E5139"/></linearGradient>
 <linearGradient id="cr30" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFBE6"/><stop offset=".6" stop-color="#F6E7B8"/><stop offset="1" stop-color="#DCC57F"/></linearGradient>
 <mask id="mk30"><rect width="{W}" height="{H}" fill="#000"/><circle cx="{cx}" cy="{cy}" r="{R}" fill="#fff"/><circle cx="{cx}" cy="{cy-125}" r="{R-38}" fill="#000"/></mask>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg30)"/>
{stars}{spark(210, 520, 1.1)}{spark(880, 470, 1.4)}{spark(960, 760, .8)}{spark(130, 840, .9)}
<circle cx="{cx}" cy="{cy+60}" r="{R+120}" fill="#F6E7B8" opacity=".16" filter="url(#bl60)"/>
<rect width="{W}" height="{H}" fill="url(#cr30)" mask="url(#mk30)"/>
<rect width="{W}" height="{H}" fill="#7A6A33" filter="url(#fuzz)" opacity=".12" mask="url(#mk30)" style="mix-blend-mode:multiply"/>
{ball('a', 540, 778, 118, rot=-18)}
<g transform="translate(540 790)" fill="none" stroke="#0B3B2A" stroke-width="6" stroke-linecap="round">
  <path d="M-62 0 Q-42 20 -22 0"/><path d="M22 0 Q42 20 62 0"/><path d="M-8 34 Q0 40 8 34" stroke-width="5"/>
</g>
<g transform="translate(540 790)"><ellipse cx="-70" cy="22" rx="14" ry="8" fill="#E8643C" opacity=".35"/><ellipse cx="70" cy="22" rx="14" ry="8" fill="#E8643C" opacity=".35"/></g>
<g font-family="{SERIF}" font-weight="900" fill="#F7EBD6">
  <text x="690" y="640" font-size="46" opacity=".95">Z</text><text x="735" y="590" font-size="34" opacity=".75">z</text><text x="768" y="551" font-size="24" opacity=".55">z</text>
</g>
{tag('GOOD NIGHT')}
{headline(META['lines'], y=330, size=104, colors=(C['cream'], C['lime']), ls=4)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
