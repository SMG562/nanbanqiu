from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=13, slug='ticket', title='球票', lines=['给周末，', '一张球票。'],
    style=['插画', '信息图'], tone='深色', demo=True,
    concept='把一场球局做成带撕线的票根',
    use='朋友圈、小红书，很适合转发',
)


def svg():
    random.seed(9)
    bars=''; x=-410
    while x<-170:
        w=random.choice([3,3,5,8]); bars+=f'<rect x="{x}" y="128" width="{w}" height="58" fill="#0B3B2A"/>'; x+=w+random.choice([4,6,8])
    body=f'''
<defs>
<radialGradient id="bg13" cx="50%" cy="55%" r="80%"><stop offset="0" stop-color="#1E7E59"/><stop offset=".6" stop-color="#0E5139"/><stop offset="1" stop-color="#04180F"/></radialGradient>
<mask id="tk" maskUnits="userSpaceOnUse" x="-470" y="-250" width="940" height="500"><rect x="-440" y="-220" width="880" height="440" rx="28" fill="#fff"/><circle cx="190" cy="-220" r="24" fill="#000"/><circle cx="190" cy="220" r="24" fill="#000"/></mask>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg13)"/>
<circle cx="540" cy="860" r="380" fill="#C6EA3D" opacity=".16" filter="url(#bl60)"/>
<g fill="#F7EBD6">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".7">ADMIT ONE</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#C6EA3D" stroke-width="3"/>
 <text x="80" y="330" font-family="{SERIF}" font-weight="700" font-size="112" letter-spacing="4">给周末，</text>
 <text x="80" y="454" font-family="{SERIF}" font-weight="700" font-size="112" letter-spacing="4" fill="#C6EA3D">一张球票。</text>
</g>
<g transform="translate(540 880) rotate(-5)">
 <rect x="-420" y="-190" width="880" height="440" rx="28" fill="#000" opacity=".5" filter="url(#bl28)"/>
 <g mask="url(#tk)"><rect x="-440" y="-220" width="880" height="440" fill="#F7EBD6"/><rect x="190" y="-220" width="250" height="440" fill="#C6EA3D"/><rect x="-440" y="-220" width="630" height="12" fill="#0B3B2A"/></g>
 <line x1="190" y1="-190" x2="190" y2="190" stroke="#0B3B2A" stroke-width="3" stroke-dasharray="3 11" stroke-linecap="round" opacity=".7"/>
 <g fill="#0B3B2A">
  <text x="-400" y="-150" font-family="{SANS}" font-size="16" font-weight="700" letter-spacing="7">南伴球 · 墨尔本网球约局</text>
  <text x="-402" y="-40" font-family="{SERIF}" font-weight="900" font-size="104" letter-spacing="2">周六 09:00</text>
  <text x="-400" y="30" font-family="{SANS}" font-size="32" font-weight="700" letter-spacing="4">双打 · 缺 1 人</text>
  <text x="-400" y="76" font-family="{SANS}" font-size="22" opacity=".65" letter-spacing="3">水平接近 · 离你 3 km</text>
  {bars}
  <text x="315" y="-150" text-anchor="middle" font-family="{SANS}" font-size="14" font-weight="700" letter-spacing="6">NO. 0001</text>
 </g>
 {seamdisc(315,-30,74,-22,fill="#0B3B2A",seam="#C6EA3D",id="tk1")}
 <text x="315" y="110" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="40" fill="#0B3B2A" letter-spacing="3">一场球</text>
 <text x="315" y="152" text-anchor="middle" font-family="{SANS}" font-size="14" font-weight="700" fill="#0B3B2A" letter-spacing="6" opacity=".7">ONE GAME</text>
</g>
{wordmark(1268,"#fff",sub=False)}
{grain(.18)}'''
    return page(body)
