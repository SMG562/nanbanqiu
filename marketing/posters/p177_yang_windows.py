from lib import *
from lin import blob
from film import DEFS

META = dict(
    id=177, slug='yang-windows', title='明天见', lines=['这栋楼里，', '有一个人明天要去打球。'],
    style=['电影海报', '城市', '框中框', '南伴绿'], tone='深色', demo=False,
    concept='借杨德昌电影看城市的方式：入夜的一栋旧公寓楼占满画面，深绿的外墙、铁窗、冷气机，一格一格的窗里各过各的日子——做饭、看电视、写作业、晾衣服、吵架、发呆；其中一扇窗里，墙上挂着一支拍，有人蹲着往包里塞球，那颗球是整栋楼唯一的荧光点',
    use='城市里的约球 / 明天的球局；人情味、克制',
)


def svg():
    r = random.Random(177)
    p = [f'<defs>{DEFS}<linearGradient id="fa177" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E3A2A"/><stop offset="1" stop-color="#082419"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#fa177)"/>']
    for y in range(0, 1100, 6):                                                                                # 外墙的旧马赛克砖
        p.append(f'<line x1="0" y1="{y}" x2="1080" y2="{y}" stroke="#0A2E21" stroke-width="1" opacity=".6"/>')
    cols, rows, x0, y0, cw, ch, gx, gy = 5, 6, 60, 40, 168, 140, 34, 34
    hero = (3, 4)
    scenes = ['cook', 'tv', 'desk', 'laundry', 'dark', 'talk', 'plant', 'tv', 'dark', 'cook', 'cat', 'desk', 'dark', 'laundry', 'tv',
              'talk', 'plant', 'dark', 'desk', 'cook', 'tv', 'dark', 'cat', 'hero', 'laundry', 'desk', 'dark', 'plant', 'tv', 'dark']
    k = 0
    for row in range(rows):
        for col in range(cols):
            x, y = x0 + col * (cw + gx), y0 + row * (ch + gy)
            sc = 'hero' if (col, row) == hero else scenes[k % len(scenes)]
            k += 1
            light = {'dark': '#0A1A14', 'tv': '#7FA8D8', 'desk': '#E8F4EE', 'cat': '#F2C46A', 'talk': '#F2C46A', 'hero': '#FFE2A0'}.get(sc, r.choice(['#F2C46A', '#E8F4EE', '#F6D490']))
            p.append(f'<rect x="{x}" y="{y}" width="{cw}" height="{ch}" fill="{light}"/>')
            if sc != 'dark':
                p.append(f'<rect x="{x}" y="{y}" width="{cw}" height="{ch}" fill="#000" opacity=".1"/>')
            S = '#2A2420'
            if sc == 'cook':
                p.append(f'<rect x="{x+20}" y="{y+70}" width="{cw-40}" height="10" fill="{S}" opacity=".6"/><circle cx="{x+60}" cy="{y+60}" r="12" fill="{S}" opacity=".7"/><rect x="{x+52}" y="{y+70}" width="18" height="50" fill="{S}" opacity=".7"/><path d="M{x+100} {y+64} c-6 -12 6 -18 0 -30" stroke="#FFFFFF" stroke-width="2" fill="none" opacity=".7"/>')
            elif sc == 'tv':
                p.append(f'<rect x="{x+100}" y="{y+50}" width="50" height="34" fill="#C8E8FF"/><circle cx="{x+50}" cy="{y+70}" r="11" fill="{S}" opacity=".8"/><path d="M{x+30} {y+140} C{x+30} {y+96} {x+70} {y+96} {x+70} {y+140}Z" fill="{S}" opacity=".8"/>')
            elif sc == 'desk':
                p.append(f'<rect x="{x+30}" y="{y+90}" width="{cw-60}" height="8" fill="{S}" opacity=".6"/><circle cx="{x+84}" cy="{y+66}" r="11" fill="{S}" opacity=".8"/><path d="M{x+66} {y+92} C{x+66} {y+74} {x+102} {y+74} {x+102} {y+92}Z" fill="{S}" opacity=".8"/><rect x="{x+110}" y="{y+40}" width="6" height="50" fill="{S}" opacity=".5"/>')
            elif sc == 'laundry':
                p.append(f'<line x1="{x+10}" y1="{y+30}" x2="{x+cw-10}" y2="{y+30}" stroke="{S}" stroke-width="2"/>' + ''.join(f'<rect x="{x+20+i*36}" y="{y+30}" width="26" height="{r.uniform(30, 50):.0f}" fill="{r.choice(["#FFFFFF", "#E8B8B0", "#9AB8D8"])}"/>' for i in range(4)))
            elif sc == 'talk':
                for dx, f in ((50, 1), (118, -1)):
                    p.append(f'<circle cx="{x+dx}" cy="{y+66}" r="11" fill="{S}" opacity=".8"/><path d="M{x+dx-18} {y+140} C{x+dx-18} {y+96} {x+dx+18} {y+96} {x+dx+18} {y+140}Z" fill="{S}" opacity=".8"/>')
            elif sc == 'plant':
                p.append(''.join(blob(r, x + 40 + r.uniform(-14, 14), y + 90 + r.uniform(-20, 10), 16, 10, '#2E5A3E', .9) for _ in range(6)) + f'<rect x="{x+30}" y="{y+108}" width="22" height="20" fill="#8A5A3A"/>')
            elif sc == 'cat':
                p.append(f'<path d="M{x+110} {y+134} C{x+106} {y+110} {x+116} {y+100} {x+126} {y+100} L{x+128} {y+90} L{x+134} {y+100} L{x+140} {y+90} L{x+142} {y+104} C{x+150} {y+114} {x+148} {y+134} {x+140} {y+134}Z" fill="{S}"/>')
            elif sc == 'hero':                                                                                 # 明天要去打球的人
                p.append(f'<line x1="{x+30}" y1="{y+20}" x2="{x+42}" y2="{y+70}" stroke="{S}" stroke-width="4"/><ellipse cx="{x+26}" cy="{y+20}" rx="12" ry="17" transform="rotate(-14 {x+26} {y+20})" fill="none" stroke="{S}" stroke-width="4"/>')
                p.append(f'<circle cx="{x+100}" cy="{y+82}" r="11" fill="{S}"/><path d="M{x+82} {y+136} C{x+80} {y+104} {x+112} {y+96} {x+120} {y+124} L{x+120} {y+136}Z" fill="{S}"/>')
                p.append(f'<rect x="{x+60}" y="{y+112}" width="56" height="24" rx="10" fill="#176B4D"/><circle cx="{x+124}" cy="{y+120}" r="7" fill="#C6EA3D"/>')
                p.append(f'<rect x="{x - 4}" y="{y - 4}" width="{cw + 8}" height="{ch + 8}" fill="none" stroke="#FFE2A0" stroke-width="2" opacity=".5" filter="url(#bl6)"/>')
            if (col + row) % 3 == 0:                                                                            # 铁窗
                p.append(f'<g opacity=".85">' + ''.join(f'<line x1="{x + i * 21}" y1="{y}" x2="{x + i * 21}" y2="{y + ch}" stroke="#0A2018" stroke-width="3"/>' for i in range(1, 8)) + f'<line x1="{x}" y1="{y + ch/2}" x2="{x + cw}" y2="{y + ch/2}" stroke="#0A2018" stroke-width="3"/></g>')
            if (col * 7 + row) % 4 == 1:                                                                        # 冷气机
                p.append(f'<rect x="{x + cw - 70}" y="{y + ch + 2}" width="58" height="26" rx="2" fill="#C8CCC4"/><circle cx="{x + cw - 41}" cy="{y + ch + 15}" r="8" fill="none" stroke="#8A8E86" stroke-width="2"/>')
    p.append('<defs><linearGradient id="bt177" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120D" stop-opacity="0"/><stop offset=".35" stop-color="#03120D" stop-opacity=".92"/><stop offset="1" stop-color="#03120D"/></linearGradient></defs>')
    p.append('<rect y="1000" width="1080" height="350" fill="url(#bt177)"/>')
    p.append(f'<text x="84" y="1176" font-family="{SERIF}" font-weight="600" font-size="72" letter-spacing="10" fill="#F4F2EA">明天见</text>')
    p.append(f'<text x="86" y="1214" font-family="{SANS}" font-weight="400" font-size="16" letter-spacing="8" fill="#9CC4B0">SEE YOU TOMORROW</text>')
    p.append(f'<text x="996" y="1150" text-anchor="end" font-family="{SANS}" font-weight="400" font-size="20" letter-spacing="2" fill="#D8E8DE">这栋楼里，有一个人明天要去打球。</text>')
    p.append(f'<text x="996" y="1182" text-anchor="end" font-family="{SANS}" font-weight="400" font-size="13" letter-spacing="2" fill="#8FB0A0">三十扇窗　二十二盏灯　一支拍　一罐球　早上九点　三号场</text>')
    p.append('<line x1="84" y1="1256" x2="996" y2="1256" stroke="#5A7A6A" stroke-width="1" opacity=".5"/>')
    p.append(f'<text x="84" y="1296" font-family="{SANS}" font-size="13" letter-spacing="3" fill="#8FB0A0">南伴球 出品　·　墨尔本　·　一栋楼，三十户人家，一场明早的球局</text>')
    p.append('<circle cx="958" cy="1290" r="7" fill="#C6EA3D"/><circle cx="970" cy="1298" r="4.5" fill="#C6EA3D"/>')
    p.append('<rect width="1080" height="1350" filter="url(#fg_f)" opacity=".08" style="mix-blend-mode:screen"/>')
    return page(''.join(p))
