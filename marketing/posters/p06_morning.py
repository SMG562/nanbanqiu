from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=6, slug='morning', title='清晨球场', lines=['周六早上，', '球场见。'],
    style=['写实光影'], tone='浅色', demo=False,
    concept='蓝灰到暖金的晨光 + 空球场 + 一颗球，与夜场形成对比',
    use='周末早场、浅色系列',
)


def svg():
    yn,yf=1260,780; xl_n,xr_n,xl_f,xr_f=-300,1380,300,780
    def row(t): return persp(t,xl_n,xr_n,yn,yf,xl_f,xr_f)
    lines=''
    for t in (0,.2,.55,1):
        y,xl,xr=row(t); lines+=f'<line x1="{xl}" y1="{y}" x2="{xr}" y2="{y}"/>'
    lines+=f'<line x1="{xl_n}" y1="{yn}" x2="{xl_f}" y2="{yf}"/><line x1="{xr_n}" y1="{yn}" x2="{xr_f}" y2="{yf}"/><line x1="540" y1="{row(.55)[0]}" x2="540" y2="{row(.2)[0]}"/>'
    ym=row(.55)[0]
    body=f'''
<defs>
<linearGradient id="sky6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9C9DC"/><stop offset=".45" stop-color="#EBD9C6"/><stop offset=".6" stop-color="#FBD9A8"/></linearGradient>
<linearGradient id="court6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FBFA0"/><stop offset=".4" stop-color="#4F9070"/><stop offset="1" stop-color="#1F5A41"/></linearGradient>
<radialGradient id="sun6" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF3CF" stop-opacity="1"/><stop offset=".3" stop-color="#FFE0A6" stop-opacity=".7"/><stop offset="1" stop-color="#FFE0A6" stop-opacity="0"/></radialGradient>
<pattern id="mesh6" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0H14M0 0V14" stroke="#2c4a3d" stroke-width="1.4" opacity=".55"/></pattern>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky6)"/>
<circle cx="250" cy="760" r="420" fill="url(#sun6)"/>
<g filter="url(#bl28)" opacity=".8"><path d="M0 790 Q 160 640 300 780 Q 420 680 540 790 Q 700 650 860 790 Q 960 700 1080 780 V 800 H0Z" fill="#6f9a86"/></g>
<rect x="0" y="{yf-4}" width="{W}" height="{H-yf+4}" fill="url(#court6)"/>
<rect x="0" y="{yf-4}" width="{W}" height="90" fill="#fff" opacity=".35" filter="url(#bl28)"/>
<g stroke="#FFFDF4" stroke-width="5" opacity=".9">{lines}</g>
<g filter="url(#bl6)"><rect x="170" y="{ym-120}" width="740" height="108" fill="url(#mesh6)"/><rect x="170" y="{ym-120}" width="740" height="10" fill="#fff"/><rect x="160" y="{ym-136}" width="12" height="136" fill="#26453a"/><rect x="908" y="{ym-136}" width="12" height="136" fill="#26453a"/></g>
<!-- long shadows -->
<polygon points="{170},{ym} {170+520},{ym+70} {910+520},{ym+70} {910},{ym}" fill="#1b3f31" opacity=".28" filter="url(#bl14)"/>
<ellipse cx="520" cy="1150" rx="420" ry="30" fill="#14392b" opacity=".4" filter="url(#bl14)"/>
{ball('m',700,1070,118,-22)}
<ellipse cx="640" cy="1190" rx="300" ry="22" fill="#14392b" opacity=".45" filter="url(#bl14)" />
<rect x="0" y="880" width="{W}" height="260" fill="#fff" opacity=".12" filter="url(#bl60)"/>
<g fill="#0B3B2A">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="600" letter-spacing="9" opacity=".7">SATURDAY · 7:00 AM</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#0B3B2A" stroke-width="3"/>
 <text x="80" y="330" font-family="{SERIF}" font-weight="900" font-size="116" letter-spacing="4">周六早上，</text>
 <text x="80" y="458" font-family="{SERIF}" font-weight="900" font-size="116" letter-spacing="4">球场见。</text>
 <text x="84" y="520" font-family="{SANS}" font-size="25" letter-spacing="5" opacity=".75">晨光、空场、约好的人。</text>
</g>
{wordmark(1268,"#fff")}
{grain(.2,True)}'''
    return page(body)
