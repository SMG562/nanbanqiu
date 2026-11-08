from common import *
import math, json, random
# 投影：固定范围，等距矩形（墨尔本纬度修正）
COS = math.cos(math.radians(37.87))
FIT = None
def fit(pts, box=(40, 430, 1040, 1250), pad=.10, anchor=(144.965, -37.885)):
    global FIT
    xs = [p[0] for p in pts] + [anchor[0]]; ys = [p[1] for p in pts] + [anchor[1]]
    w, h = max(xs) - min(xs), max(ys) - min(ys); lng0, lat0 = min(xs) - w * pad, max(ys) + h * pad
    w *= 1 + 2 * pad; h *= 1 + 2 * pad
    k = min((box[2] - box[0]) / w, (box[3] - box[1]) / (h / COS))   # 像素 / 经度
    ox = box[0] + ((box[2] - box[0]) - w * k) / 2; oy = box[1] + ((box[3] - box[1]) - h / COS * k) / 2
    FIT = (lng0, lat0, k, ox, oy)
def P(lng, lat):
    lng0, lat0, k, ox, oy = FIT
    return ox + (lng - lng0) * k, oy + (lat0 - lat) * k / COS
def path(pts, close=False): return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in (P(*p) for p in pts)) + (' Z' if close else '')
def smooth(pts):  # Catmull-Rom → 贝塞尔，手绘感的平滑海岸线
    q = [P(*p) for p in pts]; d = f'M{q[0][0]:.1f} {q[0][1]:.1f}'
    for i in range(len(q) - 1):
        p0, p1, p2, p3 = q[max(i-1, 0)], q[i], q[i+1], q[min(i+2, len(q)-1)]
        d += f' C{p1[0]+(p2[0]-p0[0])/6:.1f} {p1[1]+(p2[1]-p0[1])/6:.1f} {p2[0]-(p3[0]-p1[0])/6:.1f} {p2[1]-(p3[1]-p1[1])/6:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d
# 菲利普港湾北岸、雅拉河、两条高速（示意，手描近似；正式版从 OSM 简化生成）
COAST = [(144.80,-37.86),(144.865,-37.858),(144.893,-37.866),(144.905,-37.852),(144.913,-37.838),(144.935,-37.842),(144.955,-37.853),(144.972,-37.866),(144.981,-37.884),(144.986,-37.905),(144.996,-37.928),(145.003,-37.948),(145.014,-37.970),(145.036,-37.988),(145.060,-37.998),(145.085,-38.012),(145.10,-38.05)]
YARRA = [(144.913,-37.838),(144.935,-37.826),(144.955,-37.822),(144.972,-37.821),(144.988,-37.826),(145.000,-37.836),(145.010,-37.831),(145.016,-37.818),(145.026,-37.806),(145.040,-37.797),(145.058,-37.792),(145.075,-37.778),(145.098,-37.770),(145.125,-37.757),(145.16,-37.745),(145.23,-37.735)]
MONASH = [(144.985,-37.832),(145.02,-37.845),(145.06,-37.862),(145.10,-37.880),(145.15,-37.900),(145.20,-37.925),(145.24,-37.94)]
EASTERN = [(145.00,-37.795),(145.05,-37.792),(145.10,-37.795),(145.15,-37.805),(145.24,-37.815)]
SUBURBS = [('CBD',144.963,-37.812),('RICHMOND',144.998,-37.818),('ST KILDA',144.99,-37.870),('BRIGHTON',145.005,-37.912),('KEW',145.035,-37.788),('BOX HILL',145.128,-37.824),('GLEN WAVERLEY',145.165,-37.880),('CHADSTONE',145.085,-37.893),('DONCASTER',145.125,-37.776),('CAULFIELD',145.025,-37.884),('OAKLEIGH',145.10,-37.90),('MOORABBIN',145.06,-37.94),('CLAYTON',145.12,-37.925),('BALWYN',145.08,-37.81),('MALVERN',145.03,-37.86)]
# 演示快照：明天 26 局分布在 17 个球场（坐标 = tools/venue_geo.json 已核对的 OSM 坐标）
VEN = [('Kooyong LTC',145.03,-37.8385,3,5),('Fawkner Park',144.9794,-37.838,2,3),('Melbourne Park',144.9848,-37.8236,3,4),('Albert Park LTC',144.9534,-37.8395,1,1),
       ('Caulfield Park',145.0288,-37.8726,2,3),('Box Hill TC',145.1197,-37.8374,2,2),('Glen Waverley TC',145.1923,-37.8889,2,4),('Doncaster TC',145.1393,-37.7875,1,2),
       ('Hawthorn TC',145.0363,-37.8252,1,1),('Chadstone TC',145.0814,-37.882,1,2),('Burwood TC',145.0946,-37.8538,1,1),('Kew TC',145.0485,-37.8025,2,2),
       ('Royal South Yarra',145.0062,-37.8355,1,1),('Syndal TC',145.1467,-37.8678,1,1),('North Balwyn TC',145.0782,-37.7993,1,2),('Blackburn TC',145.154,-37.8208,1,1),('Wheelers Hill TC',145.1878,-37.8987,1,1)]

def svg():
    random.seed(9); fit([(v[1], v[2]) for v in VEN])
    KX = FIT[2]
    games = sum(v[3] for v in VEN); spots = sum(v[4] for v in VEN)
    paper, ink, water = '#F6EBD3', C['deep'], '#CBDDCF'
    # 海面：海岸线 + 画布左下角闭合
    bay = smooth(COAST) + f' L{P(145.10,-38.05)[0]:.0f} 1500 L-50 1500 L-50 {P(144.80,-37.86)[1]:.0f} Z'
    waves = ''.join(f'<path d="M{x} {y} q9 -7 18 0 t18 0" fill="none" stroke="{ink}" stroke-opacity=".22" stroke-width="1.6"/>' for x, y in [(random.randint(40, 380), random.randint(900, 1250)) for _ in range(26)] if y > P(144.9, -37.86)[1] + 40 + (x - 40) * 1.6)
    b = f'''<rect width="{W}" height="{H}" fill="{paper}"/>
<g filter="url(#rough2)">
 <path d="{bay}" fill="{water}"/>{waves}
 <path d="{smooth(COAST)}" fill="none" stroke="{ink}" stroke-width="2.6" stroke-linecap="round"/>
 <path d="{smooth(COAST)}" fill="none" stroke="{ink}" stroke-opacity=".25" stroke-width="1.2" transform="translate(-7 6)"/>
 <path d="{smooth(YARRA)}" fill="none" stroke="#8DB5A5" stroke-width="7" stroke-linecap="round"/>
 <path d="{smooth(YARRA)}" fill="none" stroke="{ink}" stroke-opacity=".35" stroke-width="1.2"/>
 <path d="{smooth(MONASH)}" fill="none" stroke="{ink}" stroke-opacity=".28" stroke-width="2" stroke-dasharray="10 7"/>
 <path d="{smooth(EASTERN)}" fill="none" stroke="{ink}" stroke-opacity=".28" stroke-width="2" stroke-dasharray="10 7"/>
</g>'''
    cx, cy = P(144.963, -37.812); b += f'<g transform="translate({cx:.0f} {cy-26:.0f}) rotate(-20)" opacity=".35"><rect x="-22" y="-12" width="44" height="24" fill="none" stroke="{ink}" stroke-width="1.5"/><path d="M-11 -12V12M0 -12V12M11 -12V12M-22 0H22" stroke="{ink}" stroke-width="1"/></g>'
    bx, by = 190, 1150
    b += f'<text x="44" y="1170" font-family="{SERIF}" font-style="italic" font-size="15" letter-spacing="4" fill="{ink}" opacity=".5">PORT PHILLIP</text><text x="44" y="1192" font-family="{SERIF}" font-style="italic" font-size="15" letter-spacing="4" fill="{ink}" opacity=".5">BAY</text>'
    b += '<!--SUB-->'
    # 球场钉：按像素距离聚合，标签四向避让
    pins = []
    for v in sorted(VEN, key=lambda v: -v[4]):
        x, y = P(v[1], v[2]); hit = next((p for p in pins if math.hypot(p['x']-x, p['y']-y) < 30), None)
        if hit: hit['g'] += v[3]; hit['s'] += v[4]; hit['n'].append(v[0])
        else: pins.append(dict(x=x, y=y, g=v[3], s=v[4], n=[v[0]]))
    boxes = [(p['x']-20, p['y']-20, p['x']+20, p['y']+20) for p in pins] + [(0, 0, W, 390), (0, 1250, W, H), (60, 560, 360, 600), (30, 1150, 220, 1200), (540, 1215, 760, 1250)]
    def free(r): return all(r[2] < q[0] or r[0] > q[2] or r[3] < q[1] or r[1] > q[3] for q in boxes)
    labels = ''
    b += '<!--X-->'
    for i, p in enumerate(pins):
        r = 14 + min(p['s'], 5) * 2
        b += f'<ellipse cx="{p["x"]+4:.0f}" cy="{p["y"]+r*.85:.0f}" rx="{r*.9:.0f}" ry="{r*.28:.0f}" fill="{ink}" opacity=".28" filter="url(#bl6)"/>{ball(f"p{i}", round(p["x"]), round(p["y"]), r)}'
        if p['g'] > 1: boxes.append((p['x']+r*.8-14, p['y']-r*.8-14, p['x']+r*.8+14, p['y']-r*.8+14)); b += f'<circle cx="{p["x"]+r*.8:.0f}" cy="{p["y"]-r*.8:.0f}" r="12" fill="{ink}"/><text x="{p["x"]+r*.8:.0f}" y="{p["y"]-r*.8+5:.0f}" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="14" fill="{C["lime"]}">{p["g"]}</text>'
        name = p['n'][0] + (f' 等 {len(p["n"])} 处' if len(p['n']) > 1 else ''); info = f'{p["g"]} 局 · 缺 {p["s"]} 位'
        tw = max(text_w(name, 16, True), text_w(info, 14)) + 6
        for dx, dy, anc in ((r+8, -2, 'start'), (-r-8, -2, 'end'), (0, r+20, 'middle'), (0, -r-26, 'middle'), (r+4, r+12, 'start'), (-r-4, r+12, 'end'), (r+4, -r-14, 'start'), (-r-4, -r-14, 'end')):
            lx, ly = p['x'] + dx, p['y'] + dy; x0 = lx if anc == 'start' else lx - tw if anc == 'end' else lx - tw/2
            rect = (x0, ly-15, x0+tw, ly+22)
            if x0 > 30 and x0 + tw < W - 30 and free(rect):
                st = f'paint-order="stroke" stroke="{paper}" stroke-width="5" stroke-linejoin="round"'
                boxes.append(rect); labels += f'<text x="{lx:.0f}" y="{ly:.0f}" text-anchor="{anc}" font-family="{SANS}" font-weight="700" font-size="16" fill="{ink}" {st}>{esc(name)}</text><text x="{lx:.0f}" y="{ly+20:.0f}" text-anchor="{anc}" font-family="{SANS}" font-size="14" fill="{CLAY}" {st}>{info}</text>'; break
    b += labels
    for n, lng, lat in SUBURBS:
        x, y = P(lng, lat); w = len(n) * 13.5; r = (x - w/2, y - 13, x + w/2, y + 3)
        if 30 < r[0] and r[2] < W - 30 and free(r): boxes.append(r); b = b.replace('<!--SUB-->', f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="middle" font-family="{SANS}" font-size="14" letter-spacing="5" fill="{ink}" opacity=".38">{n}</text><!--SUB-->')
    # ✕：空位最多的地方
    top = max(pins, key=lambda p: p['s']); tx, ty = top['x'], top['y']; nx, ny = 64, 590
    xmark = f'<g filter="url(#rough)" fill="none" stroke="{CLAY}" stroke-width="3" stroke-linecap="round" opacity=".85"><path d="M{tx+40:.0f} {ty-6:.0f} C {tx+42:.0f} {ty-44:.0f}, {tx-36:.0f} {ty-48:.0f}, {tx-42:.0f} {ty-4:.0f} S {tx+8:.0f} {ty+46:.0f}, {tx+38:.0f} {ty+10:.0f} L {tx+30:.0f} {ty-20:.0f}"/></g>'
    b = b.replace('<!--X-->', xmark)
    b += f'''<path d="M{nx+150} {ny+14} C {nx+220} {ny+30}, {tx-120:.0f} {ty-110:.0f}, {tx-34:.0f} {ty-38:.0f}" fill="none" stroke="{CLAY}" stroke-width="2" stroke-dasharray="5 6"/>
<text x="{nx}" y="{ny}" font-family="{SERIF}" font-weight="700" font-size="24" fill="{CLAY}">这里明天最热闹。</text>'''
    # 罗盘 + 比例尺（海面上）
    km5 = 5 / (111.32 * math.cos(math.radians(37.87))) * KX; sx, sy = 560, 1242
    b += f'''<g transform="translate(120 1010)" opacity=".7"><circle r="34" fill="none" stroke="{ink}" stroke-width="1.5"/><path d="M0 -46 L8 0 L0 46 L-8 0Z" fill="{ink}" opacity=".8"/><path d="M-46 0 L0 6 L46 0 L0 -6Z" fill="{ink}" opacity=".35"/><text y="-54" text-anchor="middle" font-family="{SERIF}" font-weight="700" font-size="18" fill="{ink}">N</text></g>
<g opacity=".6"><path d="M{sx} {sy} v-8 M{sx} {sy} h{km5:.0f} v-8 M{sx+km5/2:.0f} {sy} v-5" stroke="{ink}" stroke-width="2" fill="none"/><text x="{sx+km5+10:.0f}" y="{sy}" font-family="{SANS}" font-size="15" fill="{ink}">5 km</text></g>'''
    # 头部：纸色渐隐压住地图上沿
    b += f'''<defs><linearGradient id="fadeT" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="{paper}"/><stop offset="1" stop-color="{paper}" stop-opacity="0"/></linearGradient></defs>
<rect width="{W}" height="400" fill="url(#fadeT)"/>
{tag(f'TREASURE MAP · NO.{ISSUE}', y=104, color=ink, rule=CLAY)}{demo_badge(ink=ink)}
{headline(['明天，墨尔本', f'有 <tspan id="hn">{spots}</tspan> 个空位。'], y=222, size=68, lh=86, colors=(ink, CLAY))}
{sub(f'{DATE_ZH}　·　{games} 局在找人　·　{len(VEN)} 个球场　·　{WEATHER}', y=358, size=22, color=ink, op=.7, ls=2)}
<text x="1040" y="1278" text-anchor="end" font-family="{SANS}" font-size="13" fill="{ink}" opacity=".45">地图示意 · 球场位置 © OpenStreetMap contributors</text>
<path d="M0 1300 Q 270 1286 540 1298 T 1080 1294 V{H} H0Z" fill="{ink}"/>
<text x="84" y="1368" font-family="{SANS}" font-weight="700" font-size="21" fill="{C['cream']}">几点、什么水平、球局码</text>
<text x="84" y="1398" font-family="{SANS}" font-size="17" fill="{C['cream']}" opacity=".6">往后翻，看时刻表 →</text>
{wordmark(1358, '#fff')}
<text x="996" y="1368" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="21" fill="{C['lime']}">搜索「南伴球」</text>
<text x="996" y="1398" text-anchor="end" font-family="{SANS}" font-size="17" fill="{C['cream']}" opacity=".6">nanbanqiu.app</text>
{grain(.22, light=True)}'''
    return page(b)

EXPECT = lambda: [f'{sum(v[4] for v in VEN)}个空位', f'{sum(v[3] for v in VEN)}局在找人']
HEADLINE = lambda: (str(sum(v[4] for v in VEN)), '#hn')
