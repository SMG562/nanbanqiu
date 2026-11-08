from lib import *
from lin import blob, ink
from people import person
from cine import DEFS, frame, boards, TOP, BOT

META = dict(
    id=186, slug='cine-after-school', title='放学后', lines=['放学后'],
    style=['电影镜头', '大远景', '逆光', '年代感'], tone='深色', demo=False,
    concept='电影的大远景逆光镜头：放学后的低太阳压在地平线上，教学楼、一排白杨和球场的围网都成了剪影，围网上那八块红牌子被太阳照透、发着红光；空荡荡的南伴绿球场上只剩一个孩子在练发球，球抛向太阳，他的影子拉得很长，一直伸到镜头前；上下电影黑边，只有场次和一句很轻的话',
    use='品牌电影感主视觉 / 回忆；用镜头而不是文字讲氛围',
)


def svg():
    r = random.Random(186)
    SX, SY = 700, 742                                                                                         # 太阳 / 消失点
    p = [f'<defs>{DEFS}<linearGradient id="sk186" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A3450"/><stop offset=".35" stop-color="#7A5A6A"/>'
         '<stop offset=".7" stop-color="#E8905A"/><stop offset="1" stop-color="#FFD898"/></linearGradient>'
         '<radialGradient id="sun186"><stop offset="0" stop-color="#FFFBE8"/><stop offset=".2" stop-color="#FFE8B0" stop-opacity=".9"/><stop offset="1" stop-color="#FFB870" stop-opacity="0"/></radialGradient>'
         '<linearGradient id="ct186" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A6A40"/><stop offset=".25" stop-color="#1E4A38"/><stop offset="1" stop-color="#0E2A20"/></linearGradient></defs>',
         f'<rect y="{TOP}" width="1080" height="{SY - TOP}" fill="url(#sk186)"/>']
    for _ in range(9):                                                                                        # 拉长的晚霞
        y = r.uniform(260, 640)
        p.append(f'<rect x="{r.uniform(-200, 800):.0f}" y="{y:.0f}" width="{r.uniform(300, 700):.0f}" height="{r.uniform(4, 12):.0f}" rx="6" fill="#FFC890" opacity="{r.uniform(.2, .45):.2f}" filter="url(#bl6)"/>')
    p.append(f'<circle cx="{SX}" cy="{SY - 70}" r="320" fill="url(#sun186)"/>')
    p.append(f'<circle cx="{SX}" cy="{SY - 70}" r="34" fill="#FFFBEE"/>')
    # 剪影：教学楼 + 白杨
    p.append('<rect x="80" y="600" width="520" height="150" fill="#2A2026"/><rect x="800" y="630" width="200" height="120" fill="#2A2026"/>')   # 教学楼和旁边的矮楼，中间露出落日
    for row in range(2):
        for col in range(15):
            if r.random() < .25 and (104 + col * 60 < 580 or 104 + col * 60 > 810):
                p.append(f'<rect x="{104 + col * 60}" y="{624 + row * 52}" width="30" height="26" fill="#F2B870" opacity=".85"/>')
    for x in range(20, 1080, 64):
        if abs(x - SX) < 50:
            continue
        p.append(f'<rect x="{x - 3}" y="560" width="6" height="190" fill="#1E1A1E"/>' + ''.join(blob(r, x + r.uniform(-8, 8), 520 + r.uniform(-50, 40), 14, 38, '#1E1A1E', 1) for _ in range(3)))
    # 球场：从太阳下的地平线一直铺到镜头前
    p.append(f'<path d="M-200 {BOT} L{SX - 60} {SY} L{SX + 60} {SY} L1300 {BOT}Z" fill="url(#ct186)"/>')
    p.append(f'<path d="M0 {SY} L1080 {SY} L1080 {BOT} L0 {BOT}Z" fill="url(#ct186)" opacity=".85"/>')
    for u in (-.9, -.62, .62, .9):                                                                             # 白线收向太阳
        p.append(f'<line x1="{SX + u * 60:.0f}" y1="{SY}" x2="{SX + u * 1100:.0f}" y2="{BOT}" stroke="#F4EED8" stroke-width="{3 + abs(u) * 3:.0f}" opacity=".7"/>')
    for v, w in ((.18, 3), (.55, 6)):
        y = SY + (BOT - SY) * v
        half = 60 + (1100 - 60) * v * .62
        p.append(f'<line x1="{SX - half:.0f}" y1="{y:.0f}" x2="{SX + half:.0f}" y2="{y:.0f}" stroke="#F4EED8" stroke-width="{w}" opacity=".6"/>')
    p.append(f'<rect x="{SX - 60}" y="{SY - 6}" width="120" height="6" fill="#FFE8B0" opacity=".9"/>')         # 地平线上被照亮的一线
    # 远端围网（剪影）+ 被照透的红牌子
    p.append(f'<rect x="120" y="{SY - 70}" width="840" height="70" fill="#1A1A1E" opacity=".55"/>')
    p.append(''.join(f'<line x1="{x}" y1="{SY - 76}" x2="{x}" y2="{SY}" stroke="#141418" stroke-width="3"/>' for x in range(120, 980, 60)))
    boards(p, 540, SY - 60, 34, glow=True, fill='#E8483A', txt='#FFE8C8')
    # 一个孩子在练发球（剪影）+ 拉长的影子
    kx, ky = 420, 990
    p.append(f'<path d="M{kx - 12} {ky} L{kx + 12} {ky} L{-60} {BOT} L{-220} {BOT}Z" fill="#081A12" opacity=".75" filter="url(#bl6)"/>')
    p.append(person(kx, ky, .62, 'five', 1, 0, 0, '#1A1A1E', '#1A1A1E', shoe='#1A1A1E', sleeve='short', hairstyle='short', mono='#14121A'))
    p.append(f'<g opacity=".9">{person(kx + 3, ky - 1, .62, "five", 1, 0, 0, "#FFC890", "#FFC890", sleeve="short", hairstyle="short", mono="#FFB060")}</g>'.replace('<g opacity=".9">', '<g opacity=".35" transform="translate(3 -2)">'))
    p.append(person(kx, ky, .62, 'five', 1, 0, 0, '#1A1A1E', '#1A1A1E', shoe='#1A1A1E', sleeve='short', hairstyle='short', mono='#14121A'))
    p.append(f'<circle cx="{kx + 40}" cy="{ky - 440}" r="14" fill="#C6EA3D"/><circle cx="{kx + 40}" cy="{ky - 440}" r="30" fill="#E4F76A" opacity=".35" filter="url(#bl6)"/>')
    frame(p, '第 7 场　·　放学后', '放 学 后', '17 : 42', '天快黑了。打完这一个，就回家吃饭。')
    return page(''.join(p))
