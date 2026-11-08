from lib import *
from picto import picto
from han import POP

META = dict(
    id=159, slug='olympic-deuce', title='还要连赢两分', lines=['平分了，', '还要连赢两分。'],
    style=['运动会风', '大字', '条纹', '冷知识'], tone='亮色', demo=False,
    concept='运动海报式的大字排版：画面中间是巨大的「40 : 40」，后面一层层斜着的彩虹色速度条纹；一个几何小人从数字之间腾空扣杀，球拍挡住了冒号；底下一行小字 DEUCE——平分后要连赢两分才算赢下这一局',
    use='网球规则冷知识（平分）；动感、现代',
)


def svg():
    C = POP
    p = [f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>']
    cols = [C['coral'], C['orange'], C['butter'], C['mint'], C['sky'], C['cobalt'], C['lilac'], C['pink']]
    for i, c in enumerate(cols):                                                                                # 斜速度条纹
        y = 420 + i * 70
        p.append(f'<path d="M-40 {y + 120} L1120 {y - 120} L1120 {y - 64} L-40 {y + 176}Z" fill="{c}"/>')
    p.append(f'<text x="540" y="900" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="300" letter-spacing="-8" fill="{C["navy"]}">40:40</text>')
    p.append(picto(540, 700, 1.9, 'smash', '#FFFFFF', w=24))
    p.append(picto(540, 700, 1.9, 'smash', C['navy'], w=16))
    p.append('<circle cx="548" cy="300" r="22" fill="#C6EA3D" stroke="#1D2440" stroke-width="3"/>')
    p.append(f'<text x="540" y="1020" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="22" fill="{C["navy"]}">DEUCE</text>')
    p.append(f'<text x="540" y="1066" text-anchor="middle" font-family="{SANS}" font-size="20" letter-spacing="4" fill="{C["navy"]}" opacity=".7">AD-IN · AD-OUT · GAME</text>')
    p.append(tag('SCOREBOARD', y=120, color=C['navy'], rule=C['coral'], op=.85))
    p.append(headline(META['lines'], y=226, size=52, colors=(C['navy'], C['coral']), lh=72, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
