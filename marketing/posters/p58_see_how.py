from lib import *

META = dict(
    id=58, slug='see-how', title='看情况', lines=['他回：', '看情况。'],
    style=['信息图', '色块', '幽默'], tone='亮色', demo=False,
    concept='荧光黄绿大色块上三个聊天气泡：我「周六打球？」，对方「看情况」，之后是对方“正在输入…”的三个点，时间从 10:42 到 15:07',
    use='约球被敷衍的小心思；等回复的小尴尬',
)


def svg():
    random.seed(58)
    body = f'''
<rect width="{W}" height="{H}" fill="{C['lime']}"/>
<circle cx="900" cy="300" r="320" fill="#D8F56A" opacity=".6" filter="url(#bl60)"/>
<g font-family="{SERIF}" font-weight="900">
 <rect x="560" y="470" width="440" height="140" rx="44" fill="#0B3B2A"/><path d="M960 590 q40 4 56 34 q-40 4 -64 -20Z" fill="#0B3B2A"/>
 <text x="780" y="560" text-anchor="middle" font-size="58" fill="#F7EBD6">周六打球？</text>
 <text x="1000" y="650" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="22" letter-spacing="3" fill="#0B3B2A" opacity=".7">已读 10:42</text>
 <rect x="80" y="710" width="340" height="140" rx="44" fill="#fff"/><path d="M120 830 q-40 4 -56 34 q40 4 64 -20Z" fill="#fff"/>
 <text x="250" y="800" text-anchor="middle" font-size="58" fill="#0B3B2A">看情况</text>
 <rect x="80" y="920" width="230" height="110" rx="40" fill="#fff" opacity=".85"/>
</g>
<circle cx="140" cy="975" r="13" fill="#0B3B2A" opacity=".35"/><circle cx="195" cy="975" r="13" fill="#0B3B2A" opacity=".6"/><circle cx="250" cy="975" r="13" fill="#0B3B2A" opacity=".95"/>
<text x="80" y="1082" font-family="{SANS}" font-weight="700" font-size="22" letter-spacing="3" fill="#0B3B2A" opacity=".7">正在输入…  15:07</text>
{tag('MAYBE', color='#0B3B2A', rule='#0B3B2A')}
{headline(META['lines'], y=290, size=64, colors='#0B3B2A', ls=3, lh=82)}
<rect y="1180" width="{W}" height="170" fill="#0B3B2A"/>
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.16, True)}'''
    return page(body)
