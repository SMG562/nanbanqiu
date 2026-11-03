from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=14, slug='across-net', title='隔着一张网', lines=['隔着一张网，', '是新朋友。'],
    style=['极简'], tone='亮色', demo=False,
    concept='左深绿右荧光黄绿，中间一道球网，两颗反色的球',
    use='品牌海报、线下物料',
)


def svg():
    body=f'''
<defs>
<linearGradient id="gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E7E59"/><stop offset="1" stop-color="#0B4430"/></linearGradient>
<linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4F76A"/><stop offset="1" stop-color="#B8DC30"/></linearGradient>
<pattern id="mesh14" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M0 0L26 26M26 0L0 26" stroke="#fff" stroke-width="2.4" opacity=".85"/></pattern>
</defs>
<rect width="540" height="{H}" fill="url(#gl)"/><rect x="540" width="540" height="{H}" fill="url(#gr)"/>
<rect x="516" y="0" width="48" height="{H}" fill="#0B3B2A" opacity=".18"/>
<rect x="516" y="0" width="48" height="{H}" fill="url(#mesh14)"/>
<rect x="512" y="0" width="5" height="{H}" fill="#fff"/><rect x="563" y="0" width="5" height="{H}" fill="#fff"/>
{seamdisc(285,830,190,-22,fill="#C6EA3D",seam="#F7FBE8",id="n1")}
{seamdisc(795,830,190,28,fill="#0B3B2A",seam="#C6EA3D",id="n2")}
<text x="50" y="150" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" fill="#F7EBD6" opacity=".75">ACROSS THE NET</text>
<line x1="50" y1="176" x2="116" y2="176" stroke="#C6EA3D" stroke-width="3"/>
<text x="48" y="310" font-family="{SERIF}" font-weight="900" font-size="76" letter-spacing="2" fill="#F7EBD6">隔着一张网，</text>
<text x="590" y="420" font-family="{SERIF}" font-weight="900" font-size="88" letter-spacing="4" fill="#0B3B2A">是新朋友。</text>
<g transform="translate(540 1262)"><rect x="-190" y="-40" width="380" height="80" rx="40" fill="#0B3B2A"/>
 <circle cx="-138" cy="-6" r="11" fill="#C6EA3D"/><circle cx="-120" cy="8" r="7" fill="#C6EA3D" stroke="#0B3B2A" stroke-width="2.5"/>
 <text x="22" y="12" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="32" fill="#fff" letter-spacing="10">南伴球</text></g>
{grain(.2)}'''
    return page(body)
