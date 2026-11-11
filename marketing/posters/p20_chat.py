from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=20, slug='chat', title='一句约吗', lines=['一句「约吗」，', '一场球。'],
    style=['插画', '排版'], tone='深色', demo=True,
    concept='四句话的聊天气泡，从「约吗」到「场边见」，最后一个「球局已成」的小标记',
    use='讲「申请 → 通过」流程；朋友圈、小红书',
)


def tw(s, size):
    n = sum(1 if ord(c) > 255 else .56 for c in s)
    return n * (size + 2)


def svg():
    msgs = [('me', '周六 9 点，双打，约吗？'), ('they', '约！我带球。'), ('me', '那我订场。'), ('they', '好，球场见。')]
    out = ''
    y = 600
    size = 34
    for i, (who, text) in enumerate(msgs):
        w = tw(text, size) + 72; h = 96
        if who == 'me':
            x = 996 - w - 66
            out += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="40" fill="{C["lime"]}"/>'
            out += f'<text x="{x+36}" y="{y+61}" font-family="{SANS}" font-size="{size}" font-weight="500" fill="{C["deep"]}" letter-spacing="2">{text}</text>'
            out += seamdisc(996 - 26, y + 48, 26, -22, fill=C['lime'], seam='#0B3B2A', id=f'a{i}')
        else:
            x = 84 + 66
            out += f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="40" fill="{C["cream"]}"/>'
            out += f'<text x="{x+36}" y="{y+61}" font-family="{SANS}" font-size="{size}" font-weight="500" fill="{C["deep"]}" letter-spacing="2">{text}</text>'
            out += seamdisc(84 + 26, y + 48, 26, 28, fill='#0B3B2A', seam='#C6EA3D', id=f'a{i}')
            out += f'<circle cx="{84+26}" cy="{y+48}" r="28" fill="none" stroke="#C6EA3D" stroke-opacity=".5" stroke-width="2"/>'
        y += 132
    pill = f'''<g transform="translate(540 {y+22})"><rect x="-250" y="-34" width="500" height="68" rx="34" fill="none" stroke="#C6EA3D" stroke-width="2.5"/>
<circle cx="-205" cy="0" r="17" fill="#C6EA3D"/><path d="M-213 0 l6 7 l11 -13" fill="none" stroke="#0B3B2A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<text x="28" y="10" text-anchor="middle" font-family="{SANS}" font-size="26" fill="#C6EA3D" letter-spacing="5">球局已成 · 周六 09:00</text></g>'''
    body = f'''
<defs><radialGradient id="bg20" cx="30%" cy="20%" r="100%"><stop offset="0" stop-color="#14573F"/><stop offset=".6" stop-color="#0A3626"/><stop offset="1" stop-color="#04120C"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg20)"/>
<circle cx="900" cy="640" r="320" fill="#C6EA3D" opacity=".08" filter="url(#bl60)"/>
{tag('ONE MESSAGE')}
{headline(['一句「约吗」，', '一场球。'], y=330, size=108, colors=(C['cream'], C['lime']))}
{out}{pill}
{wordmark(1272, '#fff', sub=False)}
{grain(.18)}'''
    return page(body)
