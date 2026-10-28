from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=10, slug='night-lamp', title='夜场灯光', lines=['灯亮了，', '就差一个对手。'],
    style=['写实光影'], tone='深色', demo=False,
    concept='一束泛光灯打在大球上，尘埃飘浮，电影感',
    use='夜场、对手招募',
)


def svg():
    random.seed(21)
    dust=''.join(f'<circle cx="{random.randint(150,930)}" cy="{random.randint(120,900)}" r="{random.choice([2,3,4,6])}" fill="#FFE9C0" opacity="{random.uniform(.15,.6):.2f}" filter="url(#bl6)"/>' for _ in range(60))
    body=f'''
<defs>
<radialGradient id="bg10" cx="50%" cy="0%" r="110%"><stop offset="0" stop-color="#1c2f2a"/><stop offset=".5" stop-color="#0a1612"/><stop offset="1" stop-color="#020605"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFEBC4" stop-opacity=".55"/><stop offset="1" stop-color="#FFEBC4" stop-opacity="0"/></linearGradient>
<radialGradient id="pool" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".6"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg10)"/>
<polygon points="440,0 640,0 1060,1000 20,1000" fill="url(#beam)" filter="url(#bl28)"/>
<polygon points="490,0 590,0 800,900 280,900" fill="url(#beam)" opacity=".7" filter="url(#bl14)"/>
<circle cx="540" cy="10" r="90" fill="#FFF3D8" opacity=".9" filter="url(#bl28)"/>
<ellipse cx="540" cy="965" rx="520" ry="80" fill="url(#pool)"/>
{dust}
<ellipse cx="560" cy="965" rx="260" ry="26" fill="#000" opacity=".55" filter="url(#bl14)"/>
<g>{ball('n',540,690,265,-24)}</g>
<g fill="#F7EBD6">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".7">NIGHT SESSION</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#C6EA3D" stroke-width="3"/>
 <text x="540" y="1090" text-anchor="middle" font-family="{SERIF}" font-weight="700" font-size="92" letter-spacing="6">灯亮了，</text>
 <text x="540" y="1192" text-anchor="middle" font-family="{SERIF}" font-weight="700" font-size="92" letter-spacing="6" fill="#C6EA3D">就差一个对手。</text>
</g>
{wordmark(1268,"#fff",sub=False)}
{grain(.22)}'''
    return page(body)
