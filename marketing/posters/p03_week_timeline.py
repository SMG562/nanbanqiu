from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=3, slug='week-timeline', title='这周打几场', lines=['这周，', '打几场？'],
    style=['信息图'], tone='深色', demo=True,
    concept='把未来 7 天的球局画成时间轴，周六亮起一颗球，下面一张球局小卡片',
    use='讲「7 天球局」功能',
)


def svg():
    days=["今","周五","周六","周日","周一","周二","周三"]
    cols=''
    xs=[96+i*148 for i in range(7)]
    heights=[0.35,0.55,1.0,0.8,0.25,0.4,0.6]
    for i,(x,hh) in enumerate(zip(xs,heights)):
        cx=x+30
        hi = (i==2)
        top=830-int(230*hh)
        cols+=f'<line x1="{cx}" y1="{top+36}" x2="{cx}" y2="830" stroke="#F4FBE0" stroke-opacity="{.5 if hi else .18}" stroke-width="{3 if hi else 2}" stroke-dasharray="{"0" if hi else "3 9"}"/>'
        if hi:
            cols+=f'<circle cx="{cx}" cy="{top}" r="120" fill="#C6EA3D" opacity=".25" filter="url(#bl28)"/>'
            cols+=ball('c'+str(i),cx,top,44,-22)
        else:
            cols+=f'<circle cx="{cx}" cy="{top}" r="22" fill="#C6EA3D" opacity="{.35+.4*hh:.2f}"/>'
        cols+=f'<text x="{cx}" y="868" text-anchor="middle" font-family="{SANS}" font-size="22" font-weight="{700 if hi else 400}" fill="#fff" opacity="{1 if hi else .6}" letter-spacing="2">{days[i]}</text>'
        cols+=f'<text x="{cx}" y="900" text-anchor="middle" font-family="{SANS}" font-size="14" fill="#fff" opacity=".4" letter-spacing="2">{["THU","FRI","SAT","SUN","MON","TUE","WED"][i]}</text>'
    body=f'''
<defs>
<linearGradient id="bg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0A1F1A"/><stop offset=".6" stop-color="#0B3B2A"/><stop offset="1" stop-color="#06140F"/></linearGradient>
<radialGradient id="lamp" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".45"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg3)"/>
<rect width="{W}" height="900" fill="url(#lamp)"/>
<g filter="url(#bl28)"><circle cx="180" cy="120" r="50" fill="#FFD9A0" opacity=".5"/><circle cx="520" cy="80" r="64" fill="#FFD9A0" opacity=".45"/><circle cx="900" cy="130" r="56" fill="#FFD9A0" opacity=".5"/></g>
<g fill="#F7EBD6">
 <text x="84" y="190" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".7">THIS WEEK · 7 DAYS</text>
 <line x1="84" y1="216" x2="150" y2="216" stroke="#C6EA3D" stroke-width="3"/>
 <text x="80" y="360" font-family="{SERIF}" font-weight="700" font-size="120" letter-spacing="4">这周，</text>
 <text x="80" y="490" font-family="{SERIF}" font-weight="700" font-size="120" letter-spacing="4">打几场？</text>
</g>
{cols}
<!-- card -->
<g transform="translate(84 960)">
 <rect width="912" height="150" rx="28" fill="#fff" opacity=".08" stroke="#fff" stroke-opacity=".18"/>
 <circle cx="75" cy="75" r="30" fill="#C6EA3D"/><text x="75" y="85" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="28" fill="#0B3B2A">4</text>
 <text x="130" y="64" font-family="{SANS}" font-size="30" font-weight="700" fill="#fff" letter-spacing="2">周六 09:00 · 双打 · 缺 1 人</text>
 <text x="130" y="108" font-family="{SANS}" font-size="22" fill="#fff" opacity=".65" letter-spacing="2">水平接近 · 离你 3 km · 点一下就能申请</text>
</g>
<text x="540" y="1190" text-anchor="middle" font-family="{SANS}" font-size="22" fill="#fff" opacity=".7" letter-spacing="6">未来 7 天的球局，都在这里</text>
{wordmark(1262,"#fff")}
{grain(.18)}'''
    return page(body)
