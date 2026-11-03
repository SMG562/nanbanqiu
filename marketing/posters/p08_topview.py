from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=8, slug='topview', title='俯视球场', lines=['来回之间，', '就认识了。'],
    style=['信息图'], tone='深色', demo=False,
    concept='正上方看球场，虚线弧线连起一次来回，强调认识朋友',
    use='讲社交、认识新朋友',
)


def svg():
    x0,x1,y0,y1=60,1020,580,1022
    h=y1-y0; w=x1-x0; cx=(x0+x1)/2
    ins=h*0.125; sv=w/2*(6.4/11.89)
    L=f'<rect x="{x0}" y="{y0}" width="{w}" height="{h}"/><line x1="{x0}" y1="{y0+ins}" x2="{x1}" y2="{y0+ins}"/><line x1="{x0}" y1="{y1-ins}" x2="{x1}" y2="{y1-ins}"/><line x1="{cx-sv}" y1="{y0+ins}" x2="{cx-sv}" y2="{y1-ins}"/><line x1="{cx+sv}" y1="{y0+ins}" x2="{cx+sv}" y2="{y1-ins}"/><line x1="{cx-sv}" y1="{(y0+y1)/2}" x2="{cx+sv}" y2="{(y0+y1)/2}"/>'
    body=f'''
<defs>
<radialGradient id="bg8" cx="50%" cy="48%" r="75%"><stop offset="0" stop-color="#12382c"/><stop offset="1" stop-color="#040f0a"/></radialGradient>
<linearGradient id="ct8" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E7E59"/><stop offset="1" stop-color="#0E5139"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg8)"/>
<g filter="url(#bl60)"><circle cx="40" cy="480" r="150" fill="#FFC27A" opacity=".4"/><circle cx="1040" cy="1000" r="170" fill="#FFC27A" opacity=".3"/></g>
<rect x="{x0-30}" y="{y0-30}" width="{w+60}" height="{h+60}" rx="10" fill="#082a1e"/>
<rect x="{x0}" y="{y0}" width="{w}" height="{h}" fill="url(#ct8)"/>
<g fill="none" stroke="#F4FBE0" stroke-width="4" opacity=".85">{L}</g>
<line x1="{cx}" y1="{y0-24}" x2="{cx}" y2="{y1+24}" stroke="#fff" stroke-width="8" opacity=".9"/>
<line x1="{cx}" y1="{y0-24}" x2="{cx}" y2="{y1+24}" stroke="#0B3B2A" stroke-width="2" stroke-dasharray="3 5"/>
<!-- rally -->
<path d="M{x0+110} {y0+h/2+60} Q {cx} {y0-260} {x1-110} {y0+h/2+60}" fill="none" stroke="#C6EA3D" stroke-width="5" stroke-dasharray="2 16" stroke-linecap="round" opacity=".9"/>
<path d="M{x0+110} {y0+h/2+60} Q {cx} {y1+240} {x1-110} {y0+h/2+60}" fill="none" stroke="#F4FBE0" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round" opacity=".3"/>
<circle cx="{x0+110}" cy="{y0+h/2+60}" r="60" fill="#C6EA3D" opacity=".28" filter="url(#bl14)"/>
<circle cx="{x1-110}" cy="{y0+h/2+60}" r="60" fill="#C6EA3D" opacity=".28" filter="url(#bl14)"/>
{ball('l',x0+110,y0+h/2+60,34,-22)}
{ball('r',x1-110,y0+h/2+60,34,28)}
<circle cx="{cx}" cy="{y0+h/2+60-((y0+h/2+60)-(y0-260))*0.5}" r="70" fill="#C6EA3D" opacity=".3" filter="url(#bl14)"/>
{ball('mid',cx,(y0+h/2+60)*0.5+(y0-260)*0.5*1.0 - 0,40,10)}
<g fill="#F7EBD6">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".7">RALLY</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#C6EA3D" stroke-width="3"/>
 <text x="80" y="330" font-family="{SERIF}" font-weight="700" font-size="112" letter-spacing="4">来回之间，</text>
 <text x="80" y="454" font-family="{SERIF}" font-weight="700" font-size="112" letter-spacing="4" fill="#C6EA3D">就认识了。</text>
 <text x="84" y="1170" font-family="{SANS}" font-size="24" letter-spacing="6" opacity=".8">打几场球，多几个朋友。</text>
</g>
{wordmark(1262,"#fff")}
{grain(.2)}'''
    return page(body)
