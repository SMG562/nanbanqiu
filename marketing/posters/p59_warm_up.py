from lib import *

META = dict(
    id=59, slug='warm-up', title='等人热身', lines=['等人时，', '热身热了三遍。'],
    style=['手作', '信息图', '幽默'], tone='深色', demo=False,
    concept='深绿黑板上粉笔手写的热身清单：7:00 小跑、7:08 拉伸、7:15 对墙小球、7:22 再拉伸、7:30 再热身一下（没勾）',
    use='等人 / 迟到的小心思；打过球的人都懂',
)


def svg():
    random.seed(59)
    rows = [('7:00', '小跑', 1), ('7:08', '拉伸', 1), ('7:15', '对墙小球', 1), ('7:22', '又拉伸一遍', 1), ('7:30', '再热身一下', 0)]
    out = ''
    for i, (t, a, ok) in enumerate(rows):
        y = 560 + i * 130
        out += f'<text x="130" y="{y}" font-family="{SANS}" font-weight="700" font-size="40" letter-spacing="3" fill="{C["lime"]}" opacity=".9">{t}</text>'
        out += f'<text x="320" y="{y}" font-family="{SERIF}" font-weight="900" font-size="64" fill="#F7EBD6" opacity=".92">{a}</text>'
        if ok:
            out += f'<path d="M860 {y-34} l30 34 l62 -78" fill="none" stroke="#F7EBD6" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>'
        else:
            out += f'<rect x="864" y="{y-70}" width="80" height="80" rx="6" fill="none" stroke="#F7EBD6" stroke-width="7" opacity=".9"/><text x="956" y="{y+4}" font-family="{SANS}" font-weight="700" font-size="30" fill="{C["lime"]}">…</text>'
        out += f'<path d="M110 {y+34} H960" stroke="#F7EBD6" stroke-width="2" opacity=".18"/>'
    dust = ''.join(f'<circle cx="{random.uniform(0,1080):.0f}" cy="{random.uniform(300,1200):.0f}" r="{random.uniform(1,3):.1f}" fill="#fff" opacity="{random.uniform(.05,.2):.2f}"/>' for _ in range(160))
    body = f'''
<defs><radialGradient id="bg59" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#1F6B4C"/><stop offset="1" stop-color="#082219"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg59)"/>{dust}
<rect x="60" y="440" width="960" height="760" rx="24" fill="none" stroke="#F7EBD6" stroke-width="2" opacity=".12"/>
<g filter="url(#rough)">{out}</g>
<ellipse cx="560" cy="1196" rx="120" ry="12" fill="#F7EBD6" opacity=".1" filter="url(#bl6)"/>
{tag('WARMING UP')}
{headline(META['lines'], y=290, size=62, colors=C['cream'], ls=3, lh=80)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.2)}'''
    return page(body)
