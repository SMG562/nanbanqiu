from lib import *

META = dict(
    id=28, slug='two-orbs', title='天上一轮', lines=['天上一轮，', '手里一颗。'],
    style=['写实光影', '意境', '双关'], tone='深色', demo=False,
    concept='深空里月亮与网球同样大小的光影，受光方向一致，像一对双星；一虚线相连',
    use='品牌情绪：浪漫的运动，约球的诗意',
)


def svg():
    random.seed(28)
    mx, my, mr = 700, 400, 250
    bx, by, br = 290, 800, 135
    body = f'''
{space(28, avoid=[(mx, my, mr), (bx, by, br)], ymax=1000)}
{moon('a', mx, my, mr, seed=9)}
{tag('TWO MOONS')}
<path d="M{bx+110} {by-120} Q{(bx+mx)/2+20} {(by+my)/2-120} {mx-210} {my+120}" fill="none" stroke="#F7EBD6" stroke-width="2" stroke-dasharray="3 12" stroke-linecap="round" opacity=".5"/>
<circle cx="{bx}" cy="{by}" r="{br*1.9:.0f}" fill="#C6EA3D" opacity=".07" filter="url(#bl60)"/>
{ball('b', bx, by, br)}
<defs><radialGradient id="shb" cx="30%" cy="25%" r="90%"><stop offset=".25" stop-color="#020A06" stop-opacity="0"/><stop offset="1" stop-color="#020A06" stop-opacity=".7"/></radialGradient></defs>
<circle cx="{bx}" cy="{by}" r="{br}" fill="url(#shb)"/>
{headline(META['lines'], y=1085, size=88, colors=(C['cream'], C['lime']), ls=4)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.16)}'''
    return page(body)
