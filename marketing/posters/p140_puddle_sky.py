from lib import *
from lin import DEFS, blob, ink, glow, poem, seal

META = dict(
    id=140, slug='puddle-sky', title='多了一片天', lines=['雨停了，', '场上多了一片天。'],
    style=['意境', '雨后', '光亮'], tone='亮色', demo=False,
    concept='雨刚停：画面上面一窄条真正的天，下面大半是湿亮的球场；场上一大汪积水，里面倒映着整片蓝天、白云和一道彩虹，一颗球漂在水里，像飘在天上；画面最下方一双白球鞋的鞋尖停在水边',
    use='雨后 / 雨停了去打球；天在地上，新的境界',
)


def svg():
    r = random.Random(140)
    p = [f'<defs>{DEFS}<linearGradient id="sk140" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7DB6E2"/><stop offset="1" stop-color="#D6EAF4"/></linearGradient>'
         '<linearGradient id="rf140" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#CDE6F2"/><stop offset="1" stop-color="#5E9ED6"/></linearGradient>'
         '<clipPath id="pd140"><path d="M90 640 C200 560 520 540 760 580 C940 610 1040 700 1000 830 C960 960 760 1060 520 1060 C280 1060 80 990 60 860 C50 760 50 690 90 640Z"/></clipPath></defs>',
         f'<rect width="{W}" height="420" fill="url(#sk140)"/>']
    for cx, cy in [(240, 220), (600, 150)]:
        p.append('<g filter="url(#paint2)">' + ''.join(blob(r, cx + r.uniform(-120, 120), cy + r.uniform(-30, 30), r.uniform(50, 90), r.uniform(30, 50), '#FFFFFF', .95) for _ in range(12)) + '</g>')
    p.append('<rect y="380" width="1080" height="40" fill="#6E9A80"/>')                                       # 远处树篱
    p.append('<g filter="url(#paint2)">' + ''.join(blob(r, x, 385 + r.uniform(-6, 6), r.uniform(26, 44), r.uniform(18, 28), r.choice(['#4E7E5E', '#5E8E6A']), 1) for x in range(0, 1100, 40)) + '</g>')
    p.append('<rect y="420" width="1080" height="930" fill="#3E8E78"/>')                                     # 湿球场
    p.append(glow(540, 460, 600, 60, '#BFE6D8', .5, 28))
    for d in ['M-20 470 L1100 470', 'M140 470 L-60 1350', 'M940 470 L1140 1350', 'M60 640 L1020 640']:
        p.append(f'<path d="{d}" stroke="#F2F6EE" stroke-width="7" opacity=".85" fill="none"/>')
    # 积水：倒映整片天
    w = [f'<rect width="1080" height="1350" fill="url(#rf140)"/>']
    for cx, cy in [(300, 960), (780, 900), (520, 760)]:
        w += [blob(r, cx + r.uniform(-140, 140), cy + r.uniform(-20, 20), r.uniform(60, 110), r.uniform(26, 40), '#FFFFFF', .9) for _ in range(9)]
    for i, c in enumerate(['#F27A6A', '#F6B04A', '#F2E06A', '#8ED07A', '#6AB4E8', '#9A8AE0']):                # 倒影里的彩虹（上下颠倒）
        w.append(f'<path d="M180 {600 - i*12} A380 330 0 0 0 940 {600 - i*12}" fill="none" stroke="{c}" stroke-width="12" opacity=".55"/>')
    w.append(glow(560, 840, 60, 20, '#FFFFFF', .5, 14))
    w.append('<circle cx="560" cy="820" r="20" fill="#C6EA3D"/><path d="M546 806 C554 814 554 826 546 834" stroke="#F6F8E0" stroke-width="2.6" fill="none"/>')
    w.append('<ellipse cx="560" cy="840" rx="34" ry="6" fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity=".7"/><ellipse cx="560" cy="840" rx="58" ry="11" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity=".45"/>')
    p.append(f'<g clip-path="url(#pd140)"><g filter="url(#paint2)">{"".join(w)}</g></g>')
    p.append('<path d="M90 640 C200 560 520 540 760 580 C940 610 1040 700 1000 830 C960 960 760 1060 520 1060 C280 1060 80 990 60 860 C50 760 50 690 90 640Z" fill="none" stroke="#2E6E5E" stroke-width="3" opacity=".5"/>')
    # 鞋尖
    for x in (420, 600):
        p.append(f'<path d="M{x} 1190 C{x+6} 1130 {x+40} 1100 {x+70} 1100 C{x+100} 1100 {x+120} 1130 {x+126} 1190Z" fill="#FBFBF6"/>'
                 f'<path d="M{x+10} 1160 C{x+40} 1150 {x+90} 1150 {x+118} 1160" stroke="#C8CCC4" stroke-width="3" fill="none"/>'
                 f'<path d="M{x+30} 1124 L{x+96} 1124 M{x+28} 1136 L{x+100} 1136" stroke="#9AA49C" stroke-width="2"/>')
    txt, xl, yb = poem(META['lines'], 1000, 110, 40, '#1E3A4A')
    p.append(txt)
    p.append(seal(xl - 40, yb + 32, 30))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.07))
    return page(''.join(p))
