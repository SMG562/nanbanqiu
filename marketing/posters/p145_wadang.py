from lib import *
from han import MARBLE, marble_bg, relief, cloud_scroll

META = dict(
    id=145, slug='wadang', title='日日有球', lines=['日日有球。'],
    style=['汉风', '瓦当', '图案', '极简'], tone='浅色', demo=False,
    concept='一枚放大到占满画面的汉瓦当：外圈一道宽边，十字双线把圆面分成四格，每格一个大字「日日有球」配卷云纹；正中央的乳钉换成一颗荧光网球——两千年的吉语格式，装一句打球人的心愿',
    use='新年 / 品牌形象；汉代的庄重 + 大俗大雅',
)


def svg():
    cx, cy, R = 540, 660, 400
    p = [f'<defs>{MARBLE}</defs>', marble_bg(W, H, '#EFEBE2')]
    s = f'<circle cx="{cx}" cy="{cy}" r="{R}" fill="FILL"/>'
    p.append(relief(s, face='#E2DCCE', shadow='#6E6A60', d=8))
    carve = f'<circle cx="{cx}" cy="{cy}" r="{R - 46}" fill="none" stroke="FILL" stroke-width="10"/>'
    carve += f'<circle cx="{cx}" cy="{cy}" r="{R - 70}" fill="none" stroke="FILL" stroke-width="4"/>'
    for a in (0, 90):                                                                                           # 十字双线
        rad = math.radians(a)
        for off in (-10, 10):
            ox, oy = -math.sin(rad) * off, math.cos(rad) * off
            carve += f'<line x1="{cx - (R-70)*math.cos(rad) + ox:.0f}" y1="{cy - (R-70)*math.sin(rad) + oy:.0f}" x2="{cx + (R-70)*math.cos(rad) + ox:.0f}" y2="{cy + (R-70)*math.sin(rad) + oy:.0f}" stroke="FILL" stroke-width="5"/>'
    carve += f'<circle cx="{cx}" cy="{cy}" r="78" fill="none" stroke="FILL" stroke-width="8"/>'
    for sx, sy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:                                                          # 每格一朵卷云
        carve += f'<g transform="translate({cx + sx*250 - 30} {cy + sy*196}) scale(.34)">' + cloud_scroll(-90, 0, 1, 1, 12) + '</g>'
    chars = [('日', -1, -1), ('日', 1, -1), ('有', -1, 1), ('球', 1, 1)]                                         # 按今天的读法：上「日日」、下「有球」
    for ch, sx, sy in chars:
        tx, ty = cx + sx * 140, cy + sy * 140
        carve += f'<text x="{tx}" y="{ty + 44}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="124" fill="FILL">{ch}</text>'
    p.append(relief(carve, face='#F6F2E8', shadow='#5E5A52', d=4))
    p.append(f'<circle cx="{cx}" cy="{cy}" r="56" fill="#C6EA3D"/><path d="M{cx-40} {cy-38} C{cx-14} {cy-14} {cx-14} {cy+14} {cx-40} {cy+38}" stroke="#F6F8E0" stroke-width="6" fill="none"/>'
             f'<path d="M{cx+40} {cy-38} C{cx+14} {cy-14} {cx+14} {cy+14} {cx+40} {cy+38}" stroke="#F6F8E0" stroke-width="6" fill="none"/>'
             f'<circle cx="{cx+10}" cy="{cy+12}" r="54" fill="#7FA21C" opacity=".22"/>')
    p.append(tag('WADANG · ROOF TILE', color='#4A463E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=1130, size=46, colors=('#9E2A2B',), weight=900, anchor='middle', x=540, ls=12))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
