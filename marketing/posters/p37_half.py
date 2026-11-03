from lib import *

META = dict(
    id=37, slug='half', title='一个人是半', lines=['一个人，是半。', '两个人，才是伴。'],
    style=['排版', '双关', '极简'], tone='深色', demo=False,
    concept='巨大的「伴」字拆成「亻＋半」：荧光黄绿的「半」，被拉开的单人旁；品牌名里就有这个字',
    use='品牌理念海报：为什么叫南伴球',
)

GLYPH = 700
POLY = 'M0 0 H408 V742 H420 V800 H408 V1350 H0 Z'


def svg():
    random.seed(37)
    gx, gy, cut, shift = 540, 1135, 392, 70
    g = lambda col: f'<text x="{gx}" y="{gy}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{GLYPH}" fill="{col}">伴</text>'
    body = f'''
<defs><radialGradient id="bg37" cx="62%" cy="62%" r="85%"><stop offset="0" stop-color="#14573F"/><stop offset="1" stop-color="#04180F"/></radialGradient>
<clipPath id="cl37"><path d="{POLY}"/></clipPath><clipPath id="cr37"><path clip-rule="evenodd" d="M0 0H1080V1350H0Z {POLY}"/></clipPath></defs>
<rect width="{W}" height="{H}" fill="url(#bg37)"/>
{tag('ONE + ONE')}
{headline(META['lines'], y=300, size=76, colors=(C['cream'], C['lime']), ls=3)}
<g transform="translate({-shift} 0)"><g clip-path="url(#cl37)">{g(C['cream'])}</g></g>
<g clip-path="url(#cr37)">{g(C['lime'])}</g>
<g stroke="#F7EBD6" stroke-width="2.5" stroke-dasharray="3 10" stroke-linecap="round" opacity=".6"><path d="M{cut-shift//2} 540 V1220"/></g>
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
