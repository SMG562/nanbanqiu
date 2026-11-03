from lib import *
from mao2 import figure

META = dict(
    id=76, slug='mao-sheet', title='嗨，我是小毛', lines=['嗨，', '我是小毛。'],
    style=['插画', '角色', '拟人'], tone='深色', demo=False,
    concept='角色设定 v2：和 33–36 号同一种脸（亮眼睛、腮红、小笑），加一个很小的身体——球就是身体，长出短短的手脚和奶油色球鞋；主图招手，下面六个姿势：加油 / 求约 / 得意 / 惊讶 / 晚安 / 抱歉',
    use='客服 / 运营形象的设定；头像、贴纸、小红书系列的底稿',
)


def svg():
    random.seed(76)
    cells = [('cheer', 'cheer', '加油'), ('plead', 'plead', '求约'), ('racket', 'wink', '得意'),
             ('wow', 'wow', '惊讶'), ('sleep', 'sleep', '晚安'), ('sorry', 'sweat', '抱歉')]
    grid = ''
    for i, (pose, mood, label) in enumerate(cells):
        x = (230, 540, 850)[i % 3]
        y = (850, 1045)[i // 3]
        grid += figure(f'g{i}', x, y, 54, pose, mood, shadow_blur='bl6')
        grid += f'<text x="{x}" y="{y+114}" text-anchor="middle" font-family="{SANS}" font-size="23" letter-spacing="3" fill="#F7EBD6" opacity=".78">{label}</text>'
    body = f'''
<defs><radialGradient id="bg76" cx="50%" cy="38%" r="85%"><stop offset="0" stop-color="#145B41"/><stop offset="1" stop-color="#04140D"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg76)"/>
{tag('XIAO MAO')}
{headline(META['lines'], y=290, size=70, colors=(C['cream'], C['lime']), ls=4, lh=78)}
{figure('hero', 540, 545, 135, 'wave', 'happy')}
{grid}
{wordmark(1268, '#fff', sub=False)}
{grain(.18)}'''
    return page(body)
