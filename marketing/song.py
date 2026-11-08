"""宋画大格局工具（134 起）：有骨力的山（棱角轮廓 + 明暗块面 + 浓墨骨线 + 雨点皴）、工笔仙鹤、宫殿屋顶。
每张自己传 random.Random(seed)。"""
import math
from lin import ink, blob


def ridge_mountain(r, pts, base, lit='#A6A07A', mid='#86845F', dark='#5E604A', ink_c='#2A2C22', n_strip=7, dots=1200, sid='m'):
    """有骨力的大山：pts 是从左脚到右脚的棱角轮廓（直线段）；山体按竖向棱线切成明暗相间的块面，
    棱线用浓墨勾，块面里点雨点皴。返回 SVG。"""
    d = 'M' + ' L'.join(f'{x:.0f} {y:.0f}' for x, y in pts) + f' L{pts[-1][0]:.0f} {base} L{pts[0][0]:.0f} {base}Z'
    xs = [p[0] for p in pts]
    x0, x1 = min(xs), max(xs)
    top_y = lambda x: min((p[1] for p in pts if abs(p[0] - x) < 40), default=base)
    out = [f'<clipPath id="rc{sid}"><path d="{d}"/></clipPath>', f'<path d="{d}" fill="{mid}"/>', f'<g clip-path="url(#rc{sid})">']
    lines = []
    for i in range(1, n_strip):
        x = x0 + (x1 - x0) * i / n_strip + r.uniform(-20, 20)
        ty = top_y(x)
        seg = [(x, ty - 10)]
        y = ty
        while y < base or len(seg) < 3:
            y += r.uniform(60, 120)
            x += r.uniform(-26, 26) + (x - (x0 + x1) / 2) * .04
            seg.append((x, min(y, base + 20)))
        lines.append(seg)
    for i, seg in enumerate(lines):                       # 每条棱线右侧一块暗面（光从左来）
        nxt = lines[i + 1] if i + 1 < len(lines) else [(x1 + 40, 0), (x1 + 40, base + 40)]
        poly = seg + [(p[0] - 6, p[1]) for p in reversed(nxt)]
        shade = dark if i % 2 == 0 else lit
        out.append('<path d="M' + ' L'.join(f'{a:.0f} {b:.0f}' for a, b in poly) + f'Z" fill="{shade}" opacity="{.9 if shade == dark else .75}"/>')
    for _ in range(dots):                                  # 雨点皴
        x, y = r.uniform(x0, x1), r.uniform(min(p[1] for p in pts), base)
        out.append(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x + r.uniform(-1, 1):.0f}" y2="{y + r.uniform(5, 11):.0f}" stroke="{ink_c}" stroke-width="{r.uniform(1.3, 2.4):.1f}" opacity="{r.uniform(.2, .5):.2f}"/>')
    for seg in lines:                                      # 骨线：浓墨、顿挫
        out.append(ink(seg, r.uniform(7, 12), ink_c, .85, (.05, .5)))
        for _ in range(3 if len(seg) > 1 else 0):          # 棱线边上的短斧劈
            k = r.randrange(len(seg) - 1)
            a, b = seg[k], seg[k + 1]
            out.append(ink([a, ((a[0] + b[0]) / 2 + 26, (a[1] + b[1]) / 2 + 10)], 5, ink_c, .6, (.1, .8)))
    out.append('</g>')
    out.append(ink(pts, 9, ink_c, .9, (.02, .02)))         # 外轮廓
    return ''.join(out)


def crane(cx, cy, s=1.0, rot=0, flip=1):
    """工笔丹顶鹤（侧飞）：白身、黑颈、丹顶，翅尖黑色飞羽一根根分开，覆羽有细线，腿后伸。"""
    g = []
    # 远侧翅（下压，偏灰）
    g.append('<path d="M10 4 C2 22 -12 38 -30 48 C-26 32 -18 18 -12 4Z" fill="#DADDDA" stroke="#B8BCB8" stroke-width="1"/>')
    # 身子 + 尾部黑色次级飞羽
    g.append('<path d="M-54 2 C-40 -14 10 -16 44 -6 C52 -2 52 6 44 10 C10 18 -36 18 -54 2Z" fill="#FFFFFF" stroke="#C6CAC6" stroke-width="1"/>')
    for i in range(5):
        g.append(f'<ellipse cx="{-54 - i * 2}" cy="{2 + i * 2.6}" rx="18" ry="4" transform="rotate({10 + i * 5} {-54 - i * 2} {2 + i * 2.6})" fill="#1E1E1E"/>')
    # 颈（黑）、头（白枕 + 丹顶）、喙
    g.append('<path d="M40 -6 C60 -14 80 -20 100 -20 L102 -12 C82 -10 62 -4 44 6Z" fill="#1E1E1E"/>')
    g.append('<path d="M86 -18 C92 -26 104 -28 112 -22 C116 -16 112 -10 104 -10 C98 -10 92 -12 86 -18Z" fill="#FFFFFF"/>')
    g.append('<path d="M98 -26 C102 -30 110 -30 112 -24 C108 -22 102 -22 98 -26Z" fill="#C8322A"/>')
    g.append('<path d="M106 -20 C110 -22 112 -18 110 -14 L104 -14Z" fill="#1E1E1E"/>')
    g.append('<path d="M112 -18 L146 -15 L112 -13Z" fill="#7A7A5A"/>')
    g.append('<circle cx="106" cy="-19" r="1.4" fill="#F2E2A0"/>')
    # 腿：细长后伸，带脚趾
    g.append('<path d="M-30 10 L-116 22 M-26 12 L-114 30" stroke="#2A2A2A" stroke-width="2" stroke-linecap="round"/>')
    g.append('<path d="M-116 22 l-10 -3 M-116 22 l-10 4 M-114 30 l-10 -2 M-114 30 l-9 5" stroke="#2A2A2A" stroke-width="1.4" stroke-linecap="round"/>')
    # 近侧翅（上扬）：白色覆羽 + 细羽线 + 一根根黑色初级飞羽
    g.append('<path d="M22 -8 C14 -50 -6 -92 -36 -122 L-60 -112 C-46 -78 -34 -40 -24 -6Z" fill="#FFFFFF" stroke="#C6CAC6" stroke-width="1.2"/>')
    for k in range(5):
        t = .2 + k * .15
        g.append(f'<path d="M{-24 + 46 * (1 - t) * .5:.0f} {-6 - 100 * t:.0f} q{18:.0f} {6:.0f} {30 - k * 3:.0f} {2:.0f}" fill="none" stroke="#C6CAC6" stroke-width="1"/>')
    for i in range(7):
        a = -128 + i * 9
        x, y = -40 - i * 3.4, -116 + i * 4.2
        g.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="22" ry="3.6" transform="rotate({a} {x:.1f} {y:.1f})" fill="#1E1E1E"/>')
    for i in range(6):                                     # 次级飞羽的扇贝边
        x, y = -22 - i * 6, -10 - i * 18
        g.append(f'<ellipse cx="{x}" cy="{y}" rx="8" ry="4" transform="rotate(-60 {x} {y})" fill="#FFFFFF" stroke="#C6CAC6" stroke-width="1"/>')
    return f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s * flip} {s})">{"".join(g)}</g>'


def roof(cx, y, w, h, gold='#E2A93B', dark='#B87A1E', ridge='#C08422', tile_n=None):
    """正面看的庑殿顶（金瓦）：正脊、鸱吻、起翘檐角、瓦垄。cx 中心，y 正脊高度，w 檐宽，h 屋面高。"""
    top = w * .62
    out = [f'<path d="M{cx - w/2:.0f} {y + h:.0f} C{cx - w*.42:.0f} {y + h*.7:.0f} {cx - top/2 - w*.05:.0f} {y + h*.3:.0f} {cx - top/2:.0f} {y:.0f} L{cx + top/2:.0f} {y:.0f} '
           f'C{cx + top/2 + w*.05:.0f} {y + h*.3:.0f} {cx + w*.42:.0f} {y + h*.7:.0f} {cx + w/2:.0f} {y + h:.0f}Z" fill="{gold}"/>']
    n = tile_n or max(6, int(w / 20))
    for i in range(n + 1):
        x = cx - w * .46 + w * .92 * i / n
        out.append(f'<line x1="{x:.0f}" y1="{y + h:.0f}" x2="{cx + (x - cx) * .66:.0f}" y2="{y + 2:.0f}" stroke="{dark}" stroke-width="{max(1, w / 400):.1f}" opacity=".7"/>')
    rh = max(4, h * .14)
    out.append(f'<rect x="{cx - top/2 - 4:.0f}" y="{y - rh/2:.0f}" width="{top + 8:.0f}" height="{rh:.0f}" rx="2" fill="{ridge}"/>')
    for sx in (-1, 1):
        ex = cx + sx * (top / 2 + 2)
        out.append(f'<path d="M{ex:.0f} {y:.0f} C{ex + sx*rh*.4:.0f} {y - rh*1.6:.0f} {ex + sx*rh*1.4:.0f} {y - rh*2:.0f} {ex + sx*rh*1.2:.0f} {y - rh*.6:.0f}Z" fill="{ridge}"/>')
        tx = cx + sx * w / 2
        out.append(f'<path d="M{tx:.0f} {y + h:.0f} C{tx + sx*h*.2:.0f} {y + h*.9:.0f} {tx + sx*h*.32:.0f} {y + h*.7:.0f} {tx + sx*h*.36:.0f} {y + h*.55:.0f} C{tx + sx*h*.1:.0f} {y + h*.8:.0f} {tx - sx*h*.1:.0f} {y + h*.9:.0f} {tx - sx*h*.2:.0f} {y + h*.95:.0f}Z" fill="{ridge}"/>')
    return ''.join(out)
