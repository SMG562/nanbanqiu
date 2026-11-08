from lib import *
from people import person
from wkw import DEFS, subtitle, clock, grain

META = dict(
    id=180, slug='wkw-forty-min', title='四十分钟', lines=['她说雨停了就打，', '雨一直没停。'],
    style=['电影海报', '霓虹', '雨', '南伴绿'], tone='深色', demo=False,
    concept='借王家卫的电影语言（不借台词画面）：雨夜，一家通宵便利店的玻璃门亮着冷绿的日光灯，招牌被雨抹开成一片霓虹；门口檐下两个人背着球拍包站着等雨，地上的积水把绿光和橙光拉成长长的倒影；画面歪着，左上角时钟 21:40，底部字幕式独白',
    use='雨天改期 / 等雨；有故事感的品牌海报',
)


def svg():
    r = random.Random(180)
    p = [f'<defs>{DEFS}<linearGradient id="bg180" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#021009"/><stop offset="1" stop-color="#0B3B2A"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#bg180)"/>']
    g = []
    g.append('<rect x="160" y="230" width="820" height="560" fill="#0A2A1E"/>')                                       # 店面
    g.append('<rect x="200" y="330" width="740" height="440" fill="#9AFFD8" opacity=".85"/>')                         # 冷绿的日光灯店内
    g.append('<rect x="200" y="330" width="740" height="440" fill="#3DFF9A" opacity=".35"/>')
    for x in range(230, 940, 120):                                                                                    # 货架剪影
        g.append(f'<rect x="{x}" y="470" width="80" height="300" fill="#2E7A5A" opacity=".55"/>' + ''.join(f'<rect x="{x}" y="{470 + k*40}" width="80" height="4" fill="#0E3A2A" opacity=".6"/>' for k in range(8)))
    g.append('<rect x="560" y="330" width="10" height="440" fill="#0A2A1E"/>')
    g.append('<rect x="180" y="240" width="780" height="80" fill="#3DFF9A" filter="url(#smear_w)" opacity=".9"/>')    # 被雨抹开的招牌
    g.append('<rect x="300" y="256" width="200" height="40" fill="#FFB347" filter="url(#smear2_w)" opacity=".9"/>')
    g.append('<rect x="120" y="790" width="900" height="16" fill="#0A2A1E"/>')                                        # 檐
    g.append('<rect x="-100" y="806" width="1300" height="600" fill="#06180F"/>')                                     # 湿地面
    for _ in range(28):                                                                                               # 地上拉长的倒影
        x = r.uniform(180, 960)
        g.append(f'<rect x="{x:.0f}" y="810" width="{r.uniform(8, 40):.0f}" height="{r.uniform(160, 420):.0f}" fill="{r.choice(["#3DFF9A", "#9AFFD8", "#FFB347"])}" opacity="{r.uniform(.12, .35):.2f}" filter="url(#smear2_w)"/>')
    g.append(person(420, 800, 1.2, 'hold', 1, 0, 1, '#1E3A30', '#0A1A14', shoe='#0A1A14', sleeve='long', hairstyle='long', bag='#0A1A14', mono='#04140E'))
    g.append(person(640, 800, 1.24, 'walk', -1, 2, 0, '#1E3A30', '#0A1A14', sleeve='long', hairstyle='short', bag='#0A1A14', mono='#04140E'))
    g.append('<circle cx="468" cy="514" r="10" fill="#C6EA3D" filter="url(#glow_w)"/>')
    g.append('<g opacity=".55">' + ''.join(f'<line x1="{x:.0f}" y1="{y:.0f}" x2="{x - 10:.0f}" y2="{y + 70:.0f}" stroke="#CFFFF0" stroke-width="1.6"/>' for x, y in ((r.uniform(-40, 1120), r.uniform(-40, 1300)) for _ in range(220))) + '</g>')
    p.append(f'<g transform="rotate(5 540 675)">{"".join(g)}</g>')
    p.append('<path d="M0 0 L1080 0 L1080 120 L0 60Z" fill="#000" opacity=".5"/><path d="M0 1170 L1080 1230 L1080 1350 L0 1350Z" fill="#000" opacity=".55"/>')
    p.append(clock(70, 130, '21:40', '#FFB347'))
    p.append(f'<text x="72" y="166" font-family="{SANS}" font-size="14" letter-spacing="5" fill="#FFD8A0" opacity=".8">24 小时便利店门口 · 雨 · 已等四十分钟</text>')
    p.append(f'<g transform="rotate(5 300 1050)" filter="url(#glow_w)"><text x="90" y="1060" font-family="{SERIF}" font-weight="900" font-size="110" fill="#3DFF9A">四十分钟</text></g>')
    subtitle(p, '她说，雨停了就打。我们等了四十分钟，雨一直没停。', 'She said we would play when the rain stopped. We waited forty minutes. It never did.', 1176)
    p.append(f'<text x="540" y="1290" text-anchor="middle" font-family="{SANS}" font-size="13" letter-spacing="4" fill="#9AC4B0">南伴球 出品　·　那天我们改约到了下周六　·　那天是晴天</text>')
    p.append('<circle cx="970" cy="1286" r="7" fill="#C6EA3D"/><circle cx="982" cy="1294" r="4.5" fill="#C6EA3D"/>')
    grain(p)
    return page(''.join(p))
