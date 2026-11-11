from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=11, slug='in-sync', title='一拍即合', lines=['一拍即合。'],
    style=['双关', '插画'], tone='深色', demo=False,
    concept='两只球拍头对头夹住一颗球，「一拍即合」的字面双关',
    use='讲「合拍的球友」',
)


def racket(id):
    strings=''.join(f'<line x1="{x}" y1="-460" x2="{x}" y2="-200" stroke="#F7EBD6" stroke-opacity=".35" stroke-width="2"/>' for x in range(-90,100,14))
    strings+=''.join(f'<line x1="-100" y1="{y}" x2="100" y2="{y}" stroke="#F7EBD6" stroke-opacity=".35" stroke-width="2"/>' for y in range(-440,-200,14))
    wrap=''.join(f'<line x1="-12" y1="{y}" x2="12" y2="{y-8}" stroke="#0B3B2A" stroke-width="3" opacity=".6"/>' for y in range(-10,-150,-14))
    return f'''<clipPath id="rc{id}"><ellipse cx="0" cy="-330" rx="92" ry="118"/></clipPath>
<g clip-path="url(#rc{id})">{strings}</g>
<ellipse cx="0" cy="-330" rx="97" ry="123" fill="none" stroke="#F7EBD6" stroke-width="14"/>
<path d="M-40 -222 L-11 -150 M40 -222 L11 -150" stroke="#F7EBD6" stroke-width="12" stroke-linecap="round"/>
<rect x="-14" y="-160" width="28" height="160" rx="12" fill="#C6EA3D"/>{wrap}'''


def svg():
    def place(cx,cy,ang,id):
        # handle end so that head center lands at (cx,cy)
        L=330*1.5; a=math.radians(ang)
        bx=cx-L*math.sin(a); by=cy+L*math.cos(a)
        return f'<g transform="translate({bx:.1f} {by:.1f}) rotate({ang}) scale(1.5)">{racket(id)}</g>'
    burst=''.join(f'<line x1="{540+math.cos(math.radians(k*22.5))*(86 if k%2 else 100)}" y1="{800+math.sin(math.radians(k*22.5))*(86 if k%2 else 100)}" x2="{540+math.cos(math.radians(k*22.5))*(130 if k%2 else 170)}" y2="{800+math.sin(math.radians(k*22.5))*(130 if k%2 else 170)}" stroke="#C6EA3D" stroke-width="7" stroke-linecap="round"/>' for k in range(16))
    body=f'''
<defs><radialGradient id="bg11" cx="50%" cy="60%" r="80%"><stop offset="0" stop-color="#1E7E59"/><stop offset=".6" stop-color="#0E5139"/><stop offset="1" stop-color="#04180F"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg11)"/>
<circle cx="540" cy="800" r="300" fill="#C6EA3D" opacity=".18" filter="url(#bl60)"/>
{place(392,800,28,'a')}{place(688,800,-28,'b')}
{burst}
{ball('y',540,800,60,-22)}
<g fill="#F7EBD6">
 <text x="84" y="150" font-family="{SANS}" font-size="17" font-weight="500" letter-spacing="9" opacity=".7">IN SYNC</text>
 <line x1="84" y1="176" x2="150" y2="176" stroke="#C6EA3D" stroke-width="3"/>
 <text x="80" y="340" font-family="{SERIF}" font-weight="900" font-size="150" letter-spacing="8">一拍即合。</text>
 <text x="84" y="412" font-family="{SANS}" font-size="26" letter-spacing="6" fill="#C6EA3D" opacity=".95">遇见合拍的球友。</text>
</g>
{wordmark(1268,"#fff",sub=False)}
{grain(.2)}'''
    return page(body)
