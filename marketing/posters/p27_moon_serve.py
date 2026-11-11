from lib import *

META = dict(
    id=27, slug='moon-serve', title='一拍到月', lines=['这一拍，', '够到月亮。'],
    style=['写实光影', '意境'], tone='深色', demo=False,
    concept='巨大的月亮从右上角出血，一颗带光尾的球沿虚线抛物线飞向月亮边缘；打球人的浪漫',
    use='发球 / 热血向、朋友圈封面',
)


def svg():
    random.seed(27)
    mx, my, mr = 820, 300, 350
    bx, by = 498, 500
    body = f'''
{space(27, avoid=[(mx, my, mr)], ymax=1000, top='#010609', bot='#052016')}
{moon('a', mx, my, mr, seed=5)}
{tag('TO THE MOON')}
<path d="M120 1010 Q230 560 {bx-26} {by+14}" fill="none" stroke="#C6EA3D" stroke-width="16" stroke-linecap="round" opacity=".35" filter="url(#bl14)"/>
<path d="M120 1010 Q230 560 {bx-26} {by+14}" fill="none" stroke="#E4F76A" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="2 16" opacity=".9"/>
{ball('b', bx, by, 44, rot=-30)}
<circle cx="{bx}" cy="{by}" r="44" fill="#C6EA3D" opacity=".15" filter="url(#bl14)"/>
<path d="M0 1040 H1080 V1350 H0 Z" fill="#020A07"/>
<path d="M0 1040 Q540 1016 1080 1040" fill="none" stroke="#F3EBCB" stroke-width="2" opacity=".18"/>
{headline(META['lines'], y=1118, size=84, colors=(C['cream'], C['lime']), ls=4)}
{wordmark(1288, '#fff', sub=False, op=.9)}
{grain(.16)}'''
    return page(body)
