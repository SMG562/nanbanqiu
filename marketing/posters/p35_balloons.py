from lib import *

META = dict(
    id=35, slug='balloons', title='同一高度', lines=['总有人，', '和你同高度。'],
    style=['插画', '意境', '拟人'], tone='暖色', demo=False,
    concept='两只网球做的热气球，飘在云海上同一高度，中间一条虚线；水平相近的人，总会遇上',
    use='按水平匹配的卖点：同水平、同频',
)


def svg():
    random.seed(35)
    def balloon(i, cx, cy, r, mood, look):
        by = cy + r + 40
        return f'''<g>
 <path d="M{cx-r*.55:.0f} {cy+r*.85:.0f} L{cx-26} {by:.0f} M{cx+r*.55:.0f} {cy+r*.85:.0f} L{cx+26} {by:.0f}" stroke="#3A2A18" stroke-width="3"/>
 {ball(f'bl{i}', cx, cy, r)}{face(cx, cy + r*.12, r/118*.95, mood, look)}
 <rect x="{cx-34}" y="{by:.0f}" width="68" height="46" rx="8" fill="#B0582F"/><rect x="{cx-34}" y="{by:.0f}" width="68" height="12" rx="6" fill="#D9854F"/>
 <path d="M{cx-34} {by+24:.0f} H{cx+34}" stroke="#7A3A1C" stroke-width="2" opacity=".6"/>
</g>'''
    clouds = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{c}" opacity="{o}" filter="url(#bl14)"/>'
                     for x, y, rx, ry, c, o in [(150, 1130, 300, 60, '#FFF1DC', .95), (560, 1170, 380, 70, '#FFE3C2', .95), (960, 1120, 300, 62, '#FFF1DC', .95), (330, 1230, 400, 80, '#F6D2B0', .95), (830, 1250, 420, 80, '#F6D2B0', .95)])
    body = f'''
<defs><linearGradient id="bg35" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F4A4A"/><stop offset=".45" stop-color="#4E8C84"/><stop offset=".75" stop-color="#F2B58A"/><stop offset="1" stop-color="#FFD7A8"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg35)"/>
{tag('SAME LEVEL', color='#F7EBD6')}
{headline(META['lines'], y=330, size=100, colors=(C['cream'], '#FFE08A'), ls=4)}
{balloon(1, 330, 720, 150, 'happy', 0)}{balloon(2, 780, 800, 104, 'smile', -1)}
<path d="M385 1004 H730" stroke="#fff" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round" opacity=".8"/>
<circle cx="385" cy="1004" r="5" fill="#fff"/><circle cx="730" cy="1004" r="5" fill="#fff"/>
{clouds}
{wordmark(1268, '#0B3B2A', sub=False, op=.95)}
{grain(.18, True)}'''
    return page(body)
