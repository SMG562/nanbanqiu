"""南伴球定制字标（196 起）：逐笔画的高对比细长衬线 NANBANQIU。
粗笔 TK、发丝笔 TN；字高 260（局部坐标，基线 y=260）。N-A-N 共用笔画，Q 是开口圈 + 甩出去的球。"""
TK, TN, H = 30, 3.6, 260


def _poly(pts, c):
    return '<polygon points="' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + f'" fill="{c}"/>'


def _serif(x, y, w, c):
    return f'<rect x="{x - w / 2:.1f}" y="{y - TN / 2:.1f}" width="{w:.1f}" height="{TN:.1f}" fill="{c}"/>'


def nanbanqiu(c='#0B3B2A', ball='#C6EA3D'):
    """返回 (svg, 总宽)。"""
    o = []
    # N1
    o += [f'<rect x="0" y="0" width="{TN}" height="{H}" fill="{c}"/>', _poly([(0, 0), (TK, 0), (116 + TN, H), (116 + TN - TK, H)], c),
          _serif(TN / 2, H, 34, c), _serif(TN / 2 - 6, 0, 22, c)]
    o.append(f'<rect x="116" y="0" width="{TN}" height="{H}" fill="{c}"/>')
    # A1：左腿就是 N1 的右竖，从竖顶斜下来
    o += [_poly([(116, 0), (116 + TK, 0), (246, H), (246 - TK, H)], c), f'<rect x="116" y="174" width="70" height="{TN}" fill="{c}"/>', _serif(231, H, 44, c)]
    # N2：左竖立在 A1 的脚上
    o += [f'<rect x="243" y="0" width="{TN}" height="{H}" fill="{c}"/>', _poly([(243, 0), (243 + TK, 0), (363, H), (363 - TK, H)], c),
          f'<rect x="{363 - TN}" y="0" width="{TN}" height="{H}" fill="{c}"/>', _serif(363 - TN / 2, 0, 34, c)]
    # B
    bx = 396
    o += [f'<rect x="{bx}" y="0" width="{TK}" height="{H}" fill="{c}"/>', _serif(bx + 6, 0, 40, c), _serif(bx + 6, H, 40, c),
          f'<path d="M{bx + TK} 0 A62 65 0 0 1 {bx + TK} 130 Z M{bx + TK} {TN} A40 {65 - TN} 0 0 1 {bx + TK} {130 - TN} Z" fill="{c}" fill-rule="evenodd"/>',
          f'<path d="M{bx + TK} 128 A74 66 0 0 1 {bx + TK} {H} Z M{bx + TK} {128 + TN} A50 {66 - TN} 0 0 1 {bx + TK} {H - TN} Z" fill="{c}" fill-rule="evenodd"/>']
    # A2（独立）+ N3 共用 A2 的右脚
    ax = 524
    o += [f'<line x1="{ax + 64}" y1="0" x2="{ax}" y2="{H}" stroke="{c}" stroke-width="{TN}"/>', _poly([(ax + 52, 0), (ax + 52 + TK, 0), (ax + 130, H), (ax + 130 - TK, H)], c),
          f'<rect x="{ax + 26}" y="174" width="72" height="{TN}" fill="{c}"/>', _serif(ax, H, 30, c)]
    nx = ax + 127
    o += [f'<rect x="{nx}" y="0" width="{TN}" height="{H}" fill="{c}"/>', _poly([(nx, 0), (nx + TK, 0), (nx + 120, H), (nx + 120 - TK, H)], c),
          f'<rect x="{nx + 120 - TN}" y="0" width="{TN}" height="{H}" fill="{c}"/>', _serif(nx + 120 - TN / 2, 0, 34, c)]
    # Q：两侧粗、上下细的椭圆圈，右下角留一个开口，尾巴从开口里甩出去，在字底下划一道细弧，末端是一颗球
    qx, qw = nx + 152, 178
    cx, cy = qx + qw / 2, H / 2
    o.append(f'<mask id="qm"><rect x="{qx - 20}" y="-20" width="{qw + 40}" height="{H + 40}" fill="#fff"/><polygon points="{cx},{cy} {cx + 160},{cy + 70} {cx + 60},{cy + 200}" fill="#000"/></mask>')
    o.append(f'<path d="M{cx - qw / 2} {cy} A{qw / 2} {H / 2} 0 1 0 {cx + qw / 2} {cy} A{qw / 2} {H / 2} 0 1 0 {cx - qw / 2} {cy} Z '
             f'M{cx - qw / 2 + TK} {cy} A{qw / 2 - TK} {H / 2 - TN} 0 1 0 {cx + qw / 2 - TK} {cy} A{qw / 2 - TK} {H / 2 - TN} 0 1 0 {cx - qw / 2 + TK} {cy} Z" fill="{c}" fill-rule="evenodd" mask="url(#qm)"/>')
    # I
    ix = qx + qw + 60
    o += [f'<rect x="{ix}" y="0" width="{TK}" height="{H}" fill="{c}"/>', _serif(ix + TK / 2, 0, 52, c), _serif(ix + TK / 2, H, 52, c)]
    # U：左粗右细，底部一道连贯的弧
    ux = ix + 96
    o += [f'<rect x="{ux}" y="0" width="{TK}" height="{H - 58}" fill="{c}"/>', _serif(ux + TK / 2, 0, 50, c),
          f'<path d="M{ux} {H - 60} C{ux} {H + 4} {ux + 118} {H + 4} {ux + 118} {H - 60} L{ux + 118 - TN} {H - 60} C{ux + 118 - TN} {H - 6} {ux + TK} {H - 6} {ux + TK} {H - 60}Z" fill="{c}"/>',
          f'<rect x="{ux + 118 - TN}" y="0" width="{TN}" height="{H - 58}" fill="{c}"/>', _serif(ux + 118, 0, 30, c)]
    # Q 的尾巴：从开口里出来，贴着 I、U 的脚下划过去，末端一颗球
    o.append(f'<path d="M{cx + 40} {H - 40} C{cx + 90} {H + 40} {ux - 40} {H + 50} {ux + 150} {H + 40}" stroke="{c}" stroke-width="{TN}" fill="none"/>')
    o.append(f'<circle cx="{ux + 168}" cy="{H + 38}" r="17" fill="{ball}"/>')
    return ''.join(o), ux + 188
