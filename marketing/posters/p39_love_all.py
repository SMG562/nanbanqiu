from lib import *

META = dict(
    id=39, slug='love-all', title='全场皆爱', lines=['0 比 0，', '全场皆爱。'],
    style=['排版', '双关', '极简'], tone='深色', demo=False,
    concept='记分牌 0 : 0：两个大圆环是零，冒号是两颗网球；网球里零分叫 love，love all 就是零比零',
    use='品牌调性：浪漫的运动；开场海报',
)


def svg():
    random.seed(39)
    cy = 840
    body = f'''
<defs><radialGradient id="bg39" cx="50%" cy="58%" r="80%"><stop offset="0" stop-color="#14573F"/><stop offset="1" stop-color="#04180F"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg39)"/>
{tag('LOVE ALL')}
{headline(META['lines'], y=330, size=104, colors=(C['cream'], C['lime']), ls=4)}
<ellipse cx="290" cy="{cy}" rx="175" ry="245" fill="none" stroke="#F7EBD6" stroke-width="42"/>
<ellipse cx="790" cy="{cy}" rx="175" ry="245" fill="none" stroke="#F7EBD6" stroke-width="42"/>
{ball('a', 540, cy-92, 50)}{ball('b', 540, cy+92, 50, rot=30)}
<ellipse cx="540" cy="{cy+146}" rx="46" ry="8" fill="#000" opacity=".4" filter="url(#bl6)"/>
{sub('在网球里，零分叫 love。', 540, 1160, 26, C['cream'], .8, 7, 'middle')}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
