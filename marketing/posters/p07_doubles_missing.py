from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=7, slug='doubles-missing', title='缺一人', lines=['双打缺一人，', '就等你了。'],
    style=['极简', '图标构图'], tone='亮色', demo=False,
    concept='三颗深绿球 + 一个虚线圆里的「你」，荧光黄绿满底',
    use='招募、拉新、最直接',
)


def svg():
    pts=[(330,370),(750,370),(330,790)]
    discs=''.join(seamdisc(x,y,170,r,id=f"d{i}") for i,((x,y),r) in enumerate(zip(pts,(-22,28,-40))))
    body=f'''
<defs><radialGradient id="bg7" cx="30%" cy="20%" r="95%"><stop offset="0" stop-color="#E4F76A"/><stop offset="1" stop-color="#B8DC30"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg7)"/>
<g fill="#0B3B2A"><text x="84" y="124" font-family="{SANS}" font-size="17" font-weight="700" letter-spacing="9">DOUBLES · 3 / 4</text></g>
{discs}
<circle cx="750" cy="790" r="164" fill="none" stroke="#0B3B2A" stroke-width="6" stroke-dasharray="4 20" stroke-linecap="round"/>
<text x="750" y="850" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="190" fill="#0B3B2A">你</text>
<g fill="#0B3B2A">
 <text x="80" y="1100" font-family="{SERIF}" font-weight="900" font-size="108" letter-spacing="4">双打缺一人，</text>
 <text x="80" y="1220" font-family="{SERIF}" font-weight="900" font-size="108" letter-spacing="4">就等你了。</text>
 <text x="84" y="1290" font-family="{SANS}" font-size="20" font-weight="600" letter-spacing="7">南伴球 · 墨尔本华人网球约局</text>
</g>
{grain(.22,True)}'''
    return page(body)
