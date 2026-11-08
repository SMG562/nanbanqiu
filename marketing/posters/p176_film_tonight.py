from lib import *
from lin import blob, ink
from people import person
from film import DEFS

META = dict(
    id=176, slug='film-tonight', title='今晚有球', lines=['今晚有球'],
    style=['电影海报', '夜', '星空', '南伴绿'], tone='深色', demo=False,
    concept='借歌舞片海报的设计思维（不借人物场景）：整张是从近黑深绿到青绿的暮色天幕，满天星，地平线一线暖金，下面一片城市灯海；山顶上一块夜场，一根泛光灯是画面右边唯一的竖线；左下两个小小的人在打夜场，一颗荧光球被抛进了星星里——全画面唯一的暖色；上方细长几何的大片名，「主演」写的是「你　一位水平相近的陌生人」',
    use='夜场 / 下班后约球；浪漫、有梦、品牌主视觉',
)


def svg():
    r = random.Random(176)
    p = [f'<defs>{DEFS}<linearGradient id="sk176" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120D"/><stop offset=".45" stop-color="#0B3B2A"/>'
         '<stop offset=".62" stop-color="#1F6E5E"/><stop offset=".69" stop-color="#5E9A80"/><stop offset=".722" stop-color="#E8B070"/><stop offset=".74" stop-color="#2A3A30"/></linearGradient>'
         '<radialGradient id="lamp176"><stop offset="0" stop-color="#FFFBE6"/><stop offset=".25" stop-color="#FFF0C0" stop-opacity=".7"/><stop offset="1" stop-color="#FFF0C0" stop-opacity="0"/></radialGradient>'
         '<linearGradient id="ct176" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E5A48"/><stop offset="1" stop-color="#0B3B2A"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#sk176)"/>']
    for _ in range(160):                                                                                      # 星
        y = r.uniform(10, 860) ** 1.0
        p.append(f'<circle cx="{r.uniform(0, 1080):.0f}" cy="{y:.0f}" r="{r.uniform(.7, 2.2):.1f}" fill="#F4FFF8" opacity="{r.uniform(.4, 1):.2f}"/>')
    # 远山 + 城市灯海（整组上移 110，给底部演职员表留出暗处）
    n0 = len(p)
    hills = 'M0 1110 ' + ' '.join(f'L{x} {1080 - 30 * math.sin(x / 140) - 20 * math.sin(x / 57):.0f}' for x in range(0, 1100, 30)) + ' L1080 1150 L0 1150Z'
    p.append(f'<path d="{hills}" fill="#0E2A22"/>')
    p.append('<rect y="1110" width="1080" height="80" fill="#0A2019"/>')
    for _ in range(900):
        y = r.uniform(1112, 1186)
        p.append(f'<circle cx="{r.uniform(0, 1080):.0f}" cy="{y:.0f}" r="{r.uniform(.6, 1.8) * (y - 1100) / 60:.1f}" fill="{r.choice(["#FFE6A8", "#FFFFFF", "#FFD08A", "#C8F0FF"])}" opacity="{r.uniform(.4, 1):.2f}"/>')
    # 山顶的夜场（舞台）
    p.append('<path d="M-40 1190 C300 1170 780 1170 1120 1188 L1120 1350 L-40 1350Z" fill="url(#ct176)"/>')
    p.append('<path d="M120 1350 L330 1200 L760 1196 L980 1350 M226 1276 L870 1270 M545 1198 L548 1350" stroke="#E8F2EC" stroke-width="3" fill="none" opacity=".8"/>')
    p.append('<line x1="80" y1="1240" x2="1000" y2="1232" stroke="#06140F" stroke-width="5"/>' + ''.join(f'<line x1="{x}" y1="1240" x2="{x}" y2="1268" stroke="#06140F" stroke-width="1.4" opacity=".6"/>' for x in range(90, 1000, 14)))
    # 泛光灯：右边唯一的竖线
    p.append('<rect x="902" y="760" width="10" height="520" fill="#C8D8D0"/><rect x="896" y="1270" width="22" height="16" fill="#A8B8B0"/>')
    p.append('<rect x="870" y="740" width="74" height="26" rx="4" fill="#E8F0EC"/>')
    p.append('<ellipse cx="907" cy="770" rx="260" ry="260" fill="url(#lamp176)"/>')
    p.append('<path d="M880 768 L640 1190 L1080 1190 L940 768Z" fill="#FFF6D8" opacity=".07"/>')
    # 两个小小的人
    p.append(person(250, 1252, .5, 'five', 1, 1, 0, '#F2EADA', '#1E2A24', sleeve='short', hairstyle='pony'))
    p.append(person(640, 1214, .36, 'hold', -1, 2, 1, '#FFFFFF', '#1E2A24', sleeve='short', hairstyle='short'))
    p[n0:] = ['<g transform="translate(0 -110)">' + ''.join(p[n0:]) + '</g>']
    p.append('<defs><linearGradient id="bt176" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120D" stop-opacity="0"/><stop offset="1" stop-color="#03120D" stop-opacity=".9"/></linearGradient></defs><rect y="1160" width="1080" height="190" fill="url(#bt176)"/>')
    # 抛进星星里的球
    p.append('<path d="M268 870 C290 780 320 720 360 690" stroke="#E4F76A" stroke-width="2" stroke-dasharray="2 10" fill="none" opacity=".6"/>')
    p.append('<circle cx="360" cy="676" r="40" fill="#E4F76A" opacity=".3" filter="url(#bl14)"/>')
    p.append('<circle cx="360" cy="676" r="13" fill="#C6EA3D"/>')
    # 字
    p.append(f'<text x="64" y="212" font-family="{SANS}" font-weight="700" font-size="15" letter-spacing="4" fill="#E8F2EC">敬每一个下班后，还想再打一场的人。</text>')
    p.append(f'<text x="64" y="396" font-family="{SANS}" font-weight="500" font-size="30" letter-spacing="6" fill="#F4FAF6">你　　　一位水平相近的陌生人</text>')
    p.append(f'<text x="56" y="530" font-family="{SANS}" font-weight="100" font-size="150" letter-spacing="34" fill="#FFFFFF">今晚有球</text>')
    p.append(f'<text x="64" y="590" font-family="{SANS}" font-weight="500" font-size="18" letter-spacing="4" fill="#C8E0D4">来自 <tspan font-weight="900">南伴球</tspan> · 墨尔本</text>')
    rows = ['南伴球 出品　一场 晚上八点到十点 的球局　水平 相近　距离 十公里以内　场地 山顶那块有灯的场　灯光 一根泛光灯',
            '主演 你 和 一位还没见过的球友　球 一罐新的　抛球 有点高　观众 满天的星星　配乐 隔壁场的回球声',
            '发起 不用等周末　确认 发起人点一下　七天内 都能约　改期 顺延一小时　剪辑 打到灯灭']
    yb = 1262
    for i, row in enumerate(rows):
        p.append(f'<g transform="translate(540 {yb + i * 24}) scale(.66 1)"><text x="0" y="0" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="{[20, 18, 16][i]}" letter-spacing="1" fill="#B8D2C4" opacity=".9">{row}</text></g>')
    p.append('<circle cx="70" cy="1320" r="6" fill="#C6EA3D"/><circle cx="80" cy="1326" r="4" fill="#C6EA3D"/>')
    p.append('<rect width="1080" height="1350" filter="url(#fg_f)" opacity=".08" style="mix-blend-mode:screen"/>')
    return page(''.join(p))
