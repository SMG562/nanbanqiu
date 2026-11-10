from lib import *
from storybook import wash, hatch, wc_filter
from storyfig86 import umbrella_man, rain_girl


META = dict(
    id=86, slug='rain-ten-minutes', title='雨停了，再等十分钟', lines=['雨停了，', '再等十分钟。'],
    style=['插画', '绘本', '故事', '雨'], tone='浅色', demo=False,
    concept='绘本风（水彩晕染 + 彩铅排线）：雨快停了，球场积着水；男生撑着深绿大伞、伞整个歪向她，自己半边肩膀湿了，脖子上挂着擦场地的毛巾；穿百褶裙和玛丽珍鞋的女生仰头看天，手伸出伞外接最后一滴；水洼倒映着他俩',
    use='雨天改期 / 等场地干的朋友圈配图；绘本风',
)


def svg():
    random.seed(86)
    # 远处树
    trees = '<g filter="url(#rough)">' + ''.join(
        f'<circle cx="{random.uniform(-40, 1120):.0f}" cy="{random.uniform(640, 760):.0f}" r="{random.uniform(40, 80):.0f}" fill="{random.choice(["#8FA79A", "#7E9B8C", "#9DB3A4", "#88A293"])}"/>' for _ in range(40)) + '</g>'
    # 球场（俯视透视）
    hz, by = 790, 1010
    court = f'''
<path d="M0 {hz} H1080 V{by} H0 Z" fill="#4E8A70"/>
<path d="M150 {hz + 10} H930 L1060 {by} H20 Z" fill="#3F7B62"/>
<g stroke="#E9F0E6" stroke-width="3" fill="none" opacity=".85">
 <path d="M150 {hz + 10} H930 L1060 {by} H20 Z"/><path d="M230 {hz + 10} L130 {by} M850 {hz + 10} L950 {by}"/>
 <path d="M190 870 H890"/><path d="M540 870 L540 {by}"/></g>
<path d="M110 852 H970" stroke="#F4F1E6" stroke-width="5"/>
<path d="M118 852 V806 M962 852 V806" stroke="#2B4A3E" stroke-width="5"/>
<path d="M118 808 Q540 822 962 808" stroke="#F4F1E6" stroke-width="5" fill="none"/>
<g stroke="#2B4A3E" stroke-width="1" opacity=".5">{''.join(f'<path d="M{x} 810 V852"/>' for x in range(126, 962, 10))}{''.join(f'<path d="M118 {y} Q540 {y + 12} 962 {y}"/>' for y in range(818, 852, 8))}</g>
<g fill="#C9DAD6" opacity=".55" filter="url(#bl6)">
 <ellipse cx="330" cy="930" rx="110" ry="14"/><ellipse cx="760" cy="960" rx="150" ry="16"/><ellipse cx="620" cy="890" rx="70" ry="8"/></g>
{ball('fg86', 900, 900, 12)}'''
    # 铁丝网
    fence = '<g stroke="#5E7469" stroke-width="1.2" opacity=".45">' + ''.join(
        f'<path d="M{x} 600 L{x + 160} 790 M{x + 160} 600 L{x} 790"/>' for x in range(-160, 1100, 26)) + '</g>'
    posts = ''.join(f'<path d="M{x} 590 V792" stroke="#3E5249" stroke-width="6"/>' for x in (40, 300, 560, 820, 1060))
    # 雨（越往下越稀，快停了）
    rain = ''.join(f'<path d="M{x:.0f} {y:.0f} l-6 {random.uniform(18, 34):.0f}"/>' for x, y in
                   [(x, y) for x, y in [(random.uniform(0, 1080), random.uniform(0, 1) ** 2.2 * 640) for _ in range(70)] if not (x < 520 and 100 < y < 420)])
    # 角色 + 伞
    gy = 1192
    xm, xr, sc = 330, 600, 1.25
    def pair(sfx):
        return (f'<g transform="translate({xm} {gy}) scale({sc})" filter="url(#wc86)"><ellipse rx="70" ry="9" fill="#000" opacity=".14"/>{umbrella_man()}</g>'
                f'<g transform="translate({xr} {gy}) scale({sc})" filter="url(#wc86)"><ellipse rx="64" ry="9" fill="#000" opacity=".14"/>{rain_girl()}</g>')
    umb = ''
    drop = f'<path transform="translate({xr + 150*sc:.0f} {gy - 372*sc:.0f})" d="M0 -16 Q9 -2 9 4 A9 9 0 0 1 -9 4 Q-9 -2 0 -16Z" fill="#BFD9E4" stroke="#171412" stroke-width="2.4" filter="url(#rough2)"/>'
    # 前景地面 + 水洼倒影
    pud = '<ellipse cx="800" cy="1206" rx="190" ry="17"/>'
    refl = f'<g clip-path="url(#pc86)" opacity=".38"><g transform="translate(0 {2*gy}) scale(1 -1)">{pair("x")}</g></g>'
    body = f'''
<defs>
 <linearGradient id="bg86" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9BFBC"/><stop offset=".45" stop-color="#D4DDD3"/><stop offset=".62" stop-color="#EDE6D3"/></linearGradient>
 {wc_filter('wc86')}
 {wash('w86a', 31, '.005 .008', (.25, .32, .30), 1.5, -.55)}
 {wash('w86b', 7, '.02', (.45, .4, .32), 1.1, -.6)}
 <clipPath id="pc86">{pud}</clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg86)"/>
<rect width="{W}" height="800" filter="url(#w86a)" opacity=".5"/>
{hatch(900, 0, 0, W, 700, '#7C918C', .10, ang=-14, ln=(6, 14), w=1.1)}
<g stroke="#6F8A93" stroke-width="1.8" stroke-linecap="round" opacity=".4">{rain}</g>
{trees}
{fence}{posts}
{court}
<rect y="{by}" width="{W}" height="{H}" fill="#D9D3C2"/>
<path d="M0 {by} H1080" stroke="#B9B19C" stroke-width="4"/>
{hatch(500, 0, by, W, 1350, '#A59C86', .3, ang=-10, ln=(12, 26))}
<g fill="#B8CDD0">{pud}</g>
{refl}
<g fill="none" stroke="#F4F7F2" stroke-width="2" opacity=".7"><ellipse cx="900" cy="1206" rx="26" ry="5"/><ellipse cx="900" cy="1206" rx="48" ry="9" opacity=".5"/></g>
{pair('')}
{umb}
{drop}
<rect width="{W}" height="{H}" filter="url(#w86b)" opacity=".22"/>
{tag('AFTER THE RAIN', color='#0B3B2A', rule='#0B3B2A', op=.8, weight=700)}
{headline(META['lines'], y=290, size=64, colors=('#0B3B2A', '#C2410C'), lh=82)}
<path d="M0 1240 Q540 1214 1080 1240 V1350 H0 Z" fill="#0B3B2A"/>
{wordmark(1290, '#F3E6CC', sub=False, op=.95)}
{grain(.16, True)}'''
    return page(body)
