from lib import *
from athlete import server
from wkw import DEFS, subtitle, clock, grain

META = dict(
    id=179, slug='wkw-three-cm', title='三公分', lines=['那一球，', '离底线只有三公分。'],
    style=['电影海报', '霓虹', '抽帧', '南伴绿'], tone='深色', demo=False,
    concept='借王家卫的电影语言（不借台词画面）：深绿的夜场被泛光灯和远处的霓虹抹成一道道横向光带，画面整体歪着；一个人挥拍，身后拖着三四层抽帧残影；前景一条大白底线，荧光球落在线外一点点；左上角数字时钟 23:07，底部是字幕式的独白',
    use='夜场 / 那一球；有记忆点的品牌主视觉',
)


def svg():
    r = random.Random(179)
    p = [f'<defs>{DEFS}<linearGradient id="bg179" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#03140E"/><stop offset=".5" stop-color="#0B3B2A"/><stop offset="1" stop-color="#021009"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#bg179)"/>']
    g = []
    for _ in range(36):                                                                                        # 拖成光带的灯
        y = r.uniform(80, 900)
        g.append(f'<rect x="{r.uniform(-200, 900):.0f}" y="{y:.0f}" width="{r.uniform(160, 600):.0f}" height="{r.uniform(6, 26):.0f}" rx="10" fill="{r.choice(["#3DFF9A", "#3DFF9A", "#FFB347", "#FF4A4A", "#9AFFE0", "#C6EA3D"])}" opacity="{r.uniform(.25, .7):.2f}" filter="url(#smear_w)"/>')
    g.append('<rect x="760" y="120" width="300" height="70" fill="#F4FFE8" opacity=".85" filter="url(#smear_w)"/>')  # 被抹开的泛光灯
    g.append('<path d="M-100 1020 L1200 900 L1200 1500 L-100 1500Z" fill="#0E4A34"/>')                                # 场地
    g.append('<path d="M-100 1060 L1200 940" stroke="#F4FFF0" stroke-width="26"/>')                                  # 大白底线
    for k, op in [(-150, .1), (-100, .16), (-50, .26)]:                                                              # 抽帧残影
        g.append(f'<g transform="translate({k} 0)" opacity="{op}" filter="url(#smear2_w)">{server("#3DFF9A")}</g>')
    g.append(f'<g filter="url(#glow_w)" opacity=".9"><g transform="translate(6 -3)">{server("#3DFF9A")}</g></g>')
    g.append(server('#04140E'))
    g.append('<circle cx="770" cy="1000" r="22" fill="#C6EA3D" filter="url(#glow_w)"/>')                              # 线外一点点的球
    g.append('<ellipse cx="740" cy="1004" rx="60" ry="8" fill="#C6EA3D" opacity=".35" filter="url(#smear2_w)"/>')
    p.append(f'<g transform="rotate(-6 540 675)">{"".join(g)}</g>')
    p.append('<path d="M0 0 L1080 0 L1080 60 L0 120Z" fill="#000" opacity=".5"/><path d="M0 1230 L1080 1170 L1080 1350 L0 1350Z" fill="#000" opacity=".55"/>')
    p.append(clock(70, 130, '23:07'))
    p.append(f'<text x="72" y="166" font-family="{SANS}" font-size="14" letter-spacing="5" fill="#9AFFE0" opacity=".8">MELBOURNE · COURT 3 · 三号场的灯，再过八分钟就灭</text>')
    p.append(f'<g transform="rotate(-6 860 420)" filter="url(#glow_w)"><text x="690" y="470" font-family="{SERIF}" font-weight="900" font-size="112" fill="#3DFF9A">三公分</text></g>')
    subtitle(p, '那一球，离底线只有三公分。她说出界，我说是界内。', 'Three centimetres from the line. She called it out. I still think it was in.', 1176)
    p.append(f'<text x="540" y="1290" text-anchor="middle" font-family="{SANS}" font-size="13" letter-spacing="4" fill="#9AC4B0">南伴球 出品　·　后来我们又约了十七次　·　谁也没再提那一球</text>')
    p.append('<circle cx="970" cy="1286" r="7" fill="#C6EA3D"/><circle cx="982" cy="1294" r="4.5" fill="#C6EA3D"/>')
    grain(p)
    return page(''.join(p))
