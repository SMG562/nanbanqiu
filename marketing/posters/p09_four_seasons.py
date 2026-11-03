from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=9, slug='four-seasons', title='一天四季', lines=['一天四季，', '球照打。'],
    style=['插画', '地域梗'], tone='浅色', demo=False,
    concept='墨尔本「一天四季」天气梗：晴阴雨风四扇拱窗各一颗球',
    use='朋友圈、小红书，共鸣最强',
)


def svg():
    xs=[64+i*244 for i in range(4)]
    names=[("晴","SUN"),("阴","CLOUD"),("雨","RAIN"),("风","WIND")]
    grads=[("#FFEBB0","#F6B14E"),("#DDE6EA","#A3B4C0"),("#7C92A2","#2E4554"),("#D3E6DA","#86BA99")]
    arch=''
    random.seed(5)
    for i,x in enumerate(xs):
        top,bot=520,1130
        d=f'M{x} {bot} V{top+110} A110 110 0 0 1 {x+220} {top+110} V{bot} Z'
        deco=''
        cx=x+110
        if i==0:
            deco=f'<circle cx="{cx}" cy="{top+170}" r="130" fill="#FFF6D6" opacity=".55" filter="url(#bl28)"/><circle cx="{cx}" cy="{top+170}" r="52" fill="#FFF8E0"/>'
        elif i==1:
            deco=''.join(f'<ellipse cx="{cx+dx}" cy="{top+cy}" rx="{rx}" ry="{ry}" fill="#fff" opacity="{o}" filter="url(#bl6)"/>' for dx,cy,rx,ry,o in ((-30,150,70,28,.85),(30,190,80,30,.7),(-10,250,90,32,.55),(40,120,50,20,.6)))
        elif i==2:
            for k in range(46):
                rx=x+random.randint(8,212); ry=random.randint(top+60,bot-160)
                deco+=f'<line x1="{rx}" y1="{ry}" x2="{rx-9}" y2="{ry+34}" stroke="#E8F2F8" stroke-width="2.4" stroke-linecap="round" opacity="{random.uniform(.3,.75):.2f}"/>'
            deco+=f'<ellipse cx="{cx}" cy="{top+150}" rx="90" ry="34" fill="#1b2f3b" opacity=".55" filter="url(#bl14)"/>'
        else:
            for k,yy in enumerate((top+170,top+230,top+300,top+370)):
                deco+=f'<path d="M{x-20} {yy} C {x+70} {yy-40}, {x+120} {yy+40}, {x+250} {yy-14}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="{.8-k*.12:.2f}"/>'
        arch+=f'''<defs><linearGradient id="ag{i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{grads[i][0]}"/><stop offset="1" stop-color="{grads[i][1]}"/></linearGradient><clipPath id="ac{i}"><path d="{d}"/></clipPath></defs>
<path d="{d}" fill="url(#ag{i})"/><g clip-path="url(#ac{i})">{deco}<rect x="{x}" y="{bot-150}" width="220" height="150" fill="#000" opacity=".12"/></g>
<ellipse cx="{cx+8}" cy="{bot-34}" rx="56" ry="9" fill="#000" opacity=".3" filter="url(#bl6)"/>{ball('w'+str(i),cx,bot-92,56,-22+i*18)}
<text x="{cx}" y="{bot+56}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="38" fill="#0B3B2A">{names[i][0]}</text>
<text x="{cx}" y="{bot+84}" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="13" fill="#0B3B2A" opacity=".6" letter-spacing="5">{names[i][1]}</text>'''
    body=f'''
<defs><radialGradient id="pp" cx="40%" cy="25%" r="90%"><stop offset="0" stop-color="#F8F2E6"/><stop offset="1" stop-color="#EADFC9"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#pp)"/>
<g fill="#0B3B2A">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="600" letter-spacing="9" opacity=".7">MELBOURNE · FOUR SEASONS IN ONE DAY</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#0B3B2A" stroke-width="3"/>
 <text x="80" y="330" font-family="{SERIF}" font-weight="900" font-size="112" letter-spacing="4">一天四季，</text>
 <text x="80" y="454" font-family="{SERIF}" font-weight="900" font-size="112" letter-spacing="4">球照打。</text>
</g>
{arch}
{wordmark(1270,"#0B3B2A",sub=False)}
{grain(.22,True)}'''
    return page(body)
