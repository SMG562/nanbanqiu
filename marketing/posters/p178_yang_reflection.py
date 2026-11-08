from lib import *
from film import DEFS

META = dict(
    id=178, slug='yang-reflection', title='倒影', lines=['下班的电车上，', '在想明天那一局。'],
    style=['电影海报', '城市', '倒影', '南伴绿'], tone='深色', demo=False,
    concept='借杨德昌电影里隔着玻璃看人的方式：下班的电车车窗，窗外的城市灯光被拉成一道道流动的光带和光斑；玻璃上叠着一个人的侧影，肩上背着球拍包，手机屏幕的一点光照着他；城市和人叠在同一块玻璃里',
    use='通勤 / 下班后想打球；城市、安静、心里有一点期待',
)


def svg():
    r = random.Random(178)
    p = [f'<defs>{DEFS}<linearGradient id="in178" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B3B2A"/><stop offset="1" stop-color="#062418"/></linearGradient>'
         '<clipPath id="win178"><rect x="90" y="150" width="900" height="820" rx="40"/></clipPath>'
         '<filter id="bk178" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#in178)"/>']
    out = ['<rect x="90" y="150" width="900" height="820" fill="#06140F"/>']
    for _ in range(46):                                                                                        # 窗外的光带（车在走）
        y = r.uniform(200, 940)
        x = r.uniform(-200, 900)
        out.append(f'<rect x="{x:.0f}" y="{y:.0f}" width="{r.uniform(120, 420):.0f}" height="{r.uniform(2, 7):.1f}" rx="3" fill="{r.choice(["#F2C46A", "#FFFFFF", "#7FD8C0", "#C6EA3D", "#FF9A6A", "#8FB8FF"])}" opacity="{r.uniform(.35, .8):.2f}" filter="url(#bl6)"/>')
    for _ in range(40):                                                                                        # 光斑
        out.append(f'<circle cx="{r.uniform(90, 990):.0f}" cy="{r.uniform(160, 960):.0f}" r="{r.uniform(10, 40):.0f}" fill="{r.choice(["#F2C46A", "#7FD8C0", "#FFFFFF", "#FF9A6A"])}" opacity="{r.uniform(.12, .35):.2f}" filter="url(#bk178)"/>')
    # 玻璃上的倒影：一个人的侧影 + 肩上的球拍包
    refl = ('<path d="M560 970 C560 860 590 800 650 780 C640 760 630 730 632 700 C636 640 680 600 730 604 C786 610 810 660 800 716 C796 744 784 764 770 776 C840 796 880 860 890 970Z" fill="#CFE6DA"/>'
            '<g transform="rotate(22 840 860)"><rect x="826" y="650" width="30" height="250" rx="14" fill="#CFE6DA"/><ellipse cx="841" cy="640" rx="30" ry="38" fill="#CFE6DA"/></g>')
    out.append(f'<g opacity=".2">{refl}</g>')
    out.append('<rect x="610" y="880" width="46" height="74" rx="8" fill="#E8FFF4" opacity=".55"/>')         # 手机屏幕的光
    out.append('<ellipse cx="660" cy="840" rx="80" ry="60" fill="#E8FFF4" opacity=".12" filter="url(#bk178)"/>')
    out.append('<path d="M90 150 L420 150 L90 520Z" fill="#FFFFFF" opacity=".05"/>')                       # 玻璃上的反光
    p.append(f'<g clip-path="url(#win178)">{"".join(out)}</g>')
    p.append('<rect x="90" y="150" width="900" height="820" rx="40" fill="none" stroke="#1E5A48" stroke-width="22"/>')
    p.append('<rect x="70" y="990" width="940" height="16" rx="6" fill="#145A44"/>')                          # 窗台
    p.append('<rect x="0" y="70" width="1080" height="10" fill="#C8D8D0" opacity=".85"/>')                    # 车顶日光灯
    p.append('<rect x="0" y="80" width="1080" height="60" fill="#E8F4EE" opacity=".05"/>')
    p.append('<circle cx="888" cy="640" r="8" fill="#C6EA3D"/>')                                              # 包上挂着的一颗小球
    p.append(f'<text x="84" y="1150" font-family="{SERIF}" font-weight="600" font-size="80" letter-spacing="14" fill="#F4F2EA">倒影</text>')
    p.append(f'<text x="86" y="1192" font-family="{SANS}" font-weight="400" font-size="16" letter-spacing="8" fill="#9CC4B0">REFLECTION</text>')
    p.append(f'<text x="996" y="1130" text-anchor="end" font-family="{SANS}" font-weight="400" font-size="20" letter-spacing="2" fill="#D8E8DE">下班的电车上，在想明天那一局。</text>')
    p.append(f'<text x="996" y="1162" text-anchor="end" font-family="{SANS}" font-weight="400" font-size="13" letter-spacing="2" fill="#8FB0A0">电车第七站　晚上七点四十　手机里一条「已加入球局」</text>')
    p.append('<line x1="84" y1="1236" x2="996" y2="1236" stroke="#5A7A6A" stroke-width="1" opacity=".5"/>')
    p.append(f'<text x="84" y="1276" font-family="{SANS}" font-size="13" letter-spacing="3" fill="#8FB0A0">南伴球 出品　·　墨尔本　·　城市很大，明天那一场很小</text>')
    p.append('<circle cx="958" cy="1270" r="7" fill="#C6EA3D"/><circle cx="970" cy="1278" r="4.5" fill="#C6EA3D"/>')
    p.append('<rect width="1080" height="1350" filter="url(#fg_f)" opacity=".08" style="mix-blend-mode:screen"/>')
    return page(''.join(p))
