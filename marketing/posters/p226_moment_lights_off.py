from lib import *
from moment import frame

META = dict(
    id=226, slug='moment-lights-off', title='关灯以后。', lines=['关灯以后。'],
    style=['瞬间', '夜场', '星空', '温暖'], tone='亮色', demo=False,
    concept='打到夜场关灯：灯一灭，眼睛还没适应，满天的星星和银河一下子全冒出来——原来一直都在。灯头还留着一点没散的橘红余温；场边长凳上两个人的背影，肩并肩仰着头，肩靠着肩，拍子和球袋放在凳边。南半球的夜空，南十字就在银河旁边。',
    use='瞬间系列 · 05；夜场 / 打完球的那几分钟 / 球友的陪伴',
)


def svg():
    r = random.Random(226)
    p = ['<defs><linearGradient id="sky226" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#071419"/><stop offset=".55" stop-color="#0E2A30"/><stop offset=".85" stop-color="#17413F"/><stop offset="1" stop-color="#2A4E44"/></linearGradient>'
         '<radialGradient id="hz226" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="#F2B36A" stop-opacity=".55"/><stop offset="1" stop-color="#F2B36A" stop-opacity="0"/></radialGradient>'
         '<filter id="mw226" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>'
         '<filter id="soft226" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>'
         '<filter id="glow226" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="14"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#sky226)"/>',
         '<ellipse cx="560" cy="800" rx="520" ry="170" fill="url(#hz226)"/>']
    # 银河：一条斜的亮带 + 暗尘带
    p.append('<g transform="rotate(-32 540 420)"><ellipse cx="540" cy="420" rx="760" ry="120" fill="#DCEBDF" opacity=".16" filter="url(#mw226)"/>'
             '<ellipse cx="600" cy="430" rx="420" ry="54" fill="#F4E8CF" opacity=".16" filter="url(#mw226)"/>'
             '<ellipse cx="520" cy="440" rx="380" ry="16" fill="#071419" opacity=".35" filter="url(#soft226)"/></g>')
    # 星星：靠近银河更密
    ca, sa = math.cos(math.radians(-32)), math.sin(math.radians(-32))
    for i in range(900):
        if i < 600:
            u, v = r.uniform(-800, 800), r.gauss(0, 90)
            x, y = 540 + u * ca - v * sa, 420 + u * sa + v * ca
        else:
            x, y = r.uniform(0, 1080), r.uniform(0, 760)
        if not (0 <= x <= 1080 and 0 <= y <= 780): continue
        rr = r.choice([.6, .7, .8, 1, 1.2]) if r.random() > .03 else r.uniform(1.6, 2.4)
        p.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rr}" fill="{r.choice(["#FFFFFF", "#F4EDCF", "#DDEBF2"])}" opacity="{r.uniform(.35, .95):.2f}"/>')
    # 南十字（小，银河旁边）
    for x, y, s in [(842, 236, 3.4), (850, 316, 3.8), (812, 280, 3.0), (884, 268, 2.6), (866, 296, 1.8)]:
        p.append(f'<circle cx="{x}" cy="{y}" r="{s}" fill="#FFFFFF"/><circle cx="{x}" cy="{y}" r="{s * 3}" fill="#FFFFFF" opacity=".12"/>')
    # 远处树线 + 围网 + 灯杆（灯头还留着一点橘红余温）
    p.append('<path d="M0 760 Q90 720 180 748 Q280 700 380 744 Q480 716 580 746 Q700 706 820 742 Q940 712 1080 740 V880 H0Z" fill="#0A2220"/>')
    p.append('<g stroke="#2E4E4A" stroke-width="1" opacity=".5">' + ''.join(f'<path d="M{x} 790 V880"/>' for x in range(0, 1080, 20)) + '</g><path d="M0 790 H1080" stroke="#2E4E4A" stroke-width="3"/>')
    for x, h in [(120, 330), (960, 330)]:
        top = 880 - h
        p.append(f'<path d="M{x} {top + 14} V880" stroke="#1E3A38" stroke-width="7"/><rect x="{x - 26}" y="{top}" width="52" height="18" rx="4" fill="#3A2A20"/>'
                 f'<rect x="{x - 22}" y="{top + 4}" width="44" height="10" rx="3" fill="#E8783A" opacity=".75"/><circle cx="{x}" cy="{top + 9}" r="26" fill="#F29A4A" opacity=".35" filter="url(#glow226)"/>')
    # 黑下来的球场：只剩一点点白线
    p.append('<path d="M0 880 H1080 V1350 H0Z" fill="#0F3A31"/>')
    p.append('<path d="M60 900 H1020 M-40 1010 H1120" stroke="#9FC2B4" stroke-width="3" opacity=".22"/><path d="M540 900 V1010" stroke="#9FC2B4" stroke-width="2" opacity=".18"/>')
    p.append('<ellipse cx="560" cy="790" rx="330" ry="110" fill="#F2B36A" opacity=".22" filter="url(#mw226)"/>')   # 远处街区的暖光，衬出两个人的头
    # 长凳 + 两个人的背影（肩靠着肩，仰头看星星）
    g = ['<rect x="300" y="1060" width="520" height="22" rx="4" fill="#3B2A1E"/><path d="M330 1082 V1130 M790 1082 V1130" stroke="#2A1E16" stroke-width="12"/>'
         '<rect x="300" y="996" width="520" height="16" rx="4" fill="#3B2A1E"/><path d="M340 1012 V1060 M780 1012 V1060" stroke="#2A1E16" stroke-width="8"/>']
    # 左：戴帽子，仰头
    g.append('<path d="M436 1066 Q428 972 470 948 Q500 936 534 948 Q574 972 566 1066Z" fill="#11201C"/>'
             '<rect x="488" y="914" width="24" height="34" rx="10" fill="#11201C"/>'
             '<ellipse cx="500" cy="896" rx="28" ry="31" fill="#11201C" transform="rotate(-8 500 896)"/>'
             '<path d="M470 884 Q500 856 530 880" stroke="#11201C" stroke-width="10" fill="none"/>')
    # 右：头微微靠向左边
    g.append('<path d="M548 1066 Q546 978 590 952 Q622 940 652 952 Q690 976 684 1066Z" fill="#132622"/>'
             '<rect x="602" y="920" width="24" height="34" rx="10" fill="#132622" transform="rotate(-12 614 940)"/>'
             '<ellipse cx="606" cy="902" rx="27" ry="30" fill="#132622" transform="rotate(-18 606 902)"/>'
             '<path d="M582 890 Q600 864 626 878" stroke="#132622" stroke-width="12" fill="none"/>')
    # 灯头余温给肩头和发顶勾一圈暖色
    g.append('<path d="M440 1000 Q436 960 470 948" stroke="#F29A4A" stroke-width="3" fill="none" opacity=".55"/><path d="M476 880 Q496 862 520 868" stroke="#F29A4A" stroke-width="2.4" fill="none" opacity=".5"/>'
             '<path d="M682 1000 Q686 966 656 952" stroke="#F29A4A" stroke-width="3" fill="none" opacity=".55"/><path d="M590 884 Q604 868 624 874" stroke="#F29A4A" stroke-width="2.4" fill="none" opacity=".5"/>')
    # 凳边：两支拍 + 球袋，袋口一颗荧光球
    g.append('<g transform="rotate(14 840 1130)"><ellipse cx="840" cy="960" rx="44" ry="58" fill="none" stroke="#3A5A52" stroke-width="10"/><path d="M840 1018 V1130" stroke="#3A5A52" stroke-width="11" stroke-linecap="round"/></g>'
             '')
    g.append('<path d="M900 1130 Q896 1080 930 1074 H990 Q1012 1080 1010 1130Z" fill="#1E3A34"/><circle cx="960" cy="1072" r="13" fill="#C6EA3D" opacity=".9"/><circle cx="960" cy="1072" r="28" fill="#C6EA3D" opacity=".2" filter="url(#soft226)"/>')
    p.append(f'<g transform="translate(0 -84)">{"".join(g)}</g>')
    frame(p, 5, '关灯以后。', '星星一直都在，只是我们一直在打球。', '夜场的球局，也能在南伴球上约。', ink='#F4EDCF', sub_c='#D9E6DD', info_c='#8FB5A6', mark_c='#F4EDCF', total=None)
    return page(''.join(p))
