from lib import *

META = dict(
    id=26, slug='moon-high', title='月高', lines=['月色正好，', '来打一场。'],
    style=['写实光影', '意境'], tone='深色', demo=False,
    concept='深空里一轮写实满月高悬，下方居中的标题，一颗被月光描出亮边的网球；大面积留白，安静、期待',
    use='晚间约球、品牌情绪海报',
)


def svg():
    random.seed(26)
    mx, my, mr = 540, 400, 290
    body = f'''
{space(26, avoid=[(mx, my, mr)], ymax=900)}
{moon('a', mx, my, mr, seed=2)}
{tag('MOONLIGHT')}
<ellipse cx="540" cy="1168" rx="300" ry="9" fill="#F3EBCB" opacity=".12" filter="url(#bl6)"/>
<path d="M240 1168 H840" stroke="#F7EBD6" stroke-width="2" opacity=".28"/>
<ellipse cx="548" cy="1170" rx="44" ry="8" fill="#000" opacity=".6" filter="url(#bl6)"/>
{ball('b', 540, 1128, 40)}
<path d="M505 1112 A40 40 0 0 1 560 1090" fill="none" stroke="#F3EBCB" stroke-width="3" opacity=".5" filter="url(#bl6)"/>
{headline(META['lines'], x=540, y=852, size=92, colors=(C['cream'], C['lime']), ls=4, anchor='middle')}
{sub('夜里的球场，也有光。', 540, 1010, 26, anchor='middle')}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.16)}'''
    return page(body)
