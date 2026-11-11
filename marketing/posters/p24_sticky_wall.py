from lib import *

META = dict(
    id=24, slug='sticky-wall', title='便利贴墙', lines=['别人在找搭子，', '你被找到了。'],
    style=['插画', '排版', '手作'], tone='深色', demo=False,
    concept='一面写满“找人打球”的便利贴，只有一张被红笔圈出：有人约你了',
    use='邀约 / 约局：被约到的惊喜',
)

NOTES = [
    ('周六早上', '缺个对手'), ('有人打球吗？', '私我'), ('求同水平', '不嫌弃'),
    ('下雨了', '改期吗'), ('有人约你了', '球场见。'), ('新手一枚', '轻点打'),
    ('晚上七点', '谁有空？'), ('双打三缺一', '速来'), ('找固定搭子', '每周一次'),
]
COLORS = ['#F7EBD6', '#F2B134', '#F4B6A6', '#F3E6CC', '#C6EA3D', '#F7EBD6', '#F4B6A6', '#F2B134', '#F3E6CC']


def svg():
    random.seed(24)
    notes = ''
    for i, (a, b) in enumerate(NOTES):
        cx = 70 + 135 + (i % 3) * 335
        cy = 500 + 100 + (i // 3) * 230
        rot = random.uniform(-5, 5) if i != 4 else 2
        hi = i == 4
        notes += f'''<g transform="translate({cx} {cy}) rotate({rot:.1f})">
 <rect x="-130" y="-96" width="270" height="200" fill="#000" opacity=".28" filter="url(#bl6)"/>
 <rect x="-135" y="-100" width="270" height="200" fill="{COLORS[i]}"/>
 <rect x="-40" y="-114" width="80" height="26" fill="#fff" opacity=".35" transform="rotate({random.uniform(-6, 6):.1f})"/>
 <text y="-6" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="{34 if hi else 30}" letter-spacing="2" fill="#1A2A20">{a}</text>
 <text y="44" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="{34 if hi else 30}" letter-spacing="2" fill="{'#E5322D' if hi else '#1A2A20'}">{b}</text>
</g>'''
    ring = '<g filter="url(#rough2)"><ellipse cx="540" cy="832" rx="195" ry="138" transform="rotate(-3 540 832)" fill="none" stroke="#E5322D" stroke-width="9" stroke-linecap="round" stroke-dasharray="1100 40"/></g>'
    body = f'''
<rect width="{W}" height="{H}" fill="#0E5139"/>
<g opacity=".12" fill="#fff">{''.join(f'<circle cx="{x}" cy="{y}" r="2.5"/>' for x in range(30, 1080, 54) for y in range(30, 1350, 54))}</g>
{tag('SOMEONE ASKED YOU')}
{headline(META['lines'], y=330, size=96, colors=(C['cream'], C['lime']), ls=3)}
<g filter="url(#rough2)">{notes}</g>
{ring}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.2)}'''
    return page(body)
