from lib import *

META = dict(
    id=65, slug='sunny-busy', title='好不容易放晴，球友都忙了', lines=['好不容易放晴，', '球友都忙了。'],
    style=['色块', '信息图', '幽默'], tone='亮色', demo=False,
    concept='上半是万里无云的蓝天与完美的空球场，下半是一张消息列表卡：这周末有事 / 下周吧 / 已读；天晴了，人没了',
    use='久雨初晴约不到人；约球的无奈',
)


def svg():
    random.seed(65)
    rows = [('#F29A5E', '这周末有事'), ('#6FB4F0', '下周吧'), ('#C6EA3D', '已读')]
    out = ''
    for i, (col, tx) in enumerate(rows):
        y = 840 + i * 118
        out += f'<circle cx="150" cy="{y+40}" r="34" fill="{col}"/><rect x="214" y="{y+10}" width="130" height="16" rx="8" fill="#0B3B2A" opacity=".18"/><text x="214" y="{y+68}" font-family="{SERIF}" font-weight="900" font-size="40" fill="#0B3B2A">{tx}</text>'
        if i < 2:
            out += f'<path d="M110 {y+98} H970" stroke="#0B3B2A" stroke-width="2" opacity=".1"/>'
    body = f'''
<defs><linearGradient id="sk65" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FA8EE"/><stop offset="1" stop-color="#CFE9FA"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#sk65)"/>
<circle cx="880" cy="250" r="90" fill="#FFF3B8"/><circle cx="880" cy="250" r="230" fill="#FFF3B8" opacity=".4" filter="url(#bl60)"/>
<rect y="640" width="{W}" height="710" fill="#3FA062"/><rect y="640" width="{W}" height="6" fill="#F7EBD6" opacity=".7"/>
<path d="M0 720 H1080 M540 646 V800" stroke="#F7EBD6" stroke-width="4" opacity=".4"/>
<rect x="210" y="590" width="660" height="52" fill="#0B3B2A" opacity=".5"/><rect x="210" y="586" width="660" height="8" fill="#fff"/>
{ball('s', 540, 700, 34, rot=25)}<ellipse cx="544" cy="728" rx="34" ry="7" fill="#000" opacity=".3" filter="url(#bl6)"/>
<rect x="70" y="780" width="940" height="390" rx="34" fill="#F7EBD6"/>
<rect x="70" y="780" width="940" height="390" rx="34" fill="#000" opacity=".0"/>
{out}
{tag('FINALLY SUNNY', color='#0B3B2A', rule='#0B3B2A')}
{headline(META['lines'], y=290, size=62, colors='#0B3B2A', ls=3, lh=80)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.14, True)}'''
    return page(body)
