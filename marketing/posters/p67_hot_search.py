from lib import *

META = dict(
    id=67, slug='hot-search', title='约球热搜榜', lines=['约球热搜榜。'],
    style=['信息图', 'UI', '幽默'], tone='亮色', demo=False,
    concept='十条榜单，全是约球群里的真实心态：周六下雨、看情况、最后一个球、等人热身、怕断线又怕不断……带热、新、爆标签',
    use='把前面所有小毛病串成一张；社交传播',
)


def svg():
    random.seed(67)
    items = [('周六下雨，改期', '爆'), ('对方回了：看情况', '热'), ('说好，最后一个球', '热'), ('等人时，热身三遍', '新'), ('怕断线，又怕不断', ''),
             ('停车场认人，靠球包', ''), ('周六降雨概率 30%', '热'), ('说好，随便打打', ''), ('我才没在等', '新'), ('袜子，又红了', '')]
    heat = [998, 861, 740, 655, 602, 548, 497, 430, 388, 312]
    tagc = {'爆': '#E8472C', '热': '#F29A2E', '新': '#2E8C8A'}
    rows = ''
    for i, ((t, g), h) in enumerate(zip(items, heat)):
        y = 566 + i * 64
        nc = '#E8472C' if i == 0 else '#F29A2E' if i == 1 else '#D9A441' if i == 2 else '#8A8F86'
        rows += f'<text x="110" y="{y}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="40" fill="{nc}">{i+1}</text>'
        rows += f'<text x="170" y="{y}" font-family="{SERIF}" font-weight="900" font-size="38" fill="#0B3B2A">{t}</text>'
        if g:
            tw = 170 + sum(38 if ord(c) > 255 else 20 for c in t) + 18
            rows += f'<rect x="{tw}" y="{y-30}" width="40" height="40" rx="9" fill="{tagc[g]}"/><text x="{tw+20}" y="{y+1}" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="24" fill="#fff">{g}</text>'
        rows += f'<text x="990" y="{y}" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="24" fill="#0B3B2A" opacity=".5">{h}.{(i*37)%10}万</text>'
        rows += f'<path d="M70 {y+22} H1010" stroke="#0B3B2A" stroke-width="2" opacity=".1"/>'
    body = f'''
<rect width="{W}" height="{H}" fill="#F3E6CC"/>
<rect x="50" y="440" width="980" height="770" rx="30" fill="#FFF8E8"/>
<rect x="50" y="440" width="980" height="12" rx="6" fill="#E8472C"/>
<text x="110" y="494" font-family="{SANS}" font-weight="700" font-size="22" letter-spacing="4" fill="#0B3B2A" opacity=".55">本周 · 约球群</text>
<text x="990" y="494" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="22" letter-spacing="2" fill="#0B3B2A" opacity=".55">热度</text>
{rows}
{tag('THIS WEEK', color='#0B3B2A', rule='#E8472C')}
{headline(META['lines'], y=290, size=64, colors='#0B3B2A', ls=3)}
<rect y="1230" width="{W}" height="120" fill="#0B3B2A"/>
{wordmark(1290, '#F7EBD6', sub=False, op=.95)}
{grain(.14, True)}'''
    return page(body)
