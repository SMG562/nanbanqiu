from lib import *
from lin import glow
from athlete import server, rim

META = dict(
    id=160, slug='one-more', title='再来一球', lines=['再来一球。'],
    style=['运动海报', '高对比', '大字', '光影'], tone='深色', demo=False,
    concept='顶级运动品牌海报的做法：全黑的夜场，一盏泛光灯从右上斜劈下来；低机位仰拍一个正在抛球的人，剪影只在受光的一侧亮出一道轮廓；「再来一球」四个超大粗体字铺满画面，人站在字的前面挡住了一半；全画面只有那颗球是荧光色',
    use='练球 / 坚持；品牌主视觉、高级感',
)


def svg():
    r = random.Random(160)
    p = ['<defs><radialGradient id="vg160" cx="55%" cy="40%" r="75%"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></radialGradient>'
         '<linearGradient id="cone160" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".22"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>'
         '<filter id="gr160"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="16"/><feColorMatrix type="saturate" values="0"/></filter></defs>',
         f'<rect width="{W}" height="{H}" fill="#0B0B0B"/>']
    p.append('<path d="M1080 -40 L1080 120 L380 1350 L40 1350Z" fill="url(#cone160)"/>')                          # 一束斜光
    p.append(glow(1040, 20, 120, 80, '#FFFFFF', .7, 28))
    big = f'font-family="{SANS}" font-weight="900" font-size="440" letter-spacing="-20" fill="#F4F1E8"'
    p.append(f'<g transform="translate(36 0) scale(.9 1)"><text x="0" y="560" {big}>再来</text><text x="0" y="1010" {big}>一球</text></g>')
    p.append(rim(server, 8, -5))
    for _ in range(9):                                                                                             # 甩出去的汗
        x, y = r.uniform(620, 700), r.uniform(400, 470)
        p.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r.uniform(2, 4):.1f}" fill="#F4F1E8" opacity="{r.uniform(.5, .9):.2f}"/>')
    p.append(glow(706, 196, 60, 60, '#E4F76A', .55, 28))
    p.append('<circle cx="706" cy="196" r="26" fill="#C6EA3D"/><path d="M688 178 C700 190 700 202 688 214" stroke="#F6F8E0" stroke-width="4" fill="none"/>')
    p.append('<rect width="1080" height="1350" fill="url(#vg160)"/>')
    p.append('<rect width="1080" height="1350" filter="url(#gr160)" opacity=".16" style="mix-blend-mode:screen"/>')
    p.append(f'<text x="64" y="1150" font-family="{SANS}" font-weight="900" font-size="34" letter-spacing="6" fill="#F4F1E8" transform="scale(1 1)">ONE MORE.</text>')
    p.append(f'<text x="64" y="1188" font-family="{SANS}" font-size="15" letter-spacing="6" fill="#F4F1E8" opacity=".55">MELBOURNE · COURT 3 · 9:47 PM</text>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
