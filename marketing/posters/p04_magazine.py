from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=4, slug='magazine', title='杂志风', lines=['一个人练，', '不如两个人打。'],
    style=['排版'], tone='浅色', demo=False,
    concept='米色纸张 + 出血大球 + 粗衬线，杂志封面感',
    use='朋友圈、小红书浅色版面',
)


def svg():
    body=f'''
<defs>
<radialGradient id="paper" cx="40%" cy="30%" r="90%"><stop offset="0" stop-color="#F8F2E6"/><stop offset="1" stop-color="#EADFC9"/></radialGradient>
<radialGradient id="sun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD58A" stop-opacity=".7"/><stop offset="1" stop-color="#FFD58A" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#paper)"/>
<circle cx="900" cy="300" r="420" fill="url(#sun)"/>
<g stroke="#0B3B2A" stroke-width="2" opacity=".18" fill="none"><rect x="60" y="60" width="960" height="1230"/><line x1="60" y1="1090" x2="1020" y2="1090"/></g>
<!-- cropped giant ball -->
<ellipse cx="760" cy="1060" rx="330" ry="30" fill="#3b2a10" opacity=".28" filter="url(#bl14)"/>
{ball('p',760,740,330,-20)}
<g fill="#0B3B2A">
 <text x="96" y="130" font-family="{SANS}" font-size="16" font-weight="600" letter-spacing="9">NANBANQIU  /  VOL.01</text>
 <text x="1020" y="130" text-anchor="end" font-family="{SANS}" font-size="16" font-weight="600" letter-spacing="9" transform="translate(-24 0)">MELBOURNE</text>
 <text x="92" y="330" font-family="{SERIF}" font-weight="900" font-size="118" letter-spacing="2">一个人练，</text>
 
</g>
<g fill="#0B3B2A">
 <text x="96" y="1180" font-family="{SERIF}" font-weight="900" font-size="82" letter-spacing="2">不如两个人打。</text>
 <text x="98" y="1236" font-family="{SANS}" font-size="22" opacity=".7" letter-spacing="5">在墨尔本，找一个水平差不多的球搭子。</text>
</g>
<g transform="translate(0 0)">
 <circle cx="880" cy="1196" r="0" fill="none"/>
</g>
<g transform="translate(900 1160)"><rect x="-70" y="-6" width="170" height="64" rx="32" fill="#0B3B2A"/><text x="15" y="36" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="24" fill="#C6EA3D" letter-spacing="6">南伴球</text></g>
{grain(.22,True)}'''
    return page(body)
