from lib import *
from lin import DEFS, blob, ink, glow, poem, seal
from song import ridge_mountain, roof

META = dict(
    id=139, slug='cloud-pavilions', title='云上那块场', lines=['云上那块场，', '下午才有空位。'],
    style=['宋画', '仙山楼阁', '云天', '光亮'], tone='亮色', demo=False,
    concept='借宋人「仙山楼阁」：几座方硬的石峰从云海里拔起，峰顶各有金瓦楼阁，飞桥相连；朝阳把云海染成金白，最高那座峰顶的平台上是一块球场——人间最普通的事，放在最高的地方',
    use='好场难订 / 空位提醒；云天的大格局 + 一句大实话',
)


def svg():
    r = random.Random(139)
    p = [f'<defs>{DEFS}<linearGradient id="sk139" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FA6D6"/><stop offset=".55" stop-color="#F6D8B0"/><stop offset="1" stop-color="#FFF2D8"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk139)"/>', glow(780, 700, 300, 200, '#FFFBEA', .95)]
    g = []
    peaks = [(200, 520, 120, '139a', .82), (840, 600, 110, '139b', .85), (520, 360, 130, '139c', 1)]
    for cx, top, hw, sid, sc in peaks:
        pts = [(cx - hw, 1000), (cx - hw * .92, 820), (cx - hw * .8, 700), (cx - hw * .86, 600), (cx - hw * .6, top + 60), (cx - hw * .5, top),
               (cx + hw * .5, top), (cx + hw * .62, top + 70), (cx + hw * .84, 640), (cx + hw * .8, 760), (cx + hw * .95, 880), (cx + hw, 1000)]
        g.append(ridge_mountain(r, pts, 1000, lit='#9EB28E', mid='#6E907A', dark='#4A6A5A', ink_c='#22302A', n_strip=4, dots=300, sid=sid))
        g.append(f'<rect x="{cx - hw*.5:.0f}" y="{top - 8:.0f}" width="{hw:.0f}" height="10" fill="#E8DCC0"/>')
    # 高峰平台：球场
    g.append('<rect x="456" y="320" width="128" height="34" fill="#4AA484"/>')
    g.append('<path d="M460 324 L580 324 L580 350 L460 350Z M520 324 L520 350 M460 337 L580 337" stroke="#FFFFFF" stroke-width="2" fill="none"/>')
    for x in (480, 560):
        g.append(f'<rect x="{x-2}" y="{326}" width="4" height="10" rx="2" fill="#FFFFFF"/><circle cx="{x}" cy="323" r="3" fill="#2A2620"/>')
    g.append('<circle cx="530" cy="314" r="3" fill="#C6EA3D"/>')
    # 两侧峰顶楼阁 + 飞桥
    for cx, top in [(200, 520), (840, 600)]:
        g.append(f'<rect x="{cx-34}" y="{top-44}" width="68" height="36" fill="#B8322A"/>')
        g.append(roof(cx, top - 70, 110, 30))
    g.append('<path d="M250 490 C330 420 420 380 456 350" fill="none" stroke="#7A5A3A" stroke-width="5"/>')
    g.append('<path d="M584 350 C660 420 740 520 790 566" fill="none" stroke="#7A5A3A" stroke-width="5"/>')
    for t in range(1, 10):
        x = 250 + (456 - 250) * t / 10
        g.append(f'<line x1="{x:.0f}" y1="{490 - 140 * t / 10 - 6 * math.sin(t / 3):.0f}" x2="{x:.0f}" y2="{490 - 140 * t / 10 - 20:.0f}" stroke="#7A5A3A" stroke-width="2"/>')
    p.append('<g filter="url(#paint2)">' + ''.join(g) + '</g>')
    # 云海：一层层金白的云把山脚吞掉
    cl = ''
    for layer, (y0, cols) in enumerate([(780, ['#FFF6E4', '#FBE8C8']), (880, ['#FFFFFF', '#FFF4E0']), (980, ['#FFFFFF', '#F6EEE0'])]):
        for _ in range(28):
            cl += blob(r, r.uniform(-60, 1140), y0 + r.uniform(-30, 40), r.uniform(80, 150), r.uniform(30, 60), r.choice(cols), .96)
        cl += glow(540, y0 + 20, 640, 50, '#FFFFFF', .7, 28)
    p.append(f'<g filter="url(#paint2)">{cl}</g>')
    for i in range(5):                                                                                        # 远处一行鹤
        x, y = 820 + i * 26, 220 + i * 10
        p.append(f'<path d="M{x-8} {y} Q{x-3} {y-6} {x} {y} Q{x+3} {y-6} {x+8} {y}" stroke="#3A3A4A" stroke-width="2" fill="none"/>')
    txt, xl, yb = poem(META['lines'], 120 + 42 * 1.5, 110, 42, '#2A3A44')
    p.append(txt)
    p.append(seal(xl - 40, yb + 32, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.07, light=True))
    return page(''.join(p))
