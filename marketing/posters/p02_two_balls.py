from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=2, slug='two-balls', title='球有了就差你', lines=['球有了，', '就差你。'],
    style=['图标构图'], tone='深色', demo=False,
    concept='App 图标的大球 + 小球做成大尺寸主形象，标题后半句用荧光黄绿',
    use='开屏、招募、公众号头图',
)


def svg():
    import random; random.seed(11)
    bok=''
    for i in range(22):
        x=random.randint(0,W); y=random.randint(0,H); r=random.randint(20,90)
        bok+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="{random.choice(["#C6EA3D","#7BD389","#E4F76A","#1E7E59"])}" opacity="{random.uniform(.05,.16):.2f}"/>'
    body=f'''
<defs>
<radialGradient id="bg2" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#1E7E59"/><stop offset=".55" stop-color="#0E5139"/><stop offset="1" stop-color="#04180F"/></radialGradient>
<radialGradient id="spot" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#C6EA3D" stop-opacity=".35"/><stop offset="1" stop-color="#C6EA3D" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg2)"/>
<g filter="url(#bl28)">{bok}</g>
<ellipse cx="500" cy="640" rx="520" ry="520" fill="url(#spot)"/>
<!-- court line hints -->
<g stroke="#F4FBE0" stroke-width="3" opacity=".16" fill="none"><line x1="0" y1="1010" x2="{W}" y2="1010"/><line x1="540" y1="1010" x2="540" y2="{H}"/><path d="M-100 1350 L 330 1010 M1180 1350 L 750 1010"/></g>
<ellipse cx="700" cy="1000" rx="360" ry="34" fill="#000" opacity=".4" filter="url(#bl14)"/>
<ellipse cx="500" cy="1010" rx="360" ry="34" fill="#000" opacity=".45" filter="url(#bl14)"/>
<g>{ball('a',470,610,300,-22)}</g>
<!-- cutout ring like icon -->
<circle cx="786" cy="858" r="206" fill="#0E5139"/>
{ball('b',786,858,180,28)}
<g fill="#fff">
 <text x="540" y="150" text-anchor="middle" font-family="{SANS}" font-size="17" letter-spacing="10" opacity=".7" font-weight="500">TWO BALLS · ONE GAME</text>
 <text x="540" y="1130" text-anchor="middle" font-family="{SERIF}" font-weight="700" font-size="104" letter-spacing="8">球有了，</text>
 <text x="540" y="1244" text-anchor="middle" font-family="{SERIF}" font-weight="700" font-size="104" letter-spacing="8" fill="#C6EA3D">就差你。</text>
 <text x="540" y="1306" text-anchor="middle" font-family="{SANS}" font-size="16" letter-spacing="10" opacity=".65" font-weight="500">南伴球 · 墨尔本华人网球约局</text>
</g>
{grain(.18)}'''
    return page(body)
