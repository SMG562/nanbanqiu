from lib import *

META = dict(
    id=51, slug='last-ball', title='最后一个球', lines=['说好了，最后一个球。'],
    style=['插画', '信息图', '色块'], tone='暖色', demo=False,
    concept='三联画：同一个球在同一块场地，天空从日落橙到黄昏紫再到夜蓝；每一格都写着“最后一个球”，只是第 1、2、3 次',
    use='打球上头的大实话；晚场约球',
)


def svg():
    random.seed(51)
    r = random.Random(51)
    pw, y0, y1, gy = 360, 260, 1190, 1000
    panels = [
        ('#F2B134', '#E8643C', '#1C6B4A', '6:30 PM'),
        ('#B5546B', '#3E2A66', '#123F33', '7:10 PM'),
        ('#12335A', '#04101C', '#082418', '8:05 PM'),
    ]
    out = ''
    for i, (top, bot, gnd, tm) in enumerate(panels):
        x = i * pw
        extra = ''
        if i == 0:
            extra = f'<circle cx="{x+180}" cy="{gy}" r="150" fill="#FFE08A" opacity=".95"/><circle cx="{x+180}" cy="{gy}" r="260" fill="#FFE08A" opacity=".3" filter="url(#bl28)"/>'
        elif i == 1:
            extra = f'<circle cx="{x+250}" cy="560" r="26" fill="#F3E6CC" opacity=".85"/>' + ''.join(f'<circle cx="{x + r.uniform(10,350):.0f}" cy="{r.uniform(y0+20,700):.0f}" r="1.2" fill="#F7EBD6" opacity="{r.uniform(.2,.6):.2f}"/>' for _ in range(14))
        else:
            extra = ''.join(f'<circle cx="{x + r.uniform(10,350):.0f}" cy="{r.uniform(y0+20,900):.0f}" r="{r.uniform(.8,1.8):.1f}" fill="#F7EBD6" opacity="{r.uniform(.3,.9):.2f}"/>' for _ in range(46)) + f'<circle cx="{x+180}" cy="{gy-70}" r="150" fill="#C6EA3D" opacity=".28" filter="url(#bl28)"/>'
        out += f'''<g clip-path="url(#pc{i})"><rect x="{x}" y="{y0}" width="{pw}" height="{y1-y0}" fill="url(#sg{i})"/>{extra}
 <rect x="{x}" y="{gy}" width="{pw}" height="{y1-gy}" fill="{gnd}"/><path d="M{x} {gy} H{x+pw}" stroke="#F7EBD6" stroke-width="3" opacity=".55"/>
 <ellipse cx="{x+186}" cy="{gy+6}" rx="62" ry="9" fill="#000" opacity=".45" filter="url(#bl6)"/>
 {ball(f'p{i}', x + 180, gy - 70, 70, rot=-22 + i * 25)}</g>
 <text x="{x+180}" y="372" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="34" fill="#fff">最后一个球</text>
 <text x="{x+180}" y="412" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="20" letter-spacing="5" fill="#fff" opacity=".85">第 {i+1} 次 · {tm}</text>'''
    body = f'''
<defs>
 {''.join(f'<linearGradient id="sg{i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{p[0]}"/><stop offset="1" stop-color="{p[1]}"/></linearGradient><clipPath id="pc{i}"><rect x="{i*pw}" y="{y0}" width="{pw}" height="{y1-y0}"/></clipPath>' for i, p in enumerate(panels))}
</defs>
<rect width="{W}" height="{H}" fill="#0B3B2A"/>
{out}
<path d="M360 {y0} V{y1} M720 {y0} V{y1}" stroke="#0B3B2A" stroke-width="3"/>
{tag('ONE LAST BALL', y=100)}
{headline(META['lines'], y=215, size=54, colors='#F7EBD6', ls=3)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.16)}'''
    return page(body)
