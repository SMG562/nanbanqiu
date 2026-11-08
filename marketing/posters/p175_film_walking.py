from lib import *
from lin import blob, ink
from people import front
from film import DEFS

META = dict(
    id=175, slug='film-walking', title='打着打着', lines=['球打得一般，', '人倒是越来越熟了。'],
    style=['日本电影', '合影', '留白', '南伴绿'], tone='浅色', demo=False,
    concept='借《步履不停》海报的版式：白纸底，照片框靠右上出血，左边留一条白；照片里是浓绿的树荫小路，地上洒着光斑，四个年纪各不相同的球友打完球正对镜头站成一排——戴帽子的阿姨、拿拍的大叔、背包的年轻女生、拎着拍的小孩；照片下大片留白，一行标语、一个手写感的大片名「打着打着」、两行简介、一排名字和最小的演职员小字',
    use='球友不分年龄 / 社群的温度；电影海报级主视觉',
)


def svg():
    r = random.Random(175)
    PX, PY, PW, PH = 240, 0, 840, 960
    p = [f'<defs>{DEFS}<clipPath id="ph175"><rect x="{PX}" y="{PY}" width="{PW}" height="{PH}"/></clipPath>'
         '<filter id="hand175" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter></defs>',
         '<rect width="1080" height="1350" fill="#F7F6F2"/>']
    ph = [f'<rect x="{PX}" y="{PY}" width="{PW}" height="{PH}" fill="#0E2A1E"/>']
    for layer, cols, n, sz in [(0, ['#0B2A1C', '#123A28', '#0E3322'], 120, (60, 130)), (1, ['#176B4D', '#1E5A3E', '#2A6E48'], 160, (36, 80)), (2, ['#4E9A5E', '#7FBF6A', '#A8D888', '#DDEFC0'], 120, (12, 34))]:
        for _ in range(n):
            x = r.uniform(PX - 40, PX + PW + 40)
            y = r.uniform(-40, 760)
            if 470 < x < 900 and y > 420 and layer < 2:                                                      # 小路尽头留一块亮
                continue
            s_ = r.uniform(*sz)
            ph.append(blob(r, x, y, s_, s_ * .7, r.choice(cols), r.uniform(.75, 1), r.uniform(0, 180)))
    ph.append(f'<path d="M560 600 C620 560 760 560 820 600 L900 960 L420 960Z" fill="#E8E4D6"/>')                    # 树荫下的小路
    ph.append(f'<path d="M560 600 C620 560 760 560 820 600 L840 640 L540 640Z" fill="#F6F6EE"/>')
    ph.append(f'<path d="M960 560 L1080 470 L1080 960 L1000 960Z" fill="#8A8A78"/>' + ''.join(f'<line x1="{960 + k*12}" y1="{560 + k*40}" x2="1080" y2="{500 + k*40}" stroke="#6E6E5E" stroke-width="2"/>' for k in range(10)))   # 右边石墙
    for _ in range(70):                                                                                         # 地上的光斑和影
        x, y = r.uniform(400, 960), r.uniform(640, 960)
        ph.append(f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r.uniform(14, 50):.0f}" ry="{r.uniform(4, 12):.0f}" fill="{r.choice(["#5A6A4E", "#FFFFF4"])}" opacity="{r.uniform(.3, .7):.2f}"/>')
    for _ in range(20):                                                                                         # 落叶
        ph.append(f'<ellipse cx="{r.uniform(420, 980):.0f}" cy="{r.uniform(820, 960):.0f}" rx="6" ry="3" fill="#B8864A" opacity=".8"/>')
    ph.append('<ellipse cx="690" cy="884" rx="260" ry="16" fill="#3A4430" opacity=".35" filter="url(#bl6)"/>')
    ph.append(front(520, 884, 1.12, 1, 2, '#FFFFFF', '#F2EEE4', shoe='#E8D8C8', hairstyle='long', skirt=True, bag='#176B4D'))
    ph.append(front(640, 888, 1.2, 2, 0, '#FFFFFF', '#1E2A24', shoe='#2E2A26', hairstyle='short', racket=True))
    ph.append(front(612, 892, 1.12, 0, 3, '#FFFFFF', '#1E2A24', shoe='#2E2A26', hairstyle='short', kid=True))
    ph.append(front(800, 886, 1.05, 0, 3, '#C6EA3D', '#8A7EA8', shoe='#F4F2EC', hairstyle='short', skirt=True, hat='#E8E4DC', bag='#5A4A3A'))
    ph.append('<circle cx="657" cy="688" r="10" fill="#C6EA3D"/>')
    p.append(f'<g clip-path="url(#ph175)">{"".join(ph)}</g>')
    p.append(f'<rect x="{PX}" y="{PY}" width="{PW}" height="{PH}" filter="url(#fg_f)" opacity=".1" style="mix-blend-mode:multiply"/>')
    INK = '#1A1A18'
    p.append(f'<text x="130" y="1060" font-family="{SANS}" font-weight="500" font-size="19" letter-spacing="2" fill="{INK}">球打得一般，人倒是越来越熟了。</text>')
    title = ''
    for i, ch in enumerate('打着打着'):
        x = 130 + i * 118 + (70 if i >= 2 else 0)
        rot = [-3, 2, -2, 3][i]
        title += f'<text x="{x}" y="1200" transform="rotate({rot} {x + 50} 1170)" font-family="{SANS}" font-weight="900" font-size="{[96, 82, 96, 82][i]}" fill="{INK}">{ch}</text>'
    p.append(f'<g filter="url(#hand175)">{title}</g>')
    lines = ['每周六上午九点，三号场。四年了，这几个人一次也没凑齐过——', '今天齐了。打完球，有人提议：「站好，拍一张。」']
    for i, t in enumerate(lines):
        p.append(f'<text x="130" y="{1252 + i * 26}" font-family="{SANS}" font-size="16" letter-spacing="1" fill="{INK}">{t}</text>')
    p.append(f'<text x="130" y="1312" font-family="{SANS}" font-weight="700" font-size="17" letter-spacing="3" fill="{INK}">周阿姨　　老陈　　小林　　豆豆　　　　　　　　组局・南伴球</text>')
    p.append(f'<text x="130" y="1334" font-family="{SANS}" font-size="11" letter-spacing="1" fill="#5A5A56">场地：三号场　　球：一罐新的，回去少了一颗　　拍照：路过的人　　天气：晴，树下凉快　　片长：一个上午</text>')
    p.append('<circle cx="984" cy="1306" r="7" fill="#C6EA3D"/><circle cx="996" cy="1314" r="4.5" fill="#C6EA3D"/>')
    return page(''.join(p))
