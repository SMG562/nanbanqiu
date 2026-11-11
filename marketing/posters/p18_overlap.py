from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=18, slug='overlap', title='空档重合', lines=['你有空，我有空，', '就开球。'],
    style=['信息图', '极简'], tone='深色', demo=True,
    concept='两人一周的空档叠在一起，重合的格子里亮起一颗球，像一道算式',
    use='讲「共享时间表 / 按空档匹配」功能',
)


def svg():
    you = [1, 0, 1, 0, 1, 1, 1]
    me = [0, 0, 1, 1, 1, 0, 1]
    both = [a and b for a, b in zip(you, me)]
    days = ['一', '二', '三', '四', '五', '六', '日']
    x0, cw, gap = 176, 96, 18
    rows = [(640, '你', you, C['lime']), (770, '我', me, C['cream']), (930, '球局', both, None)]
    out = ''
    for i, d in enumerate(days):
        cx = x0 + i * (cw + gap) + cw / 2
        out += f'<text x="{cx}" y="596" text-anchor="middle" font-family="{SANS}" font-size="20" fill="#fff" opacity="{.9 if i>=5 else .5}" letter-spacing="2">周{d}</text>'
        if both[i]:
            out += f'<rect x="{cx-cw/2-8}" y="612" width="{cw+16}" height="448" rx="30" fill="#C6EA3D" opacity=".12"/>'
    for y, label, vals, col in rows:
        out += f'<text x="84" y="{y+60}" font-family="{SERIF}" font-weight="900" font-size="{34 if len(label)==1 else 30}" fill="{col or C["lime"]}">{label}</text>'
        for i, v in enumerate(vals):
            x = x0 + i * (cw + gap)
            if col and v:
                out += f'<rect x="{x}" y="{y}" width="{cw}" height="96" rx="26" fill="{col}"/>'
            elif col:
                out += f'<rect x="{x}" y="{y}" width="{cw}" height="96" rx="26" fill="#0F2A20" stroke="#fff" stroke-opacity=".12"/>'
            elif v:
                out += f'<circle cx="{x+cw/2}" cy="{y+48}" r="66" fill="#C6EA3D" opacity=".35" filter="url(#bl14)"/>{ball("r"+str(i), x+cw/2, y+48, 40, -22+i*9)}'
            else:
                out += f'<rect x="{x+cw/2-6}" y="{y+42}" width="12" height="12" rx="6" fill="#fff" opacity=".15"/>'
    out += f'<text x="146" y="{770-24}" text-anchor="middle" font-family="{SANS}" font-size="34" font-weight="300" fill="#C6EA3D" opacity=".8">+</text>'
    out += f'<text x="146" y="{930-24}" text-anchor="middle" font-family="{SANS}" font-size="34" font-weight="300" fill="#C6EA3D" opacity=".8">=</text>'
    body = f'''
<defs><radialGradient id="bg18" cx="50%" cy="40%" r="85%"><stop offset="0" stop-color="#0F4A36"/><stop offset="1" stop-color="#04120C"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg18)"/>
{tag('FREE TIME · 空档')}
{headline(['你有空，我有空，', '就开球。'], y=320, size=84, colors=(C['cream'], C['lime']))}
{out}
{sub('找到彼此都有空的那一场', x=540, y=1150, size=24, anchor='middle', color='#fff', op=.7, ls=6)}
{wordmark(1272, '#fff', sub=False)}
{grain(.18)}'''
    return page(body)
