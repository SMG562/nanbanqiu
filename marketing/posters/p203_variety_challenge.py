from lib import *
from mao3 import figure3
from people import mark
from variety import INK, block, burst, badge, bubble, arrow, confetti

META = dict(
    id=203, slug='variety-challenge', title='捡球挑战赛', lines=['捡球挑战赛'],
    style=['综艺风', '游戏', '角色', '明亮'], tone='亮色', demo=False,
    concept='年轻综艺的游戏环节：蓝紫底，上面一个大大的倒计时牌「00:60」，「捡球挑战赛」立体厚字；球场上撒满了荧光球，小毛抱着一大捧球往筐里跑、小绒在旁边举着牌子喊加油；「规则：60 秒，谁捡得多谁请喝水」贴纸',
    use='社群活动 / 打完球的小游戏；热闹、好笑',
)


def svg():
    r = random.Random(203)
    p = ['<defs><linearGradient id="bg203" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6A5CFF"/><stop offset="1" stop-color="#3EC6FF"/></linearGradient></defs>',
         '<rect width="1080" height="1350" fill="url(#bg203)"/>']
    p.append(f'<rect x="300" y="90" width="480" height="150" rx="24" fill="{INK}" stroke="#FFFFFF" stroke-width="6"/>')                 # 倒计时牌
    p.append(f'<text x="540" y="200" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="110" letter-spacing="10" fill="#FF5A7A">00:60</text>')
    p.append(block('捡球', 160, 440, 200, side='#FFC93C', depth=16, rot=-5))
    p.append(block('挑战赛', 360, 640, 200, side='#FF5A7A', depth=16, rot=-5))
    p.append(badge(70, 680, 270, 66, '谁捡得多？', '#C6EA3D', color=INK, size=30, rot=-10))
    p.append(f'<path d="M-40 760 L1120 740 L1120 1350 L-40 1350Z" fill="#2F7A5E"/><path d="M60 1350 L250 790 L830 780 L1020 1350 M155 1070 L925 1060" stroke="#FFFFFF" stroke-width="6" fill="none"/>')
    for _ in range(40):                                                                                       # 满地的球
        x, y = r.uniform(80, 1000), r.uniform(800, 1250)
        rr = 8 + (y - 780) / 470 * 10
        p.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{rr:.0f}" fill="#C6EA3D" stroke="{INK}" stroke-width="2"/>')
    p.append(f'<path d="M820 1110 L960 1110 L940 1230 L840 1230Z" fill="#FFC93C" stroke="{INK}" stroke-width="4"/>')                     # 球筐
    gy = 1220
    p.append(figure3('m', 600, 0, 120, 'cheer', 'happy', gy=gy))
    p.append(figure3('r', 220, 0, 110, 'wave', 'cheer', gy=gy, char='rong'))
    p.append(bubble(60, 820, 260, 80, '加油加油！', 'left', size=32))
    p.append(f'<rect x="300" y="1270" width="480" height="56" rx="28" fill="#FFFFFF" stroke="{INK}" stroke-width="4"/>')
    p.append(f'<text x="540" y="1308" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="24" fill="{INK}">规则：60 秒，谁捡得多谁请喝水</text>')
    p.append(confetti(r, 40, (20, 20, 1060, 700)))
    p.append(mark(1050, 60, '#FFFFFF'))
    return page(''.join(p))
