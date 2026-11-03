from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=5, slug='level', title='水平仪', lines=['水平差不多，', '才打得开心。'],
    style=['双关', '信息图'], tone='深色', demo=False,
    concept='把「水平」做成字面意思：水平仪的气泡是一颗球',
    use='讲「按水平匹配」卖点',
)


def svg():
    ticks=''.join(f'<line x1="{x}" y1="800" x2="{x}" y2="{800+(26 if (x-100)%100==0 else 14)}" stroke="#0B3B2A" stroke-width="3" opacity=".55"/>' for x in range(100,990,20))
    body=f'''
<defs>
<radialGradient id="bg5" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#1E7E59"/><stop offset=".6" stop-color="#0E5139"/><stop offset="1" stop-color="#05190F"/></radialGradient>
<linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4F76A"/><stop offset=".5" stop-color="#C6EA3D"/><stop offset="1" stop-color="#9DBF28"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F8FDE4"/><stop offset=".5" stop-color="#D9EE8A"/><stop offset="1" stop-color="#A9CB3D"/></linearGradient>
<linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg5)"/>
<ellipse cx="540" cy="760" rx="520" ry="200" fill="#C6EA3D" opacity=".18" filter="url(#bl60)"/>
<g fill="#F7EBD6">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".7">LEVEL · 水平</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#C6EA3D" stroke-width="3"/>
 <text x="80" y="330" font-family="{SERIF}" font-weight="700" font-size="104" letter-spacing="4">水平差不多，</text>
 <text x="80" y="454" font-family="{SERIF}" font-weight="700" font-size="104" letter-spacing="4" fill="#C6EA3D">才打得开心。</text>
</g>
<ellipse cx="540" cy="900" rx="440" ry="30" fill="#000" opacity=".5" filter="url(#bl14)"/>
<rect x="60" y="590" width="960" height="230" rx="44" fill="url(#bar)"/>
<rect x="60" y="590" width="960" height="230" rx="44" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
<rect x="80" y="600" width="920" height="40" rx="20" fill="url(#shine)" opacity=".5"/>
<circle cx="130" cy="705" r="26" fill="#0B3B2A" opacity=".85"/><circle cx="950" cy="705" r="26" fill="#0B3B2A" opacity=".85"/>
<rect x="210" y="620" width="660" height="170" rx="85" fill="#0B3B2A" opacity=".35"/>
<rect x="216" y="626" width="648" height="158" rx="79" fill="url(#glass)"/>
<rect x="240" y="636" width="600" height="38" rx="19" fill="#fff" opacity=".55"/>
<line x1="440" y1="626" x2="440" y2="784" stroke="#0B3B2A" stroke-width="4" opacity=".75"/><line x1="640" y1="626" x2="640" y2="784" stroke="#0B3B2A" stroke-width="4" opacity=".75"/>
{ball('lv',540,705,66,-22)}
{ticks}
<text x="540" y="1010" text-anchor="middle" font-family="{SANS}" font-size="24" fill="#fff" opacity=".75" letter-spacing="7">按水平匹配，约到刚刚好的对手</text>
{wordmark(1262,"#fff")}
{grain(.18)}'''
    return page(body)
