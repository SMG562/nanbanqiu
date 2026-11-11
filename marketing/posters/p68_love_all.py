from lib import *

META = dict(
    id=68, slug='love-all', title='0 比 0', lines=['0 比 0，', '最友好的比分。'],
    style=['形似双关', '极简', '色块'], tone='深色', demo=False,
    concept='两颗巨大的网球并排当作两个 0，中间一个冒号；网球计分里 love 就是 0，开球前谁都没输',
    use='计分小常识的会心一笑；开场 / 新手友好',
)


def svg():
    random.seed(68)
    body = f'''
<defs><radialGradient id="bg68" cx="50%" cy="55%" r="75%"><stop offset="0" stop-color="#1E6F4D"/><stop offset="1" stop-color="#06231A"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg68)"/>
<ellipse cx="300" cy="1010" rx="220" ry="26" fill="#000" opacity=".4" filter="url(#bl28)"/><ellipse cx="780" cy="1010" rx="220" ry="26" fill="#000" opacity=".4" filter="url(#bl28)"/>
{ball('l1', 285, 760, 245, rot=-22)}{ball('l2', 795, 760, 245, rot=-22)}
<circle cx="540" cy="700" r="14" fill="{C['lime']}"/><circle cx="540" cy="810" r="14" fill="{C['lime']}"/>
<text x="540" y="1130" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="10" fill="{C['lime']}" opacity=".9">LOVE · ALL</text>
{tag('THE SCORE')}
{headline(META['lines'], y=290, size=64, colors=C['cream'], ls=3, lh=82)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
