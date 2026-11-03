from lib import *

META = dict(
    id=55, slug='just-hit', title='说好随便打打', lines=['说好，', '随便打打。'],
    style=['信息图', '色块', '幽默'], tone='深色', demo=False,
    concept='场边翻页记分牌：你 7-6、我 6-7、抢十 10-8，底下一行小字“已打 2 小时 40 分”；说好随便打打',
    use='约球上头的大实话；社交球友的好胜心',
)


def svg():
    random.seed(55)
    cw, ch, gap, xs, ys = 190, 150, 14, 120, [560, 740]
    names = [('你', '#C6EA3D', '#0B3B2A'), ('我', '#F7EBD6', '#0B3B2A')]
    vals = [['7', '6', '10'], ['6', '7', '8']]
    heads = ['第一盘', '第二盘', '抢十']
    out = ''
    for j, hd in enumerate(heads):
        x = xs + (cw + gap) * (j + 1)
        out += f'<text x="{x+cw/2}" y="{ys[0]-34}" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="24" letter-spacing="4" fill="#F7EBD6" opacity=".7">{hd}</text>'
    for i, (nm, bg, fg) in enumerate(names):
        y = ys[i]
        out += f'<rect x="{xs}" y="{y}" width="{cw}" height="{ch}" rx="14" fill="{bg}"/><text x="{xs+cw/2}" y="{y+100}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="82" fill="{fg}">{nm}</text>'
        for j, v in enumerate(vals[i]):
            x = xs + (cw + gap) * (j + 1)
            out += f'''<g><rect x="{x}" y="{y}" width="{cw}" height="{ch}" rx="14" fill="#07281C"/><rect x="{x}" y="{y}" width="{cw}" height="{ch/2}" rx="14" fill="#fff" opacity=".05"/>
<text x="{x+cw/2}" y="{y+108}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="104" fill="#F7EBD6">{v}</text>
<path d="M{x} {y+ch/2} H{x+cw}" stroke="#000" stroke-width="4" opacity=".7"/><circle cx="{x+10}" cy="{y+ch/2}" r="4" fill="#000" opacity=".7"/><circle cx="{x+cw-10}" cy="{y+ch/2}" r="4" fill="#000" opacity=".7"/></g>'''
    body = f'''
<defs><radialGradient id="bg55" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#1A6B49"/><stop offset="1" stop-color="#06241A"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg55)"/>
<rect x="84" y="{ys[0]-100}" width="912" height="{ys[1]+ch-ys[0]+170}" rx="30" fill="#0A2E21" opacity=".75"/>
{out}
<text x="540" y="1030" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="5" fill="{C['lime']}">已打 2 小时 40 分</text>
{tag('JUST A HIT')}
{headline(META['lines'], y=290, size=64, colors=C['cream'], ls=3, lh=82)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
