from lib import *
from mao3 import figure3

META = dict(
    id=78, slug='mao-pen', title='嗨，我是小毛（线条版）', lines=['嗨，', '我是小毛。'],
    style=['插画', '角色', '拟人', '极简'], tone='浅色', demo=False,
    concept='角色设定 v3：写实荧光网球当身体，手和脚只用黑色手写细线（钢笔一笔，带一点抖）；奶油纸色底让黑线和黄绿球形成实与简的对比。主图招手，下面六个姿势：加油 / 求约 / 得意 / 惊讶 / 晚安 / 抱歉',
    use='客服 / 运营形象的设定；头像、贴纸、小红书系列的底稿',
)


def svg():
    random.seed(78)
    cells = [('cheer', 'cheer', '加油'), ('plead', 'plead', '求约'), ('racket', 'wink', '得意'),
             ('wow', 'wow', '惊讶'), ('sleep', 'sleep', '晚安'), ('sorry', 'sweat', '抱歉')]
    grid = ''
    for i, (pose, mood, label) in enumerate(cells):
        x = (230, 540, 850)[i % 3]
        y = (815, 1030)[i // 3]
        grid += figure3(f'g{i}', x, y, 54, pose, mood)
        grid += f'<text x="{x}" y="{y+114}" text-anchor="middle" font-family="{SANS}" font-size="23" letter-spacing="3" fill="#0B3B2A" opacity=".72">{label}</text>'
    body = f'''
<defs><linearGradient id="bg78" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF4E3"/><stop offset="1" stop-color="#F1E3C4"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg78)"/>
{tag('XIAO MAO', color='#0B3B2A', rule='#0B3B2A', op=.8, weight=700)}
{headline(META['lines'], y=290, size=70, colors=('#0B3B2A', '#C2410C'), ls=4, lh=78)}
{figure3('hero', 540, 525, 130, 'wave', 'happy')}
{grid}
<path d="M0 1204 Q540 1172 1080 1204 V1350 H0 Z" fill="#0B3B2A"/>
{wordmark(1276, '#F3E6CC', sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
