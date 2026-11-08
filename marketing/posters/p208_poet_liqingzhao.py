from lib import *
from poet import vtext, seal, latin, egret, DAI

META = dict(
    id=208, slug='poet-liqingzhao', title='沉醉不知归处', lines=['沉醉不知归处'],
    style=['古风', '诗人', '俯视', '现代版式'], tone='亮色', demo=False,
    concept='李清照《如梦令》：常记溪亭日暮，沉醉不知归处……误入藕花深处，争渡争渡，惊起一滩鸥鹭。从正上方往下看：暮色的水面上铺满一片片南伴绿的荷叶，粉荷点在中间；一叶小舟里的人刚挥完拍，一颗网球落在荷叶上，一串白鹭被惊起，往右上飞走。',
    use='诗人打球系列 · 李清照；傍晚球局 / 打到天黑主题',
)

WATER = '#F4CF9C'


def leaf(cx, cy, rr, c, rot, r):
    veins = ''.join(f'<path d="M{cx} {cy} L{cx + rr * .92 * math.cos(math.radians(rot + a)):.1f} {cy + rr * .92 * math.sin(math.radians(rot + a)):.1f}" />' for a in range(20, 360, 34))
    notch = f'<path d="M{cx} {cy} L{cx + rr * 1.05 * math.cos(math.radians(rot - 5)):.1f} {cy + rr * 1.05 * math.sin(math.radians(rot - 5)):.1f} L{cx + rr * 1.05 * math.cos(math.radians(rot + 5)):.1f} {cy + rr * 1.05 * math.sin(math.radians(rot + 5)):.1f}Z" fill="{WATER}"/>'
    return (f'<g><circle cx="{cx + rr * .05:.1f}" cy="{cy + rr * .08:.1f}" r="{rr}" fill="#B9874E" opacity=".25"/><circle cx="{cx}" cy="{cy}" r="{rr}" fill="{c}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{rr * .82:.1f}" fill="#FFFFFF" opacity=".07"/>'
            f'<g stroke="#FFFFFF" stroke-width="{max(1.2, rr * .018):.1f}" opacity=".28">{veins}</g>{notch}'
            f'<circle cx="{cx}" cy="{cy}" r="{max(3, rr * .06):.1f}" fill="#E8F2B0" opacity=".8"/></g>')


def lotus(cx, cy, rr):
    o = ''
    for k, (n, f, c) in enumerate([(8, 1.0, '#F7B3C2'), (6, .7, '#F28BA6'), (5, .42, '#FBD3DC')]):
        for i in range(n):
            a = math.radians(i * 360 / n + k * 20)
            o += f'<ellipse cx="{cx + rr * f * .5 * math.cos(a):.1f}" cy="{cy + rr * f * .5 * math.sin(a):.1f}" rx="{rr * f * .5:.1f}" ry="{rr * f * .26:.1f}" transform="rotate({math.degrees(a):.0f} {cx + rr * f * .5 * math.cos(a):.1f} {cy + rr * f * .5 * math.sin(a):.1f})" fill="{c}"/>'
    return o + f'<circle cx="{cx}" cy="{cy}" r="{rr * .16:.1f}" fill="#F2C94C"/>'


def boat(x, y, rot):
    """俯视小舟 + 舟中人（头顶发髻、袖子伸出去握拍）。"""
    return (f'<g transform="translate({x} {y}) rotate({rot})">'
            '<path d="M-120 0 Q0 -46 120 0 Q0 46 -120 0Z" fill="#B97A45"/><path d="M-104 0 Q0 -34 104 0 Q0 34 -104 0Z" fill="#D9A46A"/>'
            '<path d="M-40 -24 V24 M40 -24 V24" stroke="#B97A45" stroke-width="5"/>'
            '<ellipse cx="0" cy="2" rx="26" ry="20" fill="#F3EEE0"/><path d="M-6 -16 Q0 0 -4 20" stroke="#C23A2B" stroke-width="3" fill="none"/>'
            '<path d="M10 -12 Q40 -40 64 -54" stroke="#F3EEE0" stroke-width="13" stroke-linecap="round" fill="none"/>'
            '<path d="M64 -54 L80 -64" stroke="#3A2A1E" stroke-width="4" stroke-linecap="round"/><ellipse cx="94" cy="-74" rx="13" ry="19" transform="rotate(55 94 -74)" fill="none" stroke="#3A2A1E" stroke-width="3"/>'
            '<circle cx="-2" cy="0" r="12" fill="#1E1E1E"/><circle cx="-8" cy="-3" r="7" fill="#1E1E1E"/><path d="M-20 -10 L4 6" stroke="#E2B93B" stroke-width="2.4"/>'
            '<path d="M-130 0 Q-200 40 -300 20" stroke="#FFFFFF" stroke-width="3" fill="none" opacity=".6"/><path d="M-128 8 Q-190 70 -280 70" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".4"/>'
            '</g>')


def svg():
    r = random.Random(208)
    p = [f'<defs><linearGradient id="w208" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F8DDB0"/><stop offset="1" stop-color="#F0B98A"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#w208)"/>']
    for _ in range(30):                                                                                         # 水纹
        x, y, w = r.uniform(0, 1080), r.uniform(0, 1350), r.uniform(40, 140)
        p.append(f'<path d="M{x:.0f} {y:.0f} q{w / 2:.0f} -8 {w:.0f} 0" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".35"/>')
    greens = ['#2FA36B', '#3D9B6E', '#1F7A52', '#4DB27F', '#176B4D', '#5FBF8A']
    leaves = []
    tries = 0
    while len(leaves) < 46 and tries < 4000:
        tries += 1
        rr = r.uniform(46, 150)
        x, y = r.uniform(-60, 1140), r.uniform(-60, 1410)
        if x - rr < 330 and y - rr < 1000: continue                      # 留字
        if (x - 560) ** 2 + (y - 780) ** 2 < (rr + 170) ** 2: continue   # 留船
        if x + rr * .3 > 560 and x - rr < 1000 and y + rr > 260 and y - rr < 640 and (x - 820) ** 2 / 4 + (y - 450) ** 2 < 260 ** 2: continue   # 鹭飞的那片水
        if x - rr < 560 and y + rr > 1170: continue                     # 留落款
        if any((x - a) ** 2 + (y - b) ** 2 < ((rr + c) * .72) ** 2 for a, b, c in leaves): continue
        leaves.append((x, y, rr))
    for x, y, rr in sorted(leaves, key=lambda t: -t[2]):
        p.append(leaf(round(x), round(y), round(rr), r.choice(greens), r.uniform(0, 360), r))
    for x, y, rr in [(930, 980, 62), (420, 1060, 50), (980, 170, 54)]:
        p.append(lotus(x, y, rr))
    p.append(boat(560, 780, -28))
    # 球落在荷叶上 + 飞出的弧线
    p.append('<path d="M650 700 Q760 600 880 640" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="8 10" fill="none" opacity=".8"/>')
    p.append('<circle cx="884" cy="642" r="17" fill="#D8F04A"/><path d="M872 632 q10 10 2 22 M896 632 q-10 10 -2 22" stroke="#FFFFFF" stroke-width="2.4" fill="none"/>')
    for x, y, s, rot in [(700, 560, .9, -20), (770, 500, .8, -28), (860, 430, 1.0, -18), (940, 360, .75, -30), (820, 360, .65, -12), (1000, 280, .7, -24), (900, 250, .55, -16)]:
        p.append(f'<g opacity=".97">{egret(x, y, s, rot)}</g>')
    # 字
    p.append(vtext('沉醉不知归处', 150, 200, 104, DAI, 1.12, 700))
    p.append(vtext('常记溪亭日暮', 300, 214, 30, '#6A4E36', 1.5, 500))
    p.append(vtext('误入藕花深处', 256, 214, 30, '#6A4E36', 1.5, 500))
    p.append(seal(127, 880, 46, '南伴'))
    p.append(f'<text x="64" y="1250" font-family="{SERIF}" font-weight="600" font-size="38" letter-spacing="6" fill="{DAI}">打到天黑，也不想回家</text>')
    p.append(latin('诗人打球 · 贰 / 李清照《如梦令》', 66, 1290, '#6A4E36', 18, ls=3))
    p.append(latin('LOST IN THE LOTUS, STILL RALLYING', 66, 1318, '#8C6A4C', 12, ls=5))
    p.append(f'<g transform="translate(1030 1300)"><circle cx="-158" cy="-8" r="9" fill="#C6EA3D"/><circle cx="-142" cy="2" r="6" fill="#C6EA3D" stroke="#176B4D" stroke-width="2"/>'
             f'<text x="0" y="6" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="28" letter-spacing="8" fill="#FFFFFF">南伴球</text></g>')
    return page(''.join(p))
