from lib import *
from picto import picto
from han import POP

META = dict(
    id=156, slug='olympic-pictos', title='第六个项目', lines=['第六个项目：', '等人。'],
    style=['运动会风', '图标', '网格', '幽默'], tone='亮色', demo=False,
    concept='像大型运动会的项目图标系统：六个彩色方块，每块一个几何小人——发球、正手、反手、截击、高压，第六个不拿拍，两手揣着，站着等人；底下一排编号和英文名，最后一个写着 WAITING',
    use='约球 / 等人的大实话；现代运动海报的图标语言（原创图标）',
)


def svg():
    C = POP
    items = [('serve', 'SERVE', C['coral']), ('forehand', 'FOREHAND', C['cobalt']), ('backhand', 'BACKHAND', C['mint']),
             ('volley', 'VOLLEY', C['butter']), ('smash', 'SMASH', C['pink']), ('wait', 'WAITING', C['navy'])]
    p = [f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
    x0, y0, cw, chh, g = 60, 420, 310, 340, 15
    for i, (pose, name, bg) in enumerate(items):
        col, row = i % 3, i // 3
        x, y = x0 + col * (cw + g), y0 + row * (chh + g)
        p.append(f'<rect x="{x}" y="{y}" width="{cw}" height="{chh}" rx="18" fill="{bg}"/>')
        fg = '#FFFFFF' if bg in (C['coral'], C['cobalt'], C['navy'], C['mint'], C['pink']) else C['navy']
        p.append(picto(x + cw / 2 + 20, y + 214, .88, pose, fg))
        p.append(f'<text x="{x + 20}" y="{y + 40}" font-family="{SANS}" font-weight="900" font-size="26" fill="{fg}" opacity=".9">0{i + 1}</text>')
        p.append(f'<text x="{x + 20}" y="{y + chh - 22}" font-family="{SANS}" font-weight="700" font-size="18" letter-spacing="5" fill="{fg}">{name}</text>')
    p.append(f'<circle cx="{x0 + cw/2 - 46}" cy="{y0 + 180 - 172}" r="0"/>')
    for (cx, cy) in [(x0 + cw / 2 + 24, y0 + 30), (x0 + 4 * (cw + g) - cw * 2 - g + 110, y0 + chh + g + 30)]:
        pass
    p.append(f'<circle cx="{x0 + cw/2 + 74}" cy="{y0 + 60}" r="13" fill="#C6EA3D"/>')                          # 发球的球
    p.append(f'<circle cx="{x0 + cw + g + cw/2 + 128}" cy="{y0 + 160}" r="13" fill="#C6EA3D"/>')
    wx, wy = x0 + 2 * (cw + g) + cw / 2, y0 + chh + g + 180                                                     # 等人：头上冒个省略号
    for k in range(3):
        p.append(f'<circle cx="{wx - 18 + k * 18}" cy="{wy - 150}" r="5" fill="#FFFFFF"/>')
    p.append(tag('EVENTS · 06', color=C['navy'], rule=C['coral'], op=.85))
    p.append(headline(META['lines'], y=272, size=60, colors=(C['navy'], C['coral']), lh=84, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
