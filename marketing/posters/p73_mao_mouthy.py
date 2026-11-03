from lib import *
from mao import mao

META = dict(
    id=73, slug='mao-mouthy', title='小毛：我才没在等', lines=['我才没在等。'],
    style=['插画', '角色', '拟人'], tone='深色', demo=False,
    concept='角色设定 A（嘴硬型 · 扁平）：荧光黄绿网球「小毛」，戴头带、半睁眼；主图是余光瞟向门口的“等人”脸，下面六个基础表情（平时 / 膝盖有意见 / 袜子红了 / 断线了 / 改期 / 赢了）',
    use='客服 / 运营形象的角色设定；头像、贴纸、小红书系列的底稿',
)


def svg():
    random.seed(73)
    cells = [('flat', '平时'), ('knee', '膝盖有意见'), ('down', '袜子红了'),
             ('snap', '断线了'), ('resched', '改期'), ('calm', '赢了')]
    grid = ''
    for i, (mood, label) in enumerate(cells):
        x = (230, 540, 850)[i % 3]
        y = (885, 1080)[i // 3]
        grid += f'<ellipse cx="{x+8}" cy="{y+66}" rx="48" ry="7" fill="#000" opacity=".35" filter="url(#bl6)"/>'
        grid += mao(f'g{i}', x, y, 58, mood)
        grid += f'<text x="{x}" y="{y+104}" text-anchor="middle" font-family="{SANS}" font-size="23" letter-spacing="3" fill="#F7EBD6" opacity=".78">{label}</text>'
    body = f'''
<defs><radialGradient id="bg73" cx="50%" cy="38%" r="85%"><stop offset="0" stop-color="#145B41"/><stop offset="1" stop-color="#04140D"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg73)"/>
{tag('XIAO MAO')}
{headline(META['lines'], y=292, size=90, colors=(C['cream'],), ls=3)}
{sub('小毛 · 约球搭子', x=84, y=346, size=26, op=.7)}
<ellipse cx="560" cy="778" rx="170" ry="20" fill="#000" opacity=".4" filter="url(#bl14)"/>
{mao('main', 540, 575, 185, 'wait')}
{grid}
{wordmark(1268, '#fff', sub=False)}
{grain(.18)}'''
    return page(body)
