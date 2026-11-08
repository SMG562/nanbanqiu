from lib import *
from xia import DEFS, brush_v
from poet import scholar, vtext, seal, footer, ZHU

META = dict(
    id=221, slug='xia-manual', title='南伴球谱', lines=['南伴球谱'],
    style=['侠气', '秘籍', '冷知识', '现代版式'], tone='亮色', demo=False,
    concept='一页武功秘籍：南伴绿布面封皮上摊着一页线装书，朱丝栏竖格，右边竖排写「第一式　抛球」的口诀，左边是招式图——一个人举拍，球在头顶，虚线、箭头和「一尺」的标注；口诀里藏一条真规则：抛歪了不挥拍，可以重抛，不算失误。',
    use='侠气系列 · 肆；网球冷知识 / 新手友好',
)

COLS = ['第一式　抛球', '抛球宜稳，高过拍顶一尺', '球未落，眼先到', '心急者，球必歪', '一抛不准，可再抛', '不挥拍，不算失误']


def svg():
    r = random.Random(221)
    p = [f'<defs>{DEFS}<pattern id="cloth221" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#176B4D"/><path d="M0 0 L8 8" stroke="#1F7A58" stroke-width="2"/></pattern>'
         '<linearGradient id="pg221" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F6EBCF"/><stop offset="1" stop-color="#EFDDB4"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#cloth221)"/>']
    # 书页
    X0, Y0, X1, Y1 = 90, 120, 990, 1140
    p.append(f'<rect x="{X0 + 10}" y="{Y0 + 14}" width="{X1 - X0}" height="{Y1 - Y0}" fill="#0B3B2A" opacity=".35"/><rect x="{X0}" y="{Y0}" width="{X1 - X0}" height="{Y1 - Y0}" fill="url(#pg221)"/>')
    p.append(f'<rect x="{X0 + 34}" y="{Y0 + 34}" width="{X1 - X0 - 68}" height="{Y1 - Y0 - 68}" fill="none" stroke="{ZHU}" stroke-width="3"/><rect x="{X0 + 42}" y="{Y0 + 42}" width="{X1 - X0 - 84}" height="{Y1 - Y0 - 84}" fill="none" stroke="{ZHU}" stroke-width="1.2"/>')
    # 右侧线装：订线孔
    for y in (Y0 + 120, Y0 + 380, Y0 + 640, Y0 + 900):
        p.append(f'<circle cx="{X1 - 16}" cy="{y}" r="4" fill="#6A4E36"/><path d="M{X1 - 16} {y} H{X1 + 6}" stroke="#E8DCC0" stroke-width="3"/>')
    # 朱丝栏 + 竖排口诀（右起）
    cx0, step = 860, 62
    for i in range(len(COLS) + 1):
        x = cx0 + step / 2 - i * step
        p.append(f'<path d="M{x:.0f} {Y0 + 330} V{Y1 - 42}" stroke="{ZHU}" stroke-width="1" opacity=".55"/>')
    for i, t in enumerate(COLS):
        x = cx0 - i * step
        col = '#2B1E14' if i else ZHU
        p.append(vtext(t, x, Y0 + 380, 34 if i else 36, col, 1.24, 700 if i == 0 else 500))
    # 书名 + 卷次
    p.append(f'<g filter="url(#brush)"><text x="900" y="{Y0 + 150}" text-anchor="end" font-family="{SERIF}" font-weight="900" font-size="104" fill="#1E1A14">南伴球谱</text></g>')
    p.append(f'<text x="900" y="{Y0 + 210}" text-anchor="end" font-family="{SERIF}" font-weight="600" font-size="30" letter-spacing="8" fill="#6A4E36">卷一 · 发球</text>')
    p.append(seal(150, Y0 + 70, 40, '南伴'))
    # 招式图（左下框）
    bx, by, bw, bh = 150, 470, 330, 600
    p.append(f'<rect x="{bx}" y="{by}" width="{bw}" height="{bh}" fill="none" stroke="#6A4E36" stroke-width="2"/>')
    gx, gy = bx + 150, by + 560
    p.append(f'<ellipse cx="{gx}" cy="{gy}" rx="70" ry="10" fill="#6A4E36" opacity=".2"/>')
    p.append(scholar(gx, gy, 2.0, robe='#3A4A44', sash=ZHU, flip=1, arm='up', wind=.3))
    p.append(f'<circle cx="{gx + 30}" cy="{by + 70}" r="14" fill="#DDF35A" stroke="#2B1E14" stroke-width="2"/>')
    p.append(f'<path d="M{gx + 30} {by + 90} V{gy - 300}" stroke="#2B1E14" stroke-width="2" stroke-dasharray="6 8"/>')
    p.append(f'<path d="M{gx + 84} {by + 70} V{gy - 330} M{gx + 76} {by + 70} H{gx + 92} M{gx + 76} {gy - 330} H{gx + 92}" stroke="{ZHU}" stroke-width="2"/>'
             f'<text x="{gx + 98}" y="{(by + 70 + gy - 330) / 2 + 10:.0f}" font-family="{SERIF}" font-weight="700" font-size="26" fill="{ZHU}">一尺</text>')
    p.append(f'<path d="M{bx + 30} {by + 210} Q{gx - 40} {by + 150} {gx + 10} {by + 86}" stroke="#2B1E14" stroke-width="1.6" fill="none"/><text x="{bx + 22}" y="{by + 236}" font-family="{SERIF}" font-size="22" fill="#2B1E14">眼看球</text>')
    p.append(f'<path d="M{bx + 30} {gy - 150} L{gx - 26} {gy - 120}" stroke="#2B1E14" stroke-width="1.6"/><text x="{bx + 22}" y="{gy - 160}" font-family="{SERIF}" font-size="22" fill="#2B1E14">腕放松</text>')
    p.append(f'<text x="{bx + bw / 2}" y="{by - 18}" text-anchor="middle" font-family="{SERIF}" font-weight="600" font-size="24" letter-spacing="6" fill="#6A4E36">抛球式图</text>')
    p.append('<path d="M0 1196 Q300 1176 620 1194 T1080 1188 V1350 H0Z" fill="#0E5139"/>')
    footer(p, '抛歪了，可以再抛，不算失误。', '侠气 · 肆 / 南伴球谱', 'THE SERVE MANUAL, VOLUME ONE')
    return page(''.join(p))
