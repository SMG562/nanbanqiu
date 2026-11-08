from lib import *

META = dict(
    id=162, slug='whats-in-bag', title='装进一个包', lines=['装进一个包，', '就能出门。'],
    style=['平铺', '生活', '极简', '信息'], tone='浅色', demo=False,
    concept='像好的日常服饰品牌那样诚实地摆东西：暖白底上，把打一场球要带的东西一件件平铺对齐——球拍、球鞋、三颗球、球罐、水壶、袜子、毛巾、帽子、手胶、护腕，还有一根香蕉；每件旁边一个编号和一行小字，安静、整齐、留白',
    use='新手指南 / 品牌调性；不喊口号，看的人会觉得「我就是这么出门的」',
)

INK = '#26282A'
SUB = '#7A7C7E'


def sh(svg, dx=6, dy=10):
    """柔和的落地阴影（顶光）。"""
    return f'<g transform="translate({dx} {dy})" opacity=".16" filter="url(#bl6)">{svg}</g>{svg}'


def label(x, y, n, name, note, anchor='start'):
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{SANS}" font-weight="700" font-size="15" letter-spacing="2" fill="{INK}">{n:02d}  {name}</text>'
            f'<text x="{x}" y="{y + 22}" text-anchor="{anchor}" font-family="{SANS}" font-size="13" letter-spacing="1" fill="{SUB}">{note}</text>')


def svg():
    p = [f'<rect width="{W}" height="{H}" fill="#F5F3EE"/>']
    # 01 球拍（竖放）
    strings = ''.join(f'<line x1="{x}" y1="440" x2="{x}" y2="690" stroke="#B9BBB6" stroke-width="1.6"/>' for x in range(170, 316, 14))
    strings += ''.join(f'<line x1="140" y1="{y}" x2="340" y2="{y}" stroke="#B9BBB6" stroke-width="1.6"/>' for y in range(452, 680, 14))
    rk = (f'<ellipse cx="240" cy="565" rx="98" ry="128" fill="#2E3438"/><ellipse cx="240" cy="565" rx="84" ry="114" fill="#F5F3EE"/>'
          f'<clipPath id="st162"><ellipse cx="240" cy="565" rx="84" ry="114"/></clipPath><g clip-path="url(#st162)">{strings}</g>'
          f'<path d="M190 676 L240 780 L290 676 L276 680 L240 750 L204 680Z" fill="#2E3438"/>'
          f'<rect x="226" y="770" width="28" height="330" rx="8" fill="#2E3438"/>'
          + ''.join(f'<line x1="226" y1="{y}" x2="254" y2="{y + 12}" stroke="#4A5258" stroke-width="2"/>' for y in range(820, 1096, 14))
          + '<rect x="222" y="1092" width="36" height="16" rx="6" fill="#1E2428"/>')
    p.append(sh(rk))
    p.append(label(84, 1150, 1, '球拍', '用了三年，还是这支'))
    # 02 球鞋（一双，俯视）
    def shoe(cx, cy, flip=1):
        o = f'<path d="M{cx} {cy - 140} C{cx + 52*flip} {cy - 140} {cx + 58*flip} {cy - 40} {cx + 50*flip} {cy + 40} C{cx + 44*flip} {cy + 110} {cx + 30*flip} {cy + 146} {cx} {cy + 146} C{cx - 34*flip} {cy + 146} {cx - 46*flip} {cy + 100} {cx - 46*flip} {cy + 40} C{cx - 46*flip} {cy - 40} {cx - 44*flip} {cy - 140} {cx} {cy - 140}Z" fill="#FFFFFF" stroke="#D8D6D0" stroke-width="2"/>'
        o += f'<path d="M{cx - 22} {cy - 20} C{cx - 10} {cy - 70} {cx + 10} {cy - 70} {cx + 22} {cy - 20} L{cx + 22} {cy + 60} L{cx - 22} {cy + 60}Z" fill="#ECEAE4"/>'
        o += ''.join(f'<line x1="{cx - 20}" y1="{cy - 10 + k*16}" x2="{cx + 20}" y2="{cy - 2 + k*16}" stroke="#9A9C98" stroke-width="2.4"/>' for k in range(4))
        o += f'<path d="M{cx - 40} {cy - 104} C{cx - 20} {cy - 136} {cx + 20} {cy - 136} {cx + 40} {cy - 104}" stroke="#C8C6C0" stroke-width="10" fill="none" stroke-linecap="round"/>'
        o += f'<path d="M{cx - 40*flip} {cy + 70} C{cx - 20*flip} {cy + 90} {cx + 10*flip} {cy + 96} {cx + 40*flip} {cy + 80}" stroke="#2E7A5A" stroke-width="4" fill="none"/>'
        return o
    p.append(sh(shoe(450, 570, 1) + shoe(570, 570, -1)))
    p.append(label(400, 760, 2, '球鞋', '鞋底磨平了再换'))
    # 03 三颗球
    for i, x in enumerate((720, 810, 900)):
        p.append(f'<ellipse cx="{x + 5}" cy="{486}" rx="38" ry="38" fill="#000" opacity=".14" filter="url(#bl6)"/>')
        p.append(ball(f'b{i}', x, 470, 38, -20 + i * 35))
    p.append(label(682, 548, 3, '球', '三颗，新开的一罐'))
    # 04 球罐（横放）
    can = ('<rect x="690" y="600" width="290" height="92" rx="18" fill="#FFFFFF" stroke="#D8D6D0" stroke-width="2"/>'
           '<rect x="690" y="600" width="34" height="92" rx="12" fill="#2E3438"/><rect x="760" y="618" width="160" height="56" rx="6" fill="#C6EA3D"/>'
           f'<text x="840" y="654" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="18" letter-spacing="4" fill="#26282A">3 BALLS</text>')
    p.append(sh(can))
    p.append(label(690, 724, 4, '球罐', '空罐留着装球'))
    # 05 水壶（横放）
    bottle = ('<rect x="380" y="820" width="230" height="74" rx="30" fill="#9CC8D8"/><rect x="600" y="836" width="34" height="42" rx="8" fill="#2E3438"/>'
              '<rect x="400" y="832" width="120" height="10" rx="5" fill="#FFFFFF" opacity=".5"/>')
    p.append(sh(bottle))
    p.append(label(380, 924, 5, '水壶', '一升，夏天两壶'))
    # 06 袜子（叠好）、07 毛巾（叠好）
    socks = ('<rect x="690" y="790" width="110" height="140" rx="14" fill="#FFFFFF" stroke="#D8D6D0" stroke-width="2"/>'
             '<rect x="690" y="806" width="110" height="10" fill="#2E7A5A"/><rect x="690" y="822" width="110" height="5" fill="#2E7A5A"/>'
             '<line x1="700" y1="860" x2="790" y2="860" stroke="#E4E2DC" stroke-width="2"/>')
    p.append(sh(socks))
    p.append(label(690, 962, 6, '袜子', '白的，打完可能是红的'))
    towel = ('<rect x="840" y="776" width="150" height="170" rx="10" fill="#B8CDB8"/><rect x="840" y="776" width="150" height="20" fill="#A6BEA6"/>'
             + ''.join(f'<line x1="{x}" y1="946" x2="{x}" y2="958" stroke="#A6BEA6" stroke-width="3"/>' for x in range(848, 990, 10)))
    p.append(sh(towel))
    p.append(label(840, 990, 7, '毛巾', '擦汗，也擦拍'))
    # 08 帽子（俯视）
    cap = ('<path d="M436 1066 C436 1096 564 1096 564 1066 L580 1098 C548 1128 452 1128 420 1098Z" fill="#2E3438"/>'
           '<circle cx="500" cy="1044" r="66" fill="#FFFFFF" stroke="#D8D6D0" stroke-width="2"/>'
           + ''.join(f'<line x1="500" y1="1044" x2="{500 + 64*math.cos(a):.0f}" y2="{1044 + 64*math.sin(a):.0f}" stroke="#E4E2DC" stroke-width="2"/>' for a in [k * math.pi / 3 for k in range(6)])
           + '<circle cx="500" cy="1044" r="6" fill="#D8D6D0"/>')
    p.append(sh(cap))
    p.append(label(380, 1150, 8, '帽子', '下午场一定要'))
    # 09 手胶、10 护腕、11 香蕉
    grip = '<circle cx="690" cy="1074" r="40" fill="#FFFFFF" stroke="#D8D6D0" stroke-width="2"/><circle cx="690" cy="1074" r="28" fill="none" stroke="#E4E2DC" stroke-width="6"/><circle cx="690" cy="1074" r="12" fill="#F5F3EE" stroke="#D8D6D0" stroke-width="2"/>'
    p.append(sh(grip))
    p.append(label(650, 1150, 9, '手胶', '缠一层新的'))
    band = '<circle cx="810" cy="1074" r="34" fill="#2E7A5A"/><circle cx="810" cy="1074" r="18" fill="#F5F3EE"/>'
    p.append(sh(band))
    p.append(label(776, 1150, 10, '护腕', '吸汗'))
    banana = ('<g transform="translate(0 44)"><path d="M880 1000 C900 1050 950 1074 1000 1060 C1010 1058 1012 1068 1004 1072 C950 1100 890 1080 866 1014 C862 1002 876 994 880 1000Z" fill="#F2D34A"/>'
              '<path d="M866 1008 L860 994 L872 990Z" fill="#6A5A2A"/><path d="M890 1030 C910 1060 950 1074 990 1066" stroke="#E2BE30" stroke-width="3" fill="none"/></g>')
    p.append(sh(banana))
    p.append(label(880, 1150, 11, '香蕉', '第二盘前吃'))
    # 文字
    p.append(f'<text x="84" y="150" font-family="{SANS}" font-weight="500" font-size="17" letter-spacing="8" fill="{SUB}">WHAT\'S IN THE BAG</text>')
    p.append(f'<text x="84" y="246" font-family="{SANS}" font-weight="700" font-size="54" letter-spacing="2" fill="{INK}">装进一个包，</text>')
    p.append(f'<text x="84" y="320" font-family="{SANS}" font-weight="700" font-size="54" letter-spacing="2" fill="#2E7A5A">就能出门。</text>')
    p.append(f'<text x="996" y="320" text-anchor="end" font-family="{SANS}" font-size="15" letter-spacing="2" fill="{SUB}">打一场球的全部家当 · 11 件</text>')
    p.append('<line x1="84" y1="360" x2="996" y2="360" stroke="#D8D6D0" stroke-width="1.5"/>')
    p.append('<path d="M0 1200 L1080 1200 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1278, '#fff', sub=False))
    return page(''.join(p))
