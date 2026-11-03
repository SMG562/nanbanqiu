from lib import *

META = dict(
    id=38, slug='seek', title='球是求', lines=['球，', '就是求一个人。'],
    style=['排版', '双关', '极简'], tone='亮色', demo=False,
    concept='荧光黄绿底，巨大的「球」字，左边的「王」褪成淡影，右边的「求」实心——球，是求来的',
    use='约局号召：开口求一个人，就是开始',
)

GLYPH = 860
POLY = 'M100 260 L462 260 L462 445 L375 445 L375 492 L418 492 L418 560 L448 560 L448 640 L458 785 L400 832 L335 876 L335 1110 L100 1110 Z'
TF = 'translate(540 930) scale(.907) translate(-540 -1010)'


def svg():
    random.seed(38)
    ink = '#0B3B2A'
    gx, gy, cut = 540, 1010, 478
    g = lambda col, op=1: f'<text x="{gx}" y="{gy}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{GLYPH}" fill="{col}" opacity="{op}">球</text>'
    body = f'''
<defs><clipPath id="cl38"><path d="{POLY}"/></clipPath><clipPath id="cr38"><path clip-rule="evenodd" d="M-200 -200H1300V1500H-200Z {POLY}"/></clipPath></defs>
<rect width="{W}" height="{H}" fill="{C['lime']}"/>
<circle cx="980" cy="1180" r="360" fill="#B3D82B"/>
{tag('A BALL IS A REQUEST', color=ink, rule=ink, op=.85, weight=700)}
<g transform="{TF}"><g clip-path="url(#cl38)">{g(ink, .16)}</g><g clip-path="url(#cr38)">{g(ink)}</g></g>
{headline(META['lines'], x=84, y=1088, size=72, colors=ink, ls=3)}
{sub('球 = 王 + 求', 1000, 160, 22, ink, .8, 8, 'end')}
{wordmark(1268, ink, sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
