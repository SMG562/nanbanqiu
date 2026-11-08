from lib import *
from lin import glow, blob
from han import MARBLE, relief, cloud_scroll

META = dict(
    id=146, slug='han-que', title='开门了', lines=['周末的场，', '开门了。'],
    style=['汉风', '双阙', '天地', '光亮'], tone='亮色', demo=False,
    concept='一对汉白玉的双阙顶天立地站在画面两边，阙顶重檐、阙身浮雕云气；两阙之间是一大片朝霞初开的天，天上铺着汉代的云气纹；阙门正中，远远一块绿色球场被晨光照亮——门开了，天地都在里面',
    use='周末开场 / 早场；汉代的雄浑和气象',
)


def que(x, w, top, base):
    """一座阙：台基、阙身、两层出檐的阙顶。返回带 FILL 占位的 SVG。"""
    o = f'<rect x="{x - w*.6:.0f}" y="{base - 40}" width="{w*1.2:.0f}" height="40" fill="FILL"/>'
    o += f'<rect x="{x - w/2:.0f}" y="{top + 120}" width="{w:.0f}" height="{base - top - 160}" fill="FILL"/>'
    for i, (yy, ww) in enumerate([(top + 120, w * 1.5), (top + 40, w * 1.25)]):
        o += f'<path d="M{x - ww/2:.0f} {yy} L{x + ww/2:.0f} {yy} L{x + ww*.38:.0f} {yy - 34} L{x - ww*.38:.0f} {yy - 34}Z" fill="FILL"/>'
        o += f'<rect x="{x - w*.42:.0f}" y="{yy - 4}" width="{w*.84:.0f}" height="0" fill="FILL"/>'
        if i == 0:
            o += f'<rect x="{x - w*.4:.0f}" y="{yy - 80}" width="{w*.8:.0f}" height="46" fill="FILL"/>'
    o += f'<rect x="{x - w*.12:.0f}" y="{top - 20}" width="{w*.24:.0f}" height="26" fill="FILL"/>'
    return o


def svg():
    r = random.Random(146)
    p = [f'<defs>{MARBLE}<linearGradient id="sk146" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7EB0DA"/><stop offset=".55" stop-color="#F6D6B0"/><stop offset="1" stop-color="#FFEFD0"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk146)"/>', glow(540, 860, 300, 160, '#FFF8E4', .95)]
    sky = ''
    for x, y, s, f in [(300, 470, 1.2, 1), (720, 420, 1.0, -1), (360, 640, 1.0, -1), (620, 720, .9, 1)]:
        sky += cloud_scroll(x, y, s, f, 6)
    p.append(f'<g opacity=".8">{sky.replace("FILL", "#FFFFFF")}</g>')
    p.append('<path d="M0 960 C300 940 780 950 1080 930 L1080 1350 L0 1350Z" fill="#C8D49E"/>')
    p.append('<path d="M420 960 L660 956 L700 1010 L380 1016Z" fill="#4AA484"/>')
    p.append('<path d="M420 960 L660 956 L700 1010 L380 1016Z M400 986 L680 982 M540 958 L541 1013" stroke="#FFFFFF" stroke-width="2.4" fill="none"/>')
    p.append('<circle cx="560" cy="972" r="4" fill="#C6EA3D"/>')
    for x, y in [(470, 984), (630, 978)]:
        p.append(f'<rect x="{x-3}" y="{y-18}" width="6" height="18" rx="3" fill="#FFFFFF"/><circle cx="{x}" cy="{y-22}" r="4.4" fill="#2A2620"/>')
    p.append('<path d="M0 1060 L1080 1060 L1080 1350 L0 1350Z" fill="#E6E0D2"/>')                                # 汉白玉台阶
    for k in range(4):
        p.append(f'<rect x="0" y="{1060 + k * 30}" width="1080" height="4" fill="#B8B0A0" opacity=".6"/>')
    for x in (150, 930):
        body = que(x, 190, 140, 1080)
        p.append(relief(body, face='#F4F1E8', shadow='#8E887A', d=7))
        panels = ''.join(f'<rect x="{x - 70}" y="{330 + k*230}" width="140" height="190" fill="none" stroke="FILL" stroke-width="5"/>' for k in range(3))
        p.append(f'<g opacity=".6">{panels.replace("FILL", "#A8A294")}</g>')
        rel = ''
        for k in range(3):
            rel += cloud_scroll(x - 52, 430 + k * 230, .55, 1, 6)
        p.append(f'<g opacity=".55">{rel.replace("FILL", "#9A9488")}</g>')
        p.append(f'<rect x="{x - 95}" y="260" width="190" height="820" filter="url(#marble)" opacity=".35"/>')
    p.append(tag('HAN · TWIN GATES', x=380, color='#4A463E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], x=540, y=262, size=50, colors=('#3A362E', '#9E2A2B'), lh=72, weight=900, anchor='middle'))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
