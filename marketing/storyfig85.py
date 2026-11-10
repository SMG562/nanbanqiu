"""85 号的两个人：下班走来的女生、靠着路灯等她的男生（局部坐标，脚底 y=0，身高约 440）。"""
from storybook import *


def racket_in_bag(cx, cy, rot, bag, s=1.0):
    strings = ''.join(f'<path d="M{k} -34 V34" stroke="{OUT}" stroke-width=".9" opacity=".5"/>' for k in (-14, -7, 0, 7, 14)) + \
        ''.join(f'<path d="M-24 {k} H24" stroke="{OUT}" stroke-width=".9" opacity=".5"/>' for k in (-21, -10, 0, 10, 21))
    cid = f'rb{abs(hash((cx, cy, rot))) % 99999}'
    return (f'<g transform="translate({cx} {cy}) rotate({rot}) scale({s})">'
            f'<clipPath id="{cid}"><ellipse rx="21" ry="31"/></clipPath>'
            f'<ellipse rx="23" ry="33" fill="#F7F3E8" fill-opacity=".55" stroke="#2A2A2A" stroke-width="4.5"/>'
            f'<g clip-path="url(#{cid})">{strings}</g>'
            f'<path d="M-25 22 H25 L24 140 Q0 148 -24 140 Z" fill="{bag}" stroke="{OUT}" stroke-width="1.5"/>'
            f'<path d="M-24 34 H24" stroke="{OUT}" stroke-width="1.1" opacity=".5"/>'
            f'<path d="M-6 28 h12" stroke="#E8D9A8" stroke-width="3" stroke-linecap="round"/></g>')


def heels_pair():
    """一双黑色高跟鞋，手指勾着鞋后跟挂下来，鞋尖朝下（局部：挂点在 0,0）。"""
    up = 'M0 0 L2 18 C22 26 42 38 58 42 C62 38 60 32 54 30 C44 28 32 24 24 20 C16 14 8 6 0 0 Z'
    heel = 'M2 18 L4 42 L8 42 L10 22 Z'
    one = lambda dx, r: (f'<g transform="translate({dx} 0) rotate({r}) scale(.8)">'
                         f'<path d="{heel}" fill="#7E2030" stroke="{OUT}" stroke-width="1.2"/>'
                         f'<path d="{up}" fill="#7E2030" stroke="{OUT}" stroke-width="1.4"/>'
                         f'<path d="M4 6 C12 12 18 16 24 20" stroke="#8A6A5A" stroke-width="2" fill="none"/>'
                         f'<path d="M20 26 C32 32 42 36 52 38" stroke="#fff" stroke-width="1.6" opacity=".5" fill="none"/></g>')
    return one(-2, 62) + one(6, 48)


def woman_walk():
    hair = '#3B2620'
    coat, coat_d, shirt, pants = '#C99A64', '#A97A48', '#FBF6EC', '#2E3A4E'
    g = ''
    # 身后的球拍包（拍头从左肩后探出来）
    g += racket_in_bag(-34, -404, -32, '#2F5D4A')
    # 长发，被走路带起的风吹向身后
    g += (f'<path d="M-2 -428 C-40 -432 -58 -404 -60 -374 C-62 -346 -84 -322 -120 -316 C-102 -308 -86 -304 -76 -298 '
          f'C-98 -286 -116 -286 -134 -290 C-106 -270 -72 -272 -52 -292 C-40 -304 -30 -326 -22 -344 L22 -352 C36 -384 34 -416 -2 -428 Z" fill="{hair}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-58 -340 C-80 -326 -110 -330 -138 -322 M-50 -316 C-70 -300 -100 -300 -122 -302 M-40 -366 C-60 -360 -86 -364 -104 -352" stroke="{hair}" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
          f'<path d="M-44 -380 C-50 -350 -66 -330 -90 -320" stroke="#6E4A3A" stroke-width="1.4" fill="none" opacity=".7"/>')
    # 后腿：脚跟抬起
    g += limb((-6, -228), (-30, -112), (-62, -30), 30, 17, pants)
    g += f'<path d="M-70 -42 L-52 -30 L-56 -22 L-74 -34 Z" fill="#46536A" stroke="{OUT}" stroke-width="1.2"/>'
    g += f'<path d="M-72 -30 L-58 -20 L-62 -12 L-74 -22 Z" fill="{SKIN}"/>'
    g += sneaker(-58, -10, 30, 1)
    # 前腿
    g += limb((12, -228), (36, -120), (46, -30), 30, 17, pants)
    g += f'<path d="M36 -40 L56 -38 L56 -28 L36 -30 Z" fill="#46536A" stroke="{OUT}" stroke-width="1.2"/>'
    g += f'<path d="M38 -28 L54 -27 L54 -18 L38 -18 Z" fill="{SKIN}"/>'
    g += sneaker(56, -10, -4, 1)
    # 风衣后片，往后飘
    g += (f'<path d="M-30 -340 C-36 -300 -46 -240 -80 -150 C-60 -146 -30 -144 -6 -150 L4 -300 L8 -338 Z" fill="{coat}" stroke="{OUT}" stroke-width="1.5"/>'
          f'<path d="M-30 -260 C-40 -220 -52 -190 -66 -156" stroke="{coat_d}" stroke-width="2" fill="none"/>')
    # 后面的手臂：往后摆，两根手指勾着高跟鞋（画在风衣后片前面，才看得见）
    g += limb((-24, -330), (-58, -272), (-92, -222), 22, 15, coat_d)
    g += f'<g transform="translate(-96 -206)">{heels_pair()}</g>'
    g += hand(-93, -218, 30, 'hook')
    # 衬衫 + 风衣前片
    g += f'<path d="M-14 -340 L24 -340 L30 -240 L-8 -240 Z" fill="{shirt}" stroke="{OUT}" stroke-width="1.3"/>'
    g += (f'<path d="M24 -342 L40 -330 C44 -280 50 -220 58 -158 C46 -152 34 -152 24 -154 L18 -260 Z" fill="{coat}" stroke="{OUT}" stroke-width="1.5"/>'
          f'<path d="M24 -342 L12 -312 L22 -300" fill="{coat_d}" stroke="{OUT}" stroke-width="1.2"/>'
          f'<path d="M-14 -342 L-6 -310 L-16 -300" fill="{coat_d}" stroke="{OUT}" stroke-width="1.2"/>'
          f'<path d="M-8 -266 C-24 -262 -36 -258 -50 -250 C-46 -246 -44 -244 -46 -238 C-34 -246 -22 -252 -8 -256 Z" fill="{coat_d}" stroke="{OUT}" stroke-width="1.1"/>')
    # 球拍包的带子，斜过胸前
    g += f'<path d="M28 -336 L-10 -236" stroke="#22382E" stroke-width="6" stroke-linecap="round"/>'
    # 前面的手臂：往前摆
    g += limb((30, -330), (54, -276), (78, -236), 22, 15, coat)
    g += f'<path d="M70 -246 L86 -232" stroke="{OUT}" stroke-width="1.2"/>'
    g += hand(81, -232, -40, 'open')
    g += f'<rect x="72" y="-246" width="8" height="5" rx="1" fill="#D8C08A" transform="rotate(-40 76 -243)"/>'
    # 脖子 + 头
    g += f'<path d="M-2 -362 L12 -362 L14 -338 L0 -338 Z" fill="{SKIN}" stroke="{OUT}" stroke-width="1.2"/>'
    g += f'<ellipse cx="6" cy="-390" rx="29" ry="33" fill="{SKIN}" stroke="{OUT}" stroke-width="1.4"/>'
    g += f'<ellipse cx="-14" cy="-384" rx="5" ry="7" fill="{SKIN}" stroke="{OUT}" stroke-width="1.1"/><circle cx="-15" cy="-375" r="2.4" fill="#D8B45A"/>'
    # 刘海往后梳，几缕碎发
    g += (f'<path d="M-24 -396 C-26 -430 22 -436 34 -404 C24 -412 10 -414 0 -406 C-8 -400 -16 -396 -24 -396 Z" fill="{hair}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-6 -420 C-20 -428 -36 -424 -48 -412 M8 -424 C-6 -440 -26 -440 -40 -432" stroke="{hair}" stroke-width="2" fill="none" stroke-linecap="round"/>')
    # 脸：笑眯眯的眼睛、腮红、小鼻子、嘴角上扬
    g += (f'<path d="M6 -390 Q11 -395 16 -390 M24 -390 Q28 -394 32 -390" stroke="{OUT}" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
          f'<ellipse cx="10" cy="-377" rx="7" ry="4" fill="#F09A92" opacity=".55"/><ellipse cx="31" cy="-377" rx="5" ry="3.6" fill="#F09A92" opacity=".55"/>'
          f'<path d="M35 -386 C37 -382 37 -380 34 -379" stroke="{OUT}" stroke-width="1.3" fill="none"/>'
          f'<path d="M18 -369 Q24 -365 29 -370" stroke="#B5524A" stroke-width="2" fill="none" stroke-linecap="round"/>')
    return g


def man_lean():
    hair, sweater, sw_d, pants, scarf = '#241A16', '#EFE3C8', '#D9C9A6', '#5B6472', '#2F7552'
    g = ''
    g += racket_in_bag(40, -404, 30, '#7A4A3A')
    # 围巾往身后飘的那一截
    g += f'<path d="M14 -352 C40 -356 66 -346 92 -356 C84 -340 96 -332 104 -330 C80 -324 50 -330 20 -334 Z" fill="{scarf}" stroke="{OUT}" stroke-width="1.3"/>'
    # 支撑腿（右）+ 交叉腿（左，脚尖点地）
    g += limb((12, -228), (16, -120), (18, -30), 32, 18, pants)
    g += sneaker(12, -10, 0, -1, high=True, accent='#B23A3A')
    g += limb((-14, -228), (-10, -116), (50, -40), 32, 18, pants)
    g += sneaker(56, -18, -34, -1, high=True, accent='#B23A3A')
    # 毛衣
    g += (f'<path d="M-38 -344 C-14 -352 14 -352 38 -344 L42 -240 C14 -232 -14 -232 -42 -240 Z" fill="{sweater}" stroke="{OUT}" stroke-width="1.5"/>'
          f'<path d="M-42 -244 C-14 -236 14 -236 42 -244 L42 -228 C14 -220 -14 -220 -42 -228 Z" fill="{sw_d}" stroke="{OUT}" stroke-width="1.3"/>'
          + ''.join(f'<path d="M{x} -330 V-250" stroke="{sw_d}" stroke-width="1.6" opacity=".8"/>' for x in range(-28, 34, 10)))
    # 右手插兜
    g += limb((34, -332), (52, -280), (34, -244), 24, 18, sweater)
    g += f'<path d="M22 -248 L40 -238" stroke="{OUT}" stroke-width="1.6"/>'
    # 左手举着一罐新球
    g += limb((-34, -332), (-74, -360), (-62, -430), 24, 17, sweater)
    can = (f'<rect x="-82" y="-532" width="40" height="96" rx="9" fill="#EAF2F0" fill-opacity=".8" stroke="{OUT}" stroke-width="1.5"/>'
           + ''.join(f'<circle cx="-62" cy="{y}" r="16" fill="#C6EA3D" stroke="#9DBA2A" stroke-width="1"/><path d="M-76 {y - 6} Q-62 {y + 4} -48 {y - 6}" stroke="#fff" stroke-width="2" fill="none"/>' for y in (-512, -484, -456))
           + f'<rect x="-85" y="-540" width="46" height="12" rx="4" fill="#F4F1E6" stroke="{OUT}" stroke-width="1.4"/>')
    g += can + hand(-62, -436, 180, 'hold')
    # 脖子、头
    g += f'<path d="M-8 -364 L8 -364 L8 -340 L-8 -340 Z" fill="{SKIN}" stroke="{OUT}" stroke-width="1.2"/>'
    g += f'<ellipse cx="-4" cy="-392" rx="30" ry="33" fill="{SKIN}" stroke="{OUT}" stroke-width="1.4"/>'
    g += f'<ellipse cx="22" cy="-388" rx="5" ry="7" fill="{SKIN}" stroke="{OUT}" stroke-width="1.1"/>'
    g += (f'<path d="M-32 -396 C-38 -432 0 -444 26 -428 C36 -420 36 -404 30 -392 C26 -404 16 -410 6 -408 C-4 -416 -20 -410 -32 -396 Z" fill="{hair}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-6 -432 C-10 -446 0 -452 6 -446" stroke="{hair}" stroke-width="2.4" fill="none" stroke-linecap="round"/>')
    # 围巾绕脖子 + 垂在胸前的一截
    g += (f'<path d="M-24 -358 C-8 -350 12 -350 26 -358 L26 -340 C10 -334 -10 -334 -24 -340 Z" fill="{scarf}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-14 -344 L-22 -284 L-6 -282 L0 -342 Z" fill="{scarf}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-22 -286 l-2 8 M-17 -285 l-1 8 M-12 -284 l0 8" stroke="{scarf}" stroke-width="2"/>')
    # 脸：朝左喊她
    g += (f'<circle cx="-20" cy="-392" r="3.6" fill="{OUT}"/><circle cx="-2" cy="-392" r="3.6" fill="{OUT}"/>'
          f'<path d="M-25 -402 Q-20 -405 -15 -402 M-6 -402 Q-1 -405 4 -402" stroke="{OUT}" stroke-width="1.5" fill="none"/>'
          f'<ellipse cx="-27" cy="-378" rx="5" ry="3.5" fill="#F09A92" opacity=".5"/><ellipse cx="6" cy="-378" rx="6" ry="3.6" fill="#F09A92" opacity=".5"/>'
          f'<path d="M-30 -386 C-34 -382 -33 -379 -29 -378" stroke="{OUT}" stroke-width="1.3" fill="none"/>'
          f'<ellipse cx="-14" cy="-368" rx="5" ry="6" fill="#8C3A34"/>')
    return g
