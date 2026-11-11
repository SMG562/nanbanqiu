from lib import *

META = dict(
    id=71, slug='net-dip', title='球网中间矮一截', lines=['中间矮 15 厘米，', '球还是挂了。'],
    style=['冷知识', '信息图', '写实光影'], tone='深色', demo=False,
    concept='球网正视图：两端立柱 1.07 米、中间 0.914 米，网顶下垂，标注矮出的 15 厘米；一颗球偏偏挂在网上',
    use='器材规则冷知识；下网的小尴尬',
)


def svg():
    random.seed(71)
    body = f'''
<defs>
 <linearGradient id="bg71" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E4A33"/><stop offset="1" stop-color="#06231A"/></linearGradient>
 <pattern id="mesh71" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M0 0 H26 M0 0 V26" stroke="#F7EBD6" stroke-width="2" opacity=".5"/></pattern>
 <clipPath id="nt71"><path d="M120 500 Q540 780 960 500 L960 860 L120 860 Z"/></clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg71)"/>
<rect y="900" width="{W}" height="450" fill="#145A3E"/><rect y="900" width="{W}" height="4" fill="#F7EBD6" opacity=".6"/>
<path d="M120 500 Q540 780 960 500 L960 860 L120 860 Z" fill="#000" opacity=".28"/>
<rect x="100" y="400" width="1" height="1" fill="none"/>
<g clip-path="url(#nt71)"><rect x="100" y="480" width="880" height="400" fill="url(#mesh71)"/></g>
<path d="M120 860 H960" stroke="#F7EBD6" stroke-width="10" opacity=".9"/>
<path d="M120 500 Q540 780 960 500" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round"/>
<path d="M540 640 V900" stroke="#fff" stroke-width="12"/><path d="M522 900 L540 880 L558 900Z" fill="#fff"/>
<rect x="96" y="470" width="28" height="440" rx="6" fill="#1B1F22"/><rect x="956" y="470" width="28" height="440" rx="6" fill="#1B1F22"/>
<path d="M130 500 H970" stroke="{C['lime']}" stroke-width="3" stroke-dasharray="4 10" opacity=".9"/>
<path d="M700 502 V638" stroke="{C['lime']}" stroke-width="4"/><path d="M690 514 L700 502 L710 514 M690 626 L700 638 L710 626" fill="none" stroke="{C['lime']}" stroke-width="4" stroke-linecap="round"/>
<text x="728" y="478" font-family="{SERIF}" font-weight="900" font-size="46" fill="{C['lime']}">15 cm</text>
<text x="136" y="456" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="3" fill="#F7EBD6" opacity=".85">立柱 1.07 m</text>
<text x="540" y="600" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="3" fill="#F7EBD6" opacity=".9">中间 0.914 m</text>
<ellipse cx="548" cy="752" rx="48" ry="9" fill="#000" opacity=".35" filter="url(#bl6)"/>
{ball('n', 548, 708, 48, rot=30)}
<path d="M470 690 q78 22 160 0" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>
{tag('NET HEIGHT')}
{headline(META['lines'], y=290, size=60, colors=C['cream'], ls=3, lh=78)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
