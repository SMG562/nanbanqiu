from lib import *
from textbook import DEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish

META = dict(
    id=190, slug='story-four-ways', title='凑齐了', lines=['凑齐了。'],
    style=['课本插画', '俯拍', '故事', '图形'], tone='亮色', demo=False,
    concept='换一个机位讲故事：从正上方往下看一块南伴绿的球场，像一张干净的图形海报；四个孩子从四个角落、四个方向朝球网走来，身后各拖着一串虚线脚印；场边的围网上，八块红牌子从上面看是一排小红块；一眼看懂：四个人，凑齐了',
    use='球局满员 / 约齐了；图形感强、一眼看懂',
)


def kid_top(x, y, ang, shirt, hair='#2A1E18', racket=True):
    """从正上方看的一个人：肩膀、头顶、拍子，朝向 ang 度走。"""
    a = math.radians(ang)
    o = f'<g transform="translate({x} {y}) rotate({ang + 90})">'
    o += f'<ellipse cx="-12" cy="22" rx="9" ry="14" fill="#2A3A5A"/><ellipse cx="12" cy="10" rx="9" ry="14" fill="#2A3A5A"/>'      # 迈开的腿
    o += f'<ellipse cx="0" cy="0" rx="34" ry="20" fill="{shirt}"/><circle cx="0" cy="-2" r="16" fill="{hair}"/>'
    if racket:
        o += f'<line x1="30" y1="4" x2="52" y2="30" stroke="{INK}" stroke-width="4"/><ellipse cx="62" cy="44" rx="13" ry="18" transform="rotate(-36 62 44)" fill="none" stroke="{INK}" stroke-width="4"/>'
    return o + '</g>'


def svg():
    p = [f'<defs>{DEFS}</defs>', '<rect width="1080" height="1350" fill="#E6D8B4"/>']
    X0, Y0, X1, Y1 = 250, 260, 830, 1180                                                                     # 球场（俯视）
    p.append(f'<rect x="{X0 - 50}" y="{Y0 - 50}" width="{X1 - X0 + 100}" height="{Y1 - Y0 + 100}" fill="none" stroke="#2E5A44" stroke-width="6"/>')   # 围网
    for i in range(8):                                                                                        # 从上面看的八块红牌子
        p.append(f'<rect x="{X0 - 20 + i * 76 + (20 if i >= 4 else 0)}" y="{Y0 - 62}" width="54" height="14" fill="{RED}" stroke="{INK}" stroke-width="2"/>')
    p.append(outlined(f'<rect x="{X0}" y="{Y0}" width="{X1 - X0}" height="{Y1 - Y0}" fill="{GREEN}"/>'))
    p.append(f'<rect x="{X0}" y="{Y0}" width="{X1 - X0}" height="{Y1 - Y0}" fill="url(#dots_t)" opacity=".14"/>')
    W2, H2 = X1 - X0, Y1 - Y0
    for d in [f'M{X0 + 30} {Y0 + 30} L{X1 - 30} {Y0 + 30} L{X1 - 30} {Y1 - 30} L{X0 + 30} {Y1 - 30}Z', f'M{X0 + 80} {Y0 + 30} L{X0 + 80} {Y1 - 30} M{X1 - 80} {Y0 + 30} L{X1 - 80} {Y1 - 30}',
              f'M{X0 + 80} {Y0 + H2 * .27:.0f} L{X1 - 80} {Y0 + H2 * .27:.0f} M{X0 + 80} {Y0 + H2 * .73:.0f} L{X1 - 80} {Y0 + H2 * .73:.0f} M{X0 + W2 / 2:.0f} {Y0 + H2 * .27:.0f} L{X0 + W2 / 2:.0f} {Y0 + H2 * .73:.0f}']:
        p.append(f'<path d="{d}" stroke="#F4EED8" stroke-width="6" fill="none"/>')
    NY = Y0 + H2 / 2
    p.append(f'<rect x="{X0 - 14}" y="{NY - 5:.0f}" width="{W2 + 28}" height="10" fill="#F4EED8" stroke="{INK}" stroke-width="2"/><circle cx="{X0 - 14}" cy="{NY:.0f}" r="8" fill="#4A4A4A"/><circle cx="{X1 + 14}" cy="{NY:.0f}" r="8" fill="#4A4A4A"/>')
    # 四个人从四个方向走向球网，身后一串虚线脚印
    walkers = [((60, 140), (X0 + 150, NY - 120), '#FFFFFF'), ((1020, 140), (X1 - 150, NY - 120), '#F2C8C0'),
               ((60, 1300), (X0 + 150, NY + 120), '#C8DCF0'), ((1020, 1300), (X1 - 150, NY + 120), '#F2E2A8')]
    for (sx, sy), (ex, ey), shirt in walkers:
        p.append(f'<path d="M{sx} {sy} L{ex} {ey}" stroke="{INK}" stroke-width="3" stroke-dasharray="2 16" stroke-linecap="round" opacity=".55"/>')
        ang = math.degrees(math.atan2(ey - sy, ex - sx))
        p.append(outlined(kid_top(ex, ey, ang, shirt)))
    p.append(f'<circle cx="{X0 + W2 / 2 + 60:.0f}" cy="{NY - 40:.0f}" r="14" fill="#C6EA3D" stroke="{INK}" stroke-width="2.5"/>')
    p.append(f'<text x="540" y="140" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="80" letter-spacing="16" fill="{INK}">凑齐了。</text>')
    p.append(f'<text x="540" y="1262" text-anchor="middle" font-family="{SERIF}" font-weight="500" font-size="26" letter-spacing="4" fill="{INK}">四个人，从四个方向来。</text>')
    p.append(f'<circle cx="476" cy="1300" r="7" fill="#C6EA3D" stroke="{INK}" stroke-width="2"/><circle cx="489" cy="1309" r="4.5" fill="#C6EA3D" stroke="{INK}" stroke-width="1.6"/><text x="500" y="1315" font-family="{SERIF}" font-weight="900" font-size="22" letter-spacing="4" fill="{INK}">南伴球</text>')
    finish(p)
    return page(''.join(p))
