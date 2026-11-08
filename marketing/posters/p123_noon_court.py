from lib import *

META = dict(
    id=123, slug='noon-court', title='正午十二点', lines=['正午十二点，', '场上只有我。'],
    style=['平面构成', '光影', '光亮'], tone='亮色', demo=False,
    concept='借 Hockney 加州画的平涂和硬光：大块钴蓝的天、一堵白墙、一棵棕榈；正午太阳当头，棕榈和人的影子都缩成脚下一小团，场上只有一个白衣人',
    use='夏天 / 大太阳；明亮、干净、有一点好笑的孤独',
)


def svg():
    p = [f'<rect width="{W}" height="{H}" fill="#2F8FE0"/>',
         '<rect y="0" width="1080" height="560" fill="#2A84D6"/>',
         '<rect y="420" width="1080" height="140" fill="#5AAEEC" opacity=".5"/>']
    p.append('<rect x="0" y="560" width="1080" height="190" fill="#F7F3EA"/>')                    # 白墙
    p.append('<rect x="0" y="560" width="1080" height="14" fill="#E2DCCB"/>')
    for x in range(0, 1080, 180):
        p.append(f'<rect x="{x}" y="574" width="2" height="176" fill="#E6E0D0"/>')
    p.append('<path d="M0 750 L1080 750 L1080 1350 L0 1350Z" fill="#E86E4A"/>')                    # 场外赭红
    p.append('<path d="M150 770 L930 770 L1180 1350 L-100 1350Z" fill="#23A08E"/>')               # 场地
    for d in ['M150 770 L-100 1350', 'M930 770 L1180 1350', 'M150 770 L930 770', 'M235 770 L40 1350', 'M845 770 L1040 1350',
              'M200 885 L880 885', 'M540 885 L540 1350']:
        p.append(f'<path d="{d}" stroke="#FFFFFF" stroke-width="7" fill="none"/>')
    # 棕榈：干净的剪影
    p.append('<path d="M808 750 C800 600 790 470 812 330" stroke="#6B4A2E" stroke-width="16" fill="none" stroke-linecap="round"/>')
    for a in [-170, -145, -118, -90, -62, -35, -8, 18, 45, 160, 135]:
        rad = math.radians(a)
        ex, ey = 812 + 150 * math.cos(rad), 330 + 150 * math.sin(rad) + 40
        mx, my = 812 + 80 * math.cos(rad), 330 + 80 * math.sin(rad) - 18
        p.append(f'<path d="M812 330 Q{mx:.0f} {my-14:.0f} {ex:.0f} {ey:.0f} Q{mx+6:.0f} {my+26:.0f} 812 340Z" fill="#1F7A44"/>')
    # 正午：棕榈的影子就缩在墙根，一小团
    p.append('<ellipse cx="808" cy="764" rx="70" ry="10" fill="#156F63"/>')
    # 人：白衣，影子在脚下缩成一团
    p.append('<ellipse cx="372" cy="1062" rx="34" ry="9" fill="#156F63"/>')
    p.append('<path d="M362 1060 L364 1020 M380 1060 L378 1020" stroke="#2A1E14" stroke-width="7" stroke-linecap="round"/>')
    p.append('<rect x="356" y="968" width="30" height="56" rx="12" fill="#FFFFFF"/>')
    p.append('<circle cx="371" cy="954" r="12" fill="#2A1E14"/><path d="M357 952 Q371 936 386 950" fill="#FFFFFF"/>')
    p.append('<path d="M386 984 L408 1004 L420 990" stroke="#2A1E14" stroke-width="5" fill="none" stroke-linecap="round"/>')
    p.append('<ellipse cx="430" cy="978" rx="11" ry="17" transform="rotate(30 430 978)" fill="none" stroke="#2A1E14" stroke-width="4"/>')
    p.append('<circle cx="470" cy="1052" r="7" fill="#C6EA3D"/><ellipse cx="472" cy="1061" rx="7" ry="2" fill="#156F63"/>')
    p.append('<circle cx="930" cy="150" r="56" fill="#FFF8DA"/>')
    p.append(tag('NOON', color='#FFFFFF', rule='#C6EA3D', op=.85))
    p.append(headline(META['lines'], y=272, size=58, colors=('#FFFFFF', '#E4F76A'), lh=80))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    p.append(grain(.1))
    return page(''.join(p))
