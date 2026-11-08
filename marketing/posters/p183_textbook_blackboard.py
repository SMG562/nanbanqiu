from lib import *
from textbook import DEFS, PAPER, INK, RED, GREEN, finish, slogan

META = dict(
    id=183, slug='textbook-blackboard', title='黑板报', lines=['好好打球，', '天天向上。'],
    style=['课本插画', '年代感', '黑板报', '南伴绿'], tone='深色', demo=False,
    concept='一期南伴球的黑板报：木框里一块南伴绿的黑板，上面一排红底大字「好好打球　天天向上」；下面用彩色粉笔分了三栏——「本周球局」写着时间和场地、「打球小常识」写平分后要连赢两分、「好人好事」表扬总帮大家捡球的小林；粉笔画的网球拍、太阳和小花点缀，角上挂着一张旧照片和一个铁皮哨子',
    use='年代感 / 社群公告的另一种写法；回忆共鸣',
)


def chalk(t, x, y, size=26, color='#F4F2EA', anchor='start', w=500):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{SERIF}" font-weight="{w}" font-size="{size}" letter-spacing="2" fill="{color}" filter="url(#ch_b)">{t}</text>'


def svg():
    p = [f'<defs>{DEFS}<filter id="ch_b" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="5" result="n"/>'
         '<feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -.9 1.35" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>'
         '<filter id="bd_b"><feTurbulence type="fractalNoise" baseFrequency=".012 .04" numOctaves="3" seed="8"/><feColorMatrix values="0 0 0 0 .9  0 0 0 0 .95  0 0 0 0 .9  0 0 0 .1 0"/></filter></defs>',
         f'<rect width="1080" height="1350" fill="#6E5236"/>']
    p.append(f'<rect x="40" y="40" width="1000" height="1270" fill="{GREEN}" stroke="#4A3220" stroke-width="16"/>')
    p.append('<rect x="40" y="40" width="1000" height="1270" fill="#0B3B2A" opacity=".45"/>')
    p.append('<rect x="40" y="40" width="1000" height="1270" filter="url(#bd_b)"/>')
    p.append(chalk('南 伴 球 黑 板 报', 540, 128, 46, '#FFE89A', 'middle', 900))
    p.append(chalk('第 37 期　·　墨尔本　·　编辑：周阿姨', 540, 170, 20, '#CFE6DA', 'middle'))
    slogan(p, '好好打球', 92, 210, 92, 12)
    slogan(p, '天天向上', 554, 210, 92, 12)
    # 三栏
    for x in (360, 720):
        p.append(f'<line x1="{x}" y1="380" x2="{x}" y2="1180" stroke="#F4F2EA" stroke-width="3" stroke-dasharray="10 12" opacity=".6" filter="url(#ch_b)"/>')
    p.append(chalk('本周球局', 80, 430, 34, '#FFB8A8', w=900))
    for i, t in enumerate(['周三 晚七点', '三号场 · 双打', '还差两个人', '', '周六 上午九点', '公园球场 · 新手局', '老陈带球']):
        p.append(chalk(t, 80, 486 + i * 44, 24))
    p.append(chalk('打球小常识', 400, 430, 34, '#A8E0FF', w=900))
    for i, t in enumerate(['四十比四十，', '叫「平分」。', '平分之后，', '要连赢两分，', '才算赢下这一局。', '', '记分：15、30、40'], ):
        p.append(chalk(t, 400, 486 + i * 44, 24))
    p.append(chalk('好人好事', 760, 430, 34, '#FFE89A', w=900))
    for i, t in enumerate(['表扬小林同志：', '每次打完球，', '都帮大家把球', '一颗一颗捡回筐里。', '', '本周捡球：', '一百二十七颗。']):
        p.append(chalk(t, 760, 486 + i * 44, 24))
    # 粉笔画
    p.append(f'<g filter="url(#ch_b)" stroke="#F4F2EA" stroke-width="5" fill="none"><ellipse cx="200" cy="1040" rx="50" ry="70"/><line x1="200" y1="1110" x2="200" y2="1180"/>'
             '<circle cx="540" cy="1060" r="44" stroke="#FFE89A"/>' + ''.join(f'<line x1="{540 + 56*math.cos(a):.0f}" y1="{1060 + 56*math.sin(a):.0f}" x2="{540 + 76*math.cos(a):.0f}" y2="{1060 + 76*math.sin(a):.0f}" stroke="#FFE89A"/>' for a in [k * math.pi / 6 for k in range(12)])
             + '<circle cx="880" cy="1060" r="14" stroke="#FFB8C8"/>' + ''.join(f'<circle cx="{880 + 26*math.cos(a):.0f}" cy="{1060 + 26*math.sin(a):.0f}" r="13" stroke="#FFB8C8"/>' for a in [k * math.pi * 2 / 5 for k in range(5)]) + '</g>')
    p.append('<circle cx="268" cy="1000" r="16" fill="#C6EA3D"/>')
    # 角上的旧照片、哨子、粉笔头
    p.append(f'<g transform="rotate(-6 960 120)"><rect x="880" y="66" width="120" height="96" fill="#F4EED8" stroke="{INK}" stroke-width="2"/><rect x="890" y="76" width="100" height="70" fill="#8A9A8A"/>'
             '<rect x="890" y="120" width="100" height="26" fill="#5A7A5A"/><circle cx="930" cy="104" r="6" fill="#4A4A4A"/><circle cx="954" cy="106" r="6" fill="#4A4A4A"/></g>')
    p.append('<rect x="60" y="1286" width="40" height="10" rx="3" fill="#F4F2EA"/><rect x="110" y="1288" width="30" height="8" rx="3" fill="#FFB8A8"/><rect x="150" y="1288" width="34" height="8" rx="3" fill="#A8E0FF"/>')
    p.append(chalk('南伴球', 1000, 1250, 26, '#F4F2EA', 'end', 900))
    p.append('<circle cx="884" cy="1242" r="8" fill="#C6EA3D"/><circle cx="896" cy="1250" r="5" fill="#C6EA3D"/>')
    p.append('<rect width="1080" height="1350" fill="url(#age_t)" opacity=".6"/>')
    return page(''.join(p))
