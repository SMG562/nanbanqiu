from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=1, slug='dusk-court', title='落日约球', lines=['今晚，', '球场见。'],
    style=['写实光影'], tone='深色', demo=False,
    concept='黄昏球场 + 虚化灯光 + 一颗球，最接近参考图的电影感',
    use='品牌主视觉、朋友圈头图',
)


def svg():
    yn,yf=1230,690
    xl_n,xr_n,xl_f,xr_f=-260,1340,330,750
    def row(t): return persp(t,xl_n,xr_n,yn,yf,xl_f,xr_f)
    lines=''
    # baselines & service lines (t: 0 near baseline, 1 far baseline)
    for t in (0,0.18,0.52,1):
        y,xl,xr=row(t); lines+=f'<line x1="{xl}" y1="{y}" x2="{xr}" y2="{y}" />'
    for xs in (0,1):
        xa=(xl_n,xl_f) if xs==0 else (xr_n,xr_f)
        lines+=f'<line x1="{xa[0]}" y1="{yn}" x2="{xa[1]}" y2="{yf}" />'
    ym=row(.52)[0]; yb=row(.18)[0]
    lines+=f'<line x1="540" y1="{ym}" x2="540" y2="{row(.18)[0]}" />'
    # bokeh lights (fence floodlights)
    bokeh=''
    import random; random.seed(7)
    for i in range(26):
        x=random.randint(0,W); y=random.randint(300,640); r=random.randint(14,46)
        c=random.choice(["#FFC37A","#FFB05A","#FFD9A0","#F59B4B"])
        bokeh+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" opacity="{random.uniform(.18,.5):.2f}"/>'
    # fence posts
    fence=''.join(f'<rect x="{x}" y="330" width="10" height="380" fill="#0a1512" opacity=".8"/>' for x in range(-20,W+80,150))
    leaves=''
    random.seed(3)
    for i in range(30):
        x=random.randint(-60,520); y=random.randint(1040,1400); r=random.randint(30,120)
        c=random.choice(["#C9A24A","#8C7A2E","#E7B866","#4E5B2A"])
        leaves+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}" opacity="{random.uniform(.35,.8):.2f}"/>'
    for i in range(14):
        x=random.randint(700,1160); y=random.randint(1150,1400); r=random.randint(30,90)
        leaves+=f'<circle cx="{x}" cy="{y}" r="{r}" fill="{random.choice(["#E7B866","#4E5B2A","#C9A24A"])}" opacity="{random.uniform(.3,.6):.2f}"/>'
    body=f'''
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1f23"/><stop offset=".35" stop-color="#2a3a38"/><stop offset=".55" stop-color="#a86a3c"/><stop offset=".62" stop-color="#e3a15a"/></linearGradient>
<linearGradient id="court" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b6a4f"/><stop offset=".45" stop-color="#14503a"/><stop offset="1" stop-color="#082a1e"/></linearGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFC27A" stop-opacity=".9"/><stop offset="1" stop-color="#FFC27A" stop-opacity="0"/></radialGradient>
<linearGradient id="vig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></linearGradient>
<linearGradient id="netg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".0"/></linearGradient>
<pattern id="mesh" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0H14M0 0V14" stroke="#0b1512" stroke-width="1.6" opacity=".7"/></pattern>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky)"/>
<ellipse cx="760" cy="640" rx="520" ry="200" fill="url(#glow)" opacity=".7"/>
<g filter="url(#bl14)">{fence}{bokeh}</g>
<path d="M0 700 Q 120 560 240 690 Q 330 600 420 700 L420 720 L0 720Z" fill="#101c16" opacity=".85" filter="url(#bl14)"/>
<path d="M{W} 700 Q 940 540 820 690 Q 730 590 640 700 L640 720 L{W} 720Z" fill="#101c16" opacity=".85" filter="url(#bl14)"/>
<rect x="0" y="{yf-4}" width="{W}" height="{H-yf+4}" fill="url(#court)"/>
<polygon points="{xl_n},{yn} {xl_f},{yf} {xr_f},{yf} {xr_n},{yn}" fill="#1d6a4c" opacity=".35"/>
<g stroke="#F6E9CF" stroke-width="5" opacity=".78" filter="url(#bl6)">{lines}</g>
<g stroke="#FFE2B0" stroke-width="2.4" opacity=".9">{lines}</g>
<!-- net -->
<g filter="url(#bl6)">
 <rect x="150" y="{ym-132}" width="780" height="120" fill="url(#mesh)"/>
 <rect x="150" y="{ym-132}" width="780" height="12" fill="#F6E9CF" opacity=".92"/>
 <rect x="138" y="{ym-150}" width="14" height="150" fill="#0a1512"/><rect x="928" y="{ym-150}" width="14" height="150" fill="#0a1512"/>
</g>
<!-- sun glints on court -->
<ellipse cx="640" cy="1000" rx="520" ry="60" fill="#FFC27A" opacity=".16" filter="url(#bl28)"/>
<!-- ball shadow + ball -->
<ellipse cx="640" cy="1150" rx="230" ry="22" fill="#000" opacity=".5" filter="url(#bl14)"/>
{ball('h',560,1040,116,-24)}
<ellipse cx="500" cy="978" rx="60" ry="22" fill="#FFE9B8" opacity=".35" filter="url(#bl14)" transform="rotate(-30 470 1018)"/>
<!-- foreground bokeh -->
<g filter="url(#bl28)">{leaves}</g>
<rect width="{W}" height="{H}" fill="url(#vig)"/>
<!-- text -->
<g fill="#F7EBD6">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".75">MELBOURNE  ·  TENNIS  ·  AFTER WORK</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#C6EA3D" stroke-width="3"/>
 <text x="80" y="330" font-family="{SERIF}" font-weight="700" font-size="128" letter-spacing="6">今晚，</text>
 <text x="80" y="462" font-family="{SERIF}" font-weight="700" font-size="128" letter-spacing="6">球场见。</text>
 <text x="84" y="530" font-family="{SANS}" font-weight="400" font-size="26" letter-spacing="5" opacity=".85">找到同水平的球搭子，约一场刚刚好的球。</text>
</g>
{wordmark(1262,"#fff")}
{grain(.2)}'''
    return page(body)
