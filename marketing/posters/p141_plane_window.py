from lib import *
from lin import DEFS, blob, glow

META = dict(
    id=141, slug='plane-window', title='飞机上也在找', lines=['飞机上，', '也在找球场。'],
    style=['意境', '俯瞰', '城市', '光亮'], tone='亮色', demo=False,
    concept='从飞机舷窗往下看：窗外上半是金色的晚霞和一截机翼，下面是刚亮起灯的城市，街道像金线织成的网，一条河弯过去；万家灯火里，有一小块亮绿的长方形——一块开着灯的球场',
    use='出差 / 旅行 / 换城市也想打球（悉尼扩展）；人间烟火的大格局',
)


def svg():
    r = random.Random(141)
    wx, wy, ww, wh = 240, 220, 600, 790
    p = [f'<defs>{DEFS}<linearGradient id="sk141" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6B46A"/><stop offset=".3" stop-color="#F8D8A0"/><stop offset=".42" stop-color="#C8B8C8"/><stop offset=".55" stop-color="#3E4A72"/><stop offset="1" stop-color="#1E2648"/></linearGradient>'
         f'<clipPath id="wn141"><rect x="{wx}" y="{wy}" width="{ww}" height="{wh}" rx="230"/></clipPath>'
         '<linearGradient id="cb141" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4F2EC"/><stop offset="1" stop-color="#D8D4CA"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#cb141)"/>']
    for i in range(6):                                                                                         # 舱壁的弧形压纹
        p.append(f'<rect x="{wx - 60 - i*40}" y="{wy - 60 - i*40}" width="{ww + 120 + i*80}" height="{wh + 120 + i*80}" rx="{290 + i*40}" fill="none" stroke="#C8C2B6" stroke-width="2" opacity="{.5 - i*.07:.2f}"/>')
    v = ['<rect width="1080" height="1350" fill="url(#sk141)"/>', glow(420, 560, 260, 60, '#FFF0C8', .8, 28)]
    for _ in range(14):
        v.append(blob(r, r.uniform(230, 850), r.uniform(300, 520), r.uniform(50, 120), r.uniform(8, 16), r.choice(['#FBE2B8', '#F6C890', '#E8B0A0']), .7))
    # 城市：金线街网 + 灯点，越远越密越小
    for k in range(26):
        y = 700 + (k / 25) ** 1.7 * 420
        v.append(f'<line x1="200" y1="{y:.0f}" x2="900" y2="{y + 40:.0f}" stroke="#F2C26A" stroke-width="{.8 + k * .08:.1f}" opacity=".75"/>')
    for k in range(-14, 22):
        v.append(f'<line x1="{540 + k * 18:.0f}" y1="690" x2="{540 + k * 70:.0f}" y2="1100" stroke="#F2C26A" stroke-width="1.4" opacity=".6"/>')
    for _ in range(700):
        y = r.uniform(690, 1080)
        v.append(f'<circle cx="{r.uniform(220, 880):.0f}" cy="{y:.0f}" r="{r.uniform(.8, 2.4) * (y - 600) / 300:.1f}" fill="{r.choice(["#FFE6A8", "#FFD27A", "#FFFFFF", "#FFC27A"])}" opacity="{r.uniform(.5, 1):.2f}"/>')
    v.append('<path d="M200 820 C380 800 520 900 600 960 C700 1030 820 1040 900 1020" stroke="#2A3458" stroke-width="22" fill="none"/>')   # 河
    v.append('<path d="M200 820 C380 800 520 900 600 960 C700 1030 820 1040 900 1020" stroke="#5E6E98" stroke-width="3" fill="none" opacity=".6"/>')
    v.append('<g transform="translate(470 880) rotate(8)"><rect x="-22" y="-12" width="44" height="24" fill="#B8F07A"/></g>')   # 球场
    v.append(glow(470, 880, 40, 26, '#D8FF9A', .8, 14))
    v.append('<path d="M560 520 L900 610 L900 680 L600 560Z" fill="#E6E2DA"/><path d="M560 520 L900 610 L900 622 L566 532Z" fill="#B8B4AC"/>')   # 机翼
    v.append('<circle cx="884" cy="612" r="5" fill="#E8463A"/>')
    p.append(f'<g clip-path="url(#wn141)">{"".join(v)}</g>')
    p.append(f'<rect x="{wx}" y="{wy}" width="{ww}" height="{wh}" rx="230" fill="none" stroke="#B8B2A6" stroke-width="18"/>')
    p.append(f'<rect x="{wx+14}" y="{wy+14}" width="{ww-28}" height="{wh-28}" rx="216" fill="none" stroke="#FFFFFF" stroke-width="3" opacity=".6"/>')
    p.append(tag('SEAT 32A · 7:20 PM', y=120, color='#3A3A36', rule='#C2410C', op=.7))
    p.append(headline(META['lines'], y=1082, size=38, colors=('#2E3A36', '#C2410C'), lh=52, ls=3))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.06, light=True))
    return page(''.join(p))
