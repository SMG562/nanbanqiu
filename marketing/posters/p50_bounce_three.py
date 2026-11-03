from lib import *

META = dict(
    id=50, slug='bounce-three', title='拍三下', lines=['发球前，', '先拍三下。'],
    style=['信息图', '极简', '手作'], tone='深色', demo=False,
    concept='深绿天空与荧光黄绿地面两大色块，三次拍球的弹跳轨迹（虚线 + 三颗球），地面上标 1 2 3；发球前的小仪式',
    use='发球 / 热身小细节；打过球的人都懂',
)


def svg():
    random.seed(50)
    gy, apex, x0, step = 1000, 520, 160, 253
    arcs, balls, nums = '', '', ''
    for k in range(3):
        a, b = x0 + step * k, x0 + step * (k + 1)
        m = (a + b) / 2
        arcs += f'<path d="M{a} {gy} Q{m} {gy - 2 * (gy - apex)} {b} {gy}" fill="none" stroke="#F7EBD6" stroke-width="3" stroke-dasharray="2 11" stroke-linecap="round" opacity=".7"/>'
        balls += ball(f'a{k}', m, apex + 34, 34, rot=-22 + 40 * k)
        nums += f'<text x="{m:.0f}" y="1112" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="72" fill="#0B3B2A">{k+1}</text>'
    dots = ''.join(f'<circle cx="{x0 + step * k}" cy="{gy + 20}" r="7" fill="#0B3B2A"/>' for k in range(4))
    body = f'''
<rect width="{W}" height="{H}" fill="#0B3B2A"/>
<circle cx="860" cy="260" r="260" fill="#176B4D" opacity=".5" filter="url(#bl60)"/>
<rect y="{gy}" width="{W}" height="190" fill="{C['lime']}"/>
<path d="M0 {gy} H1080" stroke="#E4F76A" stroke-width="3"/>
{arcs}{balls}{dots}{nums}
<ellipse cx="{x0+step*3}" cy="{gy-10}" rx="30" ry="6" fill="#000" opacity=".25" filter="url(#bl6)"/>
{ball('e', x0 + step * 3 + 0, gy - 34, 34, rot=15)}
{tag('BEFORE THE SERVE')}
{headline(META['lines'], y=290, size=60, colors=C['cream'], ls=3, lh=76)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
