from lib import *  # 品牌常量和绘图工具，用法见 .claude/skills/nanbanqiu-poster/SKILL.md

META = dict(
    id=17, slug='toss', title='抛球', lines=['球抛出去了，', '总会有人接。'],
    style=['插画', '极简'], tone='深色', demo=False,
    concept='黄昏天色里一颗球的抛物线残影，落点荡开涟漪；寓意「发个申请，总有人接」',
    use='讲发起 / 申请球局、鼓励第一步',
)


def svg():
    random.seed(17)
    pts = []
    for k in range(9):
        t = k / 8
        pts.append((110 + t * 850, 1020 - 4 * 420 * t * (1 - t)))
    path = 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in [(110 + t / 40 * 850, 1020 - 4 * 420 * (t / 40) * (1 - t / 40)) for t in range(41)])
    ghosts = ''
    for k, (x, y) in enumerate(pts):
        if k == 4:
            continue
        op = .18 + .5 * (1 - abs(k - 4) / 4)
        ghosts += f'<g opacity="{op:.2f}">{seamdisc(x, y, 34 + 10 * (1 - abs(k - 4) / 4), -22 + k * 14, fill=C["lime"], seam="#F7FBE8", id=f"g{k}")}</g>'
    stars = ''.join(f'<circle cx="{random.randint(60,1020)}" cy="{random.randint(60,520)}" r="{random.choice([1.5,2,2.5])}" fill="#fff" opacity="{random.uniform(.2,.7):.2f}"/>' for _ in range(40))
    ripples = ''.join(f'<ellipse cx="960" cy="1040" rx="{rx}" ry="{rx*.3:.0f}" fill="none" stroke="#C6EA3D" stroke-width="3" stroke-dasharray="{"" if i==0 else "4 10"}" opacity="{.9-i*.22:.2f}"/>' for i, rx in enumerate((44, 92, 146)))
    body = f'''
<defs>
<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071E22"/><stop offset=".45" stop-color="#17454A"/><stop offset=".72" stop-color="#B8825A"/><stop offset=".8" stop-color="#F0B27A"/></linearGradient>
<radialGradient id="sunglow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".9"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sk)"/>
{stars}
<circle cx="150" cy="1060" r="420" fill="url(#sunglow)"/>
<path d="M0 1050 Q 260 1000 520 1040 T 1080 1030 V1350 H0Z" fill="#0A1B17"/>
<path d="M0 1110 Q 300 1070 600 1100 T 1080 1090 V1350 H0Z" fill="#06120F"/>
<path d="{path}" fill="none" stroke="#FFE9C0" stroke-width="3" stroke-dasharray="2 14" stroke-linecap="round" opacity=".7"/>
{ghosts}
<circle cx="{pts[4][0]}" cy="{pts[4][1]}" r="120" fill="#C6EA3D" opacity=".28" filter="url(#bl28)"/>
{ball('ap', pts[4][0], pts[4][1], 66, -22)}
{ripples}
<ellipse cx="960" cy="1040" rx="16" ry="5" fill="#C6EA3D"/>
{tag('PASS IT ON')}
{headline(['球抛出去了，', '总会有人接。'], y=320, size=96, colors=(C['cream'], C['lime']))}
{wordmark(1272, '#fff', sub=False)}
{grain(.2)}'''
    return page(body)
