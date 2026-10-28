from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=19, slug='coffee', title='咖啡拉花', lines=['打完球，', '咖啡见。'],
    style=['插画', '地域梗'], tone='浅色', demo=False,
    concept='俯视一杯墨尔本式咖啡，奶泡拉花是网球的两条球缝；球友打完球一起喝咖啡',
    use='讲社交 / 球后聚会，生活方式向，朋友圈、小红书',
)


def svg():
    cx, cy = 540, 840
    seam = lambda d, w=26: f'<path d="{d}" fill="none" stroke="#F8EBD6" stroke-width="{w}" stroke-linecap="round" filter="url(#bl6)" opacity=".95"/>'
    k = 2.05
    seams = ''
    for sx in (-1, 1):
        d = f'M{cx + sx*67*k:.0f} {cy-74*k:.0f} C{cx + sx*30*k:.0f} {cy-34*k:.0f} {cx + sx*30*k:.0f} {cy+34*k:.0f} {cx + sx*67*k:.0f} {cy+74*k:.0f}'
        seams += seam(d)
    body = f'''
<defs>
<radialGradient id="bg19" cx="40%" cy="30%" r="95%"><stop offset="0" stop-color="#F6EAD6"/><stop offset="1" stop-color="#E2CDAA"/></radialGradient>
<radialGradient id="cof" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#8A5530"/><stop offset=".6" stop-color="#5A3119"/><stop offset="1" stop-color="#321A0B"/></radialGradient>
<radialGradient id="cup" cx="40%" cy="35%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9DFD0"/></radialGradient>
<clipPath id="cc"><circle cx="{cx}" cy="{cy}" r="205"/></clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg19)"/>
<ellipse cx="{cx+30}" cy="{cy+40}" rx="390" ry="380" fill="#6b4a25" opacity=".28" filter="url(#bl28)"/>
<circle cx="{cx}" cy="{cy}" r="340" fill="#FBF4E8"/>
<circle cx="{cx}" cy="{cy}" r="340" fill="none" stroke="#D9C8AC" stroke-width="3"/>
<circle cx="{cx}" cy="{cy}" r="300" fill="none" stroke="#E6D8C0" stroke-width="2"/>
<path d="M{cx+236} {cy-70} h80 a64 64 0 0 1 0 140 h-80" fill="none" stroke="#FFFFFF" stroke-width="34" stroke-linecap="round"/>
<path d="M{cx+236} {cy-70} h80 a64 64 0 0 1 0 140 h-80" fill="none" stroke="#DDCFB8" stroke-width="3" stroke-linecap="round" transform="translate(0 -17)" opacity=".0"/>
<circle cx="{cx}" cy="{cy}" r="252" fill="url(#cup)"/>
<circle cx="{cx}" cy="{cy}" r="252" fill="none" stroke="#D9CBB4" stroke-width="3"/>
<circle cx="{cx}" cy="{cy}" r="212" fill="#EFE5D3"/>
<circle cx="{cx}" cy="{cy}" r="205" fill="url(#cof)"/>
<g clip-path="url(#cc)">{seams}
 <ellipse cx="{cx-70}" cy="{cy-110}" rx="120" ry="40" fill="#fff" opacity=".10" filter="url(#bl14)" transform="rotate(-25 {cx-70} {cy-110})"/></g>
<g transform="translate(330 1090) rotate(-28)"><rect x="-110" y="-7" width="170" height="14" rx="7" fill="#CBB99A"/><ellipse cx="78" cy="0" rx="40" ry="26" fill="#CBB99A"/><ellipse cx="78" cy="-2" rx="30" ry="18" fill="#DCCDB0"/></g>
<ellipse cx="{cx+300}" cy="{cy+300}" rx="54" ry="14" fill="#000" opacity=".22" filter="url(#bl6)"/>
{ball('cb', cx+300, cy+262, 46, -22)}
{tag('AFTER THE GAME', color=C['deep'], rule=C['orange'], op=.7, weight=600)}
{headline(['打完球，', '咖啡见。'], y=330, size=112, colors=(C['deep'], '#B0582F'))}
{sub('赢了我请，输了你请。', y=520, color=C['deep'], op=.7)}
{wordmark(1272, '#0B3B2A', sub=False)}
{grain(.28, True)}'''
    return page(body)
