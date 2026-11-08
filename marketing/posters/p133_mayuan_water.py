from lib import *

META = dict(
    id=133, slug='mayuan-water', title='这颗不捡了', lines=['打进湖里了，', '这颗就不捡了。'],
    style=['宋画', '图案', '极简', '幽默'], tone='浅色', demo=False,
    concept='借马远《水图》的线：整张绢色底铺满一层层起伏、带尖浪的细墨水纹，像一块现代图案；只有一颗荧光黄绿的球漂在水上，周围一圈圈涟漪把水纹推开——满纸的线，一个点',
    use='球打飞 / 湖边球场；宋画的线做成现代图案，一眼看到那颗球',
)


def svg():
    r = random.Random(133)
    bx, by, br_ = 686, 790, 20
    p = [f'<rect width="{W}" height="{H}" fill="#F2EAD4"/>',
         f'<defs><mask id="mk133"><rect width="1080" height="1350" fill="#fff"/><ellipse cx="{bx}" cy="{by+4}" rx="70" ry="26" fill="#000"/></mask></defs>']
    lines = ''
    y = 380
    row = 0
    while y < 1170:
        amp = 10 + 8 * math.sin(row * .35)
        k = r.uniform(.016, .022)
        ph = r.uniform(0, 6.3)
        pts = []
        for x in range(-20, 1110, 6):
            v = 1 - abs(math.sin(k * x + ph + row * .4))
            pts.append(f'{x},{y - amp * v ** 2.2:.1f}')
        lines += f'<polyline points="{" ".join(pts)}" fill="none" stroke="#3E4C52" stroke-width="{1.6 if row % 4 else 2.4}" opacity="{.55 if row % 4 else .8}"/>'
        y += 15 + 3 * math.sin(row * .5)
        row += 1
    p.append(f'<g mask="url(#mk133)">{lines}</g>')
    for i, (rx, ry) in enumerate([(42, 12), (64, 20), (90, 28)]):
        p.append(f'<ellipse cx="{bx}" cy="{by+6}" rx="{rx}" ry="{ry}" fill="none" stroke="#3E4C52" stroke-width="1.5" opacity="{.7 - i * .2}"/>')
    p.append(f'<circle cx="{bx}" cy="{by}" r="{br_}" fill="#C6EA3D"/><path d="M{bx-14} {by-14} C{bx-4} {by-5} {bx-4} {by+5} {bx-14} {by+14}" stroke="#F6F8E0" stroke-width="2.6" fill="none"/>'
             f'<path d="M{bx-br_} {by+3} A{br_} {br_} 0 0 0 {bx+br_} {by+3}Z" fill="#8FB42A" opacity=".55"/>')
    p.append(tag('THE LAKE', color='#2E3A3E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=272, size=50, colors=('#2E3A3E', '#9E2A2B'), lh=70))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.07, light=True))
    return page(''.join(p))
