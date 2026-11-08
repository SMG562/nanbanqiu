from lib import *
from variety import INK, block, burst, badge, arrow, confetti

META = dict(
    id=201, slug='variety-season', title='好好打球 天天向上（综艺版）', lines=['好好打球，', '天天向上。'],
    style=['综艺风', '立体字', '纸片', '明亮'], tone='亮色', demo=False,
    concept='年轻综艺海报的做法：天蓝底，一颗巨大的荧光网球像太阳一样立在标题后面，「好好打球　天天向上」做成白面橙侧的立体厚字、微微歪着，旁边一个向上的立体箭头和「COME ON」贴纸；下面是一层层纸片剪出来的南伴绿山丘和小树，一块小球场；中间一行「周末约球季 · 你好新球友」',
    use='开学季 / 招新；热闹、明亮、年轻',
)


def svg():
    r = random.Random(201)
    p = [f'<rect width="1080" height="1350" fill="#9FD8F2"/>', '<rect width="1080" height="1350" fill="url(#dots_v)" opacity=".25"/>',
         '<defs><pattern id="dots_v" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="2" fill="#FFFFFF"/></pattern></defs>']
    p.append(f'<circle cx="560" cy="380" r="300" fill="#FFB547" stroke="{INK}" stroke-width="5"/>')
    p.append(f'<circle cx="560" cy="380" r="230" fill="#C6EA3D" stroke="{INK}" stroke-width="5"/>')
    p.append(f'<path d="M400 220 C480 300 480 460 400 540 M720 220 C640 300 640 460 720 540" stroke="#FFFFFF" stroke-width="16" fill="none" stroke-linecap="round"/>')
    p.append(block('好好打球', 120, 340, 168, rot=-8, depth=16))
    p.append(block('天天向上', 250, 560, 168, rot=-8, depth=16))
    p.append(f'<g transform="rotate(14 940 220)"><path d="M900 300 L900 220 L870 220 L940 140 L1010 220 L980 220 L980 300Z" fill="#FFC93C" stroke="{INK}" stroke-width="5" stroke-linejoin="round"/></g>')
    p.append(badge(70, 560, 200, 70, 'COME ON!', '#FF8A3D', size=32, rot=-12))
    p.append(f'<rect x="200" y="720" width="680" height="64" rx="10" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/>')
    p.append(f'<text x="540" y="764" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="34" letter-spacing="8" fill="{INK}">周末约球季 · 你好新球友</text>')
    p.append(f'<text x="540" y="830" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="20" letter-spacing="6" fill="{INK}" opacity=".7">— 按水平找球友 · 今天起 7 天的球局 —</text>')
    # 纸片剪影的山丘（每层带一点投影）
    for y, c in [(960, '#7FCBA8'), (1040, '#3E9A72'), (1120, '#176B4D')]:
        d = f'M0 1350 L0 {y} ' + ' '.join(f'Q{x + 90} {y - r.uniform(60, 130):.0f} {x + 180} {y}' for x in range(0, 1080, 180)) + ' L1080 1350Z'
        p.append(f'<path d="{d}" fill="#0E3A2A" opacity=".25" transform="translate(0 10)"/><path d="{d}" fill="{c}"/>')
    for x in (120, 210, 860, 950):                                                                             # 纸片小树
        p.append(f'<rect x="{x - 5}" y="1040" width="10" height="50" fill="#8A5A3A"/><circle cx="{x}" cy="1020" r="38" fill="#9FDCB0" stroke="{INK}" stroke-width="3"/>')
    p.append(f'<path d="M420 1180 L660 1180 L700 1250 L380 1250Z" fill="#2F7A5E" stroke="#FFFFFF" stroke-width="4"/><line x1="540" y1="1180" x2="540" y2="1250" stroke="#FFFFFF" stroke-width="3"/>')
    p.append(confetti(r, 40, (40, 40, 1040, 700)))
    p.append(wordmark(1300, '#fff', sub=False))
    return page(''.join(p))
