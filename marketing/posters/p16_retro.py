from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=16, slug='retro', title='复古', lines=['打球这件小事，', '值得认真约。'],
    style=['复古', '极简'], tone='浅色', demo=False,
    concept='70 年代彩虹弧线 + 米色底，不像一般体育海报',
    use='周边、线下物料',
)


def svg():
    cx,cy=540,950
    cols=["#E8643C","#F2B134","#176B4D","#C6EA3D","#F3E6CC"]
    rr=[520,430,340,250,170]
    half=''.join(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{c}"/>' for r,c in zip(rr,cols))
    stripes=''.join(f'<rect x="{cx-rr[0]+ (i*18)}" y="{cy+14+i*34}" width="{2*(rr[0]-i*18)}" height="{max(6,20-i*3)}" fill="{cols[i%4]}"/>' for i in range(6))
    body=f'''
<defs><clipPath id="top"><rect x="0" y="0" width="{W}" height="{cy}"/></clipPath></defs>
<rect width="{W}" height="{H}" fill="#F3E6CC"/>
<g clip-path="url(#top)">{half}</g>
{stripes}
{seamdisc(cx,cy-86,86,-22,fill="#176B4D",seam="#C6EA3D",id="rt")}
<g fill="#0B3B2A" text-anchor="middle">
 <text x="540" y="120" font-family="{SANS}" font-size="16" font-weight="700" letter-spacing="9">EST. MELBOURNE · NANBANQIU CLUB</text>
 <text x="540" y="240" font-family="{SERIF}" font-weight="900" font-size="82" letter-spacing="4">打球这件小事，</text>
 <text x="540" y="338" font-family="{SERIF}" font-weight="900" font-size="82" letter-spacing="4" fill="#E8643C">值得认真约。</text>
</g>
{wordmark(1268,"#0B3B2A",sub=False)}
{grain(.3,True)}'''
    return page(body)
