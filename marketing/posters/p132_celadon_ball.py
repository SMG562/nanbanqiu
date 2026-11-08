from lib import *

META = dict(
    id=132, slug='celadon-ball', title='先供起来', lines=['新开的一罐，', '先供起来。'],
    style=['宋瓷', '静物', '极简', '幽默'], tone='浅色', demo=False,
    concept='宋瓷 × 博物馆陈列：月白底上一只汝窑天青釉斗笠盏，釉面细细的开片，盏里端端正正放着一颗新球；旁边一张小小的展签，一本正经写着名目——最俗的东西放进最雅的器物里',
    use='开新球 / 新球的珍惜感；形似双关 + 小字细节',
)


def svg():
    random.seed(132)
    r = random.Random(132)
    cx, rim, foot = 540, 700, 860
    crack = ''
    for _ in range(46):                                                                                        # 开片
        x, y = r.uniform(360, 720), r.uniform(705, 850)
        pts = [(x, y)]
        for _ in range(3):
            x += r.uniform(-34, 34); y += r.uniform(-14, 22)
            pts.append((x, y))
        crack += '<polyline points="' + ' '.join(f'{a:.0f},{b:.0f}' for a, b in pts) + '" fill="none" stroke="#7E9C94" stroke-width=".8" opacity=".32"/>'
    p = [f'<defs><linearGradient id="bg132" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2F4F0"/><stop offset=".72" stop-color="#E6EAE4"/><stop offset="1" stop-color="#D8DED6"/></linearGradient>'
         '<linearGradient id="gl132" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8FB0A8"/><stop offset=".35" stop-color="#C4DCD4"/><stop offset=".6" stop-color="#B2CEC6"/><stop offset="1" stop-color="#7E9E96"/></linearGradient>'
         '<linearGradient id="in132" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9DBAB2"/><stop offset="1" stop-color="#CFE2DA"/></linearGradient>'
         f'<clipPath id="bw132"><path d="M340 {rim} L740 {rim} L590 {foot} L490 {foot}Z"/></clipPath></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#bg132)"/>',
         '<ellipse cx="560" cy="890" rx="250" ry="26" fill="#6A7A70" opacity=".28" filter="url(#bl14)"/>']
    p.append(f'<path d="M340 {rim} L740 {rim} L590 {foot} L490 {foot}Z" fill="url(#gl132)"/>')                     # 斗笠盏
    p.append(f'<g clip-path="url(#bw132)">{crack}<rect x="380" y="{rim}" width="40" height="160" fill="#fff" opacity=".18"/></g>')
    p.append(f'<path d="M490 {foot} L590 {foot} L584 {foot+16} L496 {foot+16}Z" fill="#C9B48A"/>')                     # 圈足露胎
    p.append(f'<ellipse cx="{cx}" cy="{rim}" rx="200" ry="34" fill="url(#in132)"/>')
    p.append(ball('132', 548, 664, 62, -28))                                                                        # 盏里的新球
    p.append(f'<path d="M340 {rim} A200 34 0 0 0 740 {rim}" fill="url(#gl132)"/>')                                  # 前沿压住球的下半
    p.append(f'<g clip-path="url(#bw132)">{crack}</g>')
    p.append(f'<ellipse cx="{cx}" cy="{rim}" rx="200" ry="34" fill="none" stroke="#E4F0EA" stroke-width="3"/>')
    p.append(f'<path d="M346 {rim+2} A200 34 0 0 0 734 {rim+2}" fill="none" stroke="#5E7E76" stroke-width="1.2" opacity=".6"/>')
    # 展签
    p.append('<line x1="720" y1="980" x2="996" y2="980" stroke="#3A4A44" stroke-width="1"/>')
    for i, (t, sz, op) in enumerate([('天青釉斗笠盏', 22, .9), ('内盛：网球一颗（新）', 17, .75), ('开罐时「嘶」了一声', 17, .75), ('私人收藏 · 墨尔本', 14, .5)]):
        p.append(f'<text x="720" y="{1014 + i * 30}" font-family="{SERIF if i == 0 else SANS}" font-size="{sz}" fill="#2E3A36" opacity="{op}" letter-spacing="2">{t}</text>')
    p.append(tag('CELADON · NEW CAN', color='#2E4A42', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=272, size=50, colors=('#2E4A42', '#9E2A2B'), lh=70))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.06, light=True))
    return page(''.join(p))
