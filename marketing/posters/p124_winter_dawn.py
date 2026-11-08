from lib import *
from lin import DEFS, blob, ink, glow

META = dict(
    id=124, slug='winter-dawn', title='热身要久一点', lines=['冬天的早上，', '热身要久一点。'],
    style=['浮世绘', '自然', '天地', '光亮'], tone='亮色', demo=False,
    concept='借广重的天空晕染和近景框景：靛蓝晕到桃粉、再到暖金的冬晨天空，一行雁飞过；河谷里铺着晨雾，河边一块球场的灯还没关，两个米粒大的人呵着白气热身；左上一枝深色的枝条把画面框住',
    use='冬天早场；冷，但天很亮、心情很好',
)


def svg():
    r = random.Random(124)
    p = [f'<defs>{DEFS}<linearGradient id="sk124" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F2C5E"/><stop offset=".3" stop-color="#6E6EA8"/>'
         f'<stop offset=".55" stop-color="#F2A79A"/><stop offset=".72" stop-color="#FFD7A0"/><stop offset="1" stop-color="#FFF0D0"/></linearGradient>'
         f'<linearGradient id="rv124" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE2B4"/><stop offset="1" stop-color="#9AB4D8"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk124)"/>']
    p.append(glow(700, 820, 260, 90, '#FFF6DE', .95))
    for i, (y, c, amp) in enumerate([(780, '#B79AB8', 70), (830, '#8E86AE', 50), (880, '#5E6A96', 40)]):   # 远山三层，越近越深
        pts = ' '.join(f'L{x} {y - amp * abs(math.sin(x / (170 + i * 40) + i)) - r.uniform(0, 12):.0f}' for x in range(0, 1100, 40))
        p.append(f'<path d="M0 {y+200} {pts} L1080 {y+200}Z" fill="{c}"/>')
        p.append(glow(540, y + 20, 640, 30, '#FFE9D6', .8, 28))
    p.append('<path d="M0 960 C260 930 420 990 620 960 C820 930 940 970 1080 950 L1080 1350 L0 1350Z" fill="#3E5A7A"/>')    # 河岸
    p.append('<path d="M0 1010 C280 990 420 1040 640 1010 C840 980 960 1020 1080 1000 L1080 1090 C900 1100 700 1060 520 1090 C330 1120 160 1080 0 1100Z" fill="url(#rv124)"/>')   # 河
    p.append(glow(700, 1040, 300, 20, '#FFFFFF', .7, 14))
    # 河边球场（灯还亮着）
    p.append('<path d="M330 1150 L640 1144 L680 1196 L290 1204Z" fill="#3C8A78"/>')
    for d in ['M330 1150 L640 1144 L680 1196 L290 1204Z', 'M310 1176 L660 1170']:
        p.append(f'<path d="{d}" stroke="#F4F0E2" stroke-width="2.5" fill="none"/>')
    for x, y in [(330, 1150), (640, 1144)]:
        p.append(f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y-70}" stroke="#1C2438" stroke-width="3"/>')
        p.append(glow(x, y - 72, 22, 22, '#FFF4C8', .9, 6))
    for x, y in [(400, 1180), (580, 1166)]:
        p.append(f'<rect x="{x-3}" y="{y-16}" width="6" height="16" rx="3" fill="#FFFFFF"/><circle cx="{x}" cy="{y-20}" r="4" fill="#1C2438"/>')
        p.append(glow(x + 10, y - 26, 10, 7, '#FFFFFF', .9, 6))                                   # 呵出的白气
    p.append('<circle cx="490" cy="1158" r="3" fill="#C6EA3D"/>')
    p.append('<path d="M0 1210 C300 1196 700 1220 1080 1200 L1080 1350 L0 1350Z" fill="#1E2A44"/>')
    for i in range(7):                                                                            # 一行雁
        x, y = 640 + i * 34, 420 + abs(i - 3) * 16
        p.append(f'<path d="M{x-9} {y} Q{x-4} {y-6} {x} {y} Q{x+4} {y-6} {x+9} {y}" stroke="#2A2A44" stroke-width="2.4" fill="none"/>')
    # 近景框景：左上一枝深色枝条和几朵冬梅
    br = [ink([(-20, 330), (120, 300), (240, 230), (330, 180)], 22, '#1A1A2A', 1, (.02, .8)),
          ink([(120, 300), (170, 360), (220, 380)], 10, '#1A1A2A', 1, (.05, .8)),
          ink([(240, 230), (260, 160), (300, 120)], 9, '#1A1A2A', 1, (.05, .8))]
    for x, y in [(206, 252), (300, 196), (262, 168), (160, 344), (90, 312), (330, 178)]:
        br.append(blob(r, x, y, 10, 9, '#F6E6EA', 1))
        br.append(f'<circle cx="{x}" cy="{y}" r="2.5" fill="#C2410C"/>')
    p.append('<g filter="url(#paint2)">' + ''.join(br) + '</g>')
    p.append(tag('WINTER · 6:40 AM', x=600, y=150, color='#FFFFFF', rule='#F2B134', op=.8))
    p.append(headline(META['lines'], x=600, y=262, size=50, colors=('#FFFFFF', '#FFE2A8'), lh=70))
    p.append(wordmark(1272, '#fff', sub=False))
    p.append(grain(.12))
    return page(''.join(p))
