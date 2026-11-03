from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=15, slug='radar', title='雷达', lines=['附近，总有人', '也想打球。'],
    style=['信息图'], tone='深色', demo=True,
    concept='雷达扫描附近球友，圈上标 1 / 3 / 5 / 10 km',
    use='讲「距离筛选 / 附近球友」',
)


def svg():
    random.seed(33)
    cx,cy,R=540,840,380
    rings=''.join(f'<circle cx="{cx}" cy="{cy}" r="{R*k/4}" fill="none" stroke="#C6EA3D" stroke-opacity="{.5 if k==4 else .25}" stroke-width="2" {"" if k==4 else "stroke-dasharray=\"4 10\""}/>' for k in (1,2,3,4))
    labs=''.join(f'<text x="{cx+10}" y="{cy-R*k/4+26}" font-family="{SANS}" font-size="17" fill="#C6EA3D" opacity=".75" letter-spacing="3">{t}</text>' for k,t in ((1,"1 km"),(2,"3 km"),(3,"5 km"),(4,"10 km")))
    dots=''
    for i in range(16):
        a=random.uniform(0,2*math.pi); r=random.uniform(60,R-20)
        x=cx+r*math.cos(a); y=cy+r*math.sin(a); big=i<4
        dots+=f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{26 if big else 14}" fill="#C6EA3D" opacity=".35" filter="url(#bl6)"/>'
        if big: dots+=f'<circle cx="{x:.0f}" cy="{y:.0f}" r="26" fill="none" stroke="#C6EA3D" stroke-opacity=".6" stroke-width="2"/>'
        dots+=f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{9 if big else 6}" fill="#E4F76A"/>'
    a0,a1=math.radians(-95),math.radians(-35)
    wedge=f'M{cx} {cy} L{cx+R*math.cos(a0)} {cy+R*math.sin(a0)} A{R} {R} 0 0 1 {cx+R*math.cos(a1)} {cy+R*math.sin(a1)} Z'
    body=f'''
<defs>
<radialGradient id="bg15" cx="50%" cy="62%" r="75%"><stop offset="0" stop-color="#14503a"/><stop offset="1" stop-color="#040F0A"/></radialGradient>
<radialGradient id="sw" cx="50%" cy="100%" r="100%" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#C6EA3D" stop-opacity=".55"/><stop offset="1" stop-color="#C6EA3D" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg15)"/>
<line x1="{cx-R}" y1="{cy}" x2="{cx+R}" y2="{cy}" stroke="#C6EA3D" stroke-opacity=".2"/><line x1="{cx}" y1="{cy-R}" x2="{cx}" y2="{cy+R}" stroke="#C6EA3D" stroke-opacity=".2"/>
{rings}<path d="{wedge}" fill="url(#sw)" filter="url(#bl6)"/>
{labs}{dots}
<circle cx="{cx}" cy="{cy}" r="70" fill="#C6EA3D" opacity=".35" filter="url(#bl14)"/>
{ball('rd',cx,cy,44,-22)}
<g fill="#F7EBD6">
 <text x="84" y="130" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".7">NEARBY · 附近</text>
 <line x1="84" y1="152" x2="150" y2="152" stroke="#C6EA3D" stroke-width="3"/>
 <text x="80" y="290" font-family="{SERIF}" font-weight="700" font-size="100" letter-spacing="4">附近，总有人</text>
 <text x="80" y="404" font-family="{SERIF}" font-weight="700" font-size="100" letter-spacing="4" fill="#C6EA3D">也想打球。</text>
</g>
{wordmark(1272,"#fff",sub=False)}
{grain(.18)}'''
    return page(body)
