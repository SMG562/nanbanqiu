from lib import *
from mao import mao

META = dict(
    id=75, slug='mao-chalk', title='小毛，三句口头禅', lines=['小毛，', '三句口头禅。'],
    style=['手作', '角色', '拟人'], tone='深色', demo=False,
    concept='角色设定 C（碎嘴型 · 粉笔手作）：深绿黑板上粉笔画的小毛，网球绒毛一圈短线；三行口头禅：看情况。我才没在等。膝盖有点意见。',
    use='运营口吻的定调：小红书文案、客服回复都按这三句的语气写',
)


def svg():
    random.seed(75)
    rows = [('flat', '看情况。'), ('wait', '我才没在等。'), ('knee', '膝盖有点意见。')]
    out = ''
    for i, (mood, text) in enumerate(rows):
        y = 640 + i * 215
        out += mao(f'c{i}', 210, y, 66, mood, style='chalk', rot=-14 + i * 9)
        out += f'<text x="340" y="{y+22}" font-family="{SERIF}" font-weight="900" font-size="62" fill="#F7EBD6" opacity=".92">{text}</text>'
        out += f'<path d="M110 {y+104} H960" stroke="#F7EBD6" stroke-width="2" opacity=".18"/>'
    dust = ''.join(f'<circle cx="{random.uniform(0,1080):.0f}" cy="{random.uniform(300,1200):.0f}" r="{random.uniform(1,3):.1f}" fill="#fff" opacity="{random.uniform(.05,.2):.2f}"/>' for _ in range(160))
    body = f'''
<defs><radialGradient id="bg75" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#1F6B4C"/><stop offset="1" stop-color="#082219"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg75)"/>{dust}
<rect x="60" y="480" width="960" height="720" rx="24" fill="none" stroke="#F7EBD6" stroke-width="2" opacity=".12"/>
<g filter="url(#rough2)">{out}</g>
{tag('XIAO MAO')}
{headline(META['lines'], y=290, size=62, colors=(C['cream'], C['lime']), ls=3, lh=80)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.2)}'''
    return page(body)
