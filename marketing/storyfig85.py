"""85 号的两个人：下班走来的女生、靠着路灯等她的男生（局部坐标，脚底 y=0，身高约 440）。"""
from storybook import *
from storybook import blush, gloss


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
    hair = '#4A2E22'
    coat, coat_d, shirt, pants = '#C99A64', '#A97A48', '#FBF6EC', '#2E3A4E'
    g = ''
    # 长发自然垂到背后，发尾随走路轻轻往后摆
    g += (f'<path d="M-2 -428 C-34 -430 -44 -402 -42 -372 C-41 -348 -46 -322 -52 -298 C-44 -290 -32 -290 -24 -296 C-20 -290 -10 -290 -4 -296 L22 -312 C30 -334 34 -362 34 -390 C34 -418 18 -430 -2 -428 Z" fill="{hair}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-30 -396 C-34 -360 -36 -330 -46 -302 M-18 -380 C-20 -350 -22 -322 -26 -300" stroke="#7A5240" stroke-width="1.4" fill="none" opacity=".6"/>')
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
    g += (f'<path d="M-30 -340 C-36 -300 -44 -240 -62 -152 C-46 -148 -24 -146 -6 -150 L4 -300 L8 -338 Z" fill="{coat}" stroke="{OUT}" stroke-width="1.5"/>'
          f'<path d="M-30 -260 C-38 -220 -46 -190 -54 -156" stroke="{coat_d}" stroke-width="2" fill="none"/>')
    # 后面的手臂：自然往后摆
    g += limb((-24, -330), (-46, -276), (-58, -222), 22, 15, coat_d)
    g += hand(-58, -218, 14, 'open', mirror=-1)
    # 衬衫 + 风衣前片
    g += f'<path d="M-14 -340 L24 -340 L30 -240 L-8 -240 Z" fill="{shirt}" stroke="{OUT}" stroke-width="1.3"/>'
    g += (f'<path d="M24 -342 L40 -330 C44 -280 50 -220 58 -158 C46 -152 34 -152 24 -154 L18 -260 Z" fill="{coat}" stroke="{OUT}" stroke-width="1.5"/>'
          f'<path d="M24 -342 L12 -312 L22 -300" fill="{coat_d}" stroke="{OUT}" stroke-width="1.2"/>'
          f'<path d="M-14 -342 L-6 -310 L-16 -300" fill="{coat_d}" stroke="{OUT}" stroke-width="1.2"/>'
          f'<path d="M-8 -266 C-24 -262 -36 -258 -50 -250 C-46 -246 -44 -244 -46 -238 C-34 -246 -22 -252 -8 -256 Z" fill="{coat_d}" stroke="{OUT}" stroke-width="1.1"/>')
    # 斜挎的小皮包
    g += (f'<path d="M26 -338 L-24 -236" stroke="#6B3E26" stroke-width="4" stroke-linecap="round"/>'
          f'<path d="M-50 -240 H-6 Q-2 -240 -2 -236 V-206 Q-2 -200 -8 -200 H-48 Q-54 -200 -54 -206 V-236 Q-54 -240 -50 -240 Z" fill="#8A5234" stroke="{OUT}" stroke-width="1.4"/>'
          f'<path d="M-54 -236 Q-28 -222 -2 -236 V-226 Q-28 -214 -54 -226 Z" fill="#74432A" stroke="{OUT}" stroke-width="1.1"/>'
          f'<circle cx="-28" cy="-219" r="2.4" fill="#D8B45A"/>')
    # 前面的手臂：往前摆
    g += limb((30, -330), (54, -276), (78, -236), 22, 15, coat)
    g += f'<path d="M70 -246 L86 -232" stroke="{OUT}" stroke-width="1.2"/>'
    g += hand(81, -232, -40, 'open')
    g += f'<rect x="72" y="-246" width="8" height="5" rx="1" fill="#D8C08A" transform="rotate(-40 76 -243)"/>'
    # 脖子 + 头
    g += f'<path d="M-2 -362 L12 -362 L14 -338 L0 -338 Z" fill="{SKIN}" stroke="{OUT}" stroke-width="1.2"/>'
    g += f'<ellipse cx="6" cy="-390" rx="29" ry="33" fill="{SKIN}" stroke="{OUT}" stroke-width="1.4"/>'
    g += f'<ellipse cx="-14" cy="-384" rx="5" ry="7" fill="{SKIN}" stroke="{OUT}" stroke-width="1.1"/><circle cx="-15" cy="-375" r="2.4" fill="#D8B45A"/>'
    # 侧分刘海 + 一缕头发搭在前肩
    g += (f'<path d="M-24 -394 C-28 -430 20 -438 34 -404 C28 -410 20 -412 14 -410 C8 -414 -2 -412 -8 -404 C-14 -400 -20 -396 -24 -394 Z" fill="{hair}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M33 -404 C40 -388 40 -364 34 -340 C32 -326 36 -314 40 -306 C30 -312 26 -326 29 -342 C32 -362 33 -384 30 -400 Z" fill="{hair}" stroke="{OUT}" stroke-width="1.1"/>'
          + gloss('M-12 -418 Q6 -428 24 -418', '#A8785E'))
    # 脸：看着他，笑
    g += (f'<ellipse cx="5" cy="-389" rx="3.4" ry="4.4" fill="{OUT}"/><ellipse cx="21" cy="-389" rx="3" ry="4.2" fill="{OUT}"/>'
          f'<circle cx="6.2" cy="-390.8" r="1.3" fill="#fff"/><circle cx="22" cy="-390.8" r="1.2" fill="#fff"/>'
          f'<path d="M0 -399 Q5 -402 10 -400 M17 -400 Q21 -402 25 -399" stroke="#5A3A30" stroke-width="1.4" fill="none" stroke-linecap="round"/>'
          + blush(1, -377, 9, 5.4, .65) + blush(25, -377, 6.5, 4.6, .65)
          + f'<path d="M29 -386 C31 -382 31 -380 28 -379" stroke="{OUT}" stroke-width="1.3" fill="none"/>'
          f'<path d="M10 -372 Q17 -370 23 -373 Q21 -364 16 -364 Q11 -365 10 -372 Z" fill="#B5524A"/>'
          f'<path d="M11.6 -371.4 Q17 -370.2 21.6 -372.2" stroke="#fff" stroke-width="1.2"/>')
    return g


def man_lean():
    hair, sweater, sw_d, pants, scarf = '#4A3226', '#F4F2EC', '#D8D4CA', '#5B6472', '#2F7552'
    g = ''
    g += f'<path d="M-30 -350 C-36 -372 34 -372 30 -350 Z" fill="{sw_d}" stroke="{OUT}" stroke-width="1.3"/>'  # 帽兜
    # 围巾往身后飘的那一截
    g += f'<path d="M14 -352 C40 -356 66 -346 92 -356 C84 -340 96 -332 104 -330 C80 -324 50 -330 20 -334 Z" fill="{scarf}" stroke="{OUT}" stroke-width="1.3"/>'
    # 支撑腿（右）+ 交叉腿（左，脚尖点地）
    g += limb((12, -228), (16, -120), (18, -30), 32, 18, pants)
    g += sneaker(12, -10, 0, -1, high=False, accent='#C8C4BA')
    g += limb((-14, -228), (-10, -116), (50, -40), 32, 18, pants)
    g += sneaker(56, -18, -34, -1, high=False, accent='#C8C4BA')
    # 毛衣
    g += (f'<path d="M-38 -344 C-14 -352 14 -352 38 -344 L42 -240 C14 -232 -14 -232 -42 -240 Z" fill="{sweater}" stroke="{OUT}" stroke-width="1.5"/>'
          f'<path d="M-42 -244 C-14 -236 14 -236 42 -244 L42 -228 C14 -220 -14 -220 -42 -228 Z" fill="{sw_d}" stroke="{OUT}" stroke-width="1.3"/>'
          + f'<path d="M2 -340 V-236" stroke="#A8A49A" stroke-width="1.6"/><path d="M-30 -270 L-12 -268 M14 -268 L32 -270" stroke="#C8C4BA" stroke-width="1.4"/>')
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
    g += (f'<path d="M-32 -396 C-38 -434 0 -446 26 -430 C36 -420 36 -404 30 -392 C26 -404 16 -410 6 -408 C-4 -414 -20 -408 -32 -396 Z" fill="{hair}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-2 -434 C-6 -444 2 -450 8 -446" stroke="{hair}" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
          + gloss('M-20 -424 Q-4 -436 14 -430', '#5A5A66'))
    # 围巾绕脖子 + 垂在胸前的一截
    g += (f'<path d="M-24 -358 C-8 -350 12 -350 26 -358 L26 -340 C10 -334 -10 -334 -24 -340 Z" fill="{scarf}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-14 -344 L-22 -284 L-6 -282 L0 -342 Z" fill="{scarf}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-22 -286 l-2 8 M-17 -285 l-1 8 M-12 -284 l0 8" stroke="{scarf}" stroke-width="2"/>')
    # 脸：朝她笑着喊
    g += (f'<path d="M-25 -392 Q-20 -397 -15 -392 M-7 -392 Q-2 -397 3 -392" stroke="{OUT}" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
          f'<path d="M-26 -402 Q-20 -405 -14 -403 M-7 -403 Q-1 -405 5 -402" stroke="#3A2620" stroke-width="2" fill="none" stroke-linecap="round"/>'
          + blush(-27, -380, 6.5, 4.4, .55) + blush(6, -380, 8, 4.8, .55)
          + f'<path d="M-30 -386 C-34 -382 -33 -379 -29 -378" stroke="{OUT}" stroke-width="1.3" fill="none"/>'
          f'<path d="M-23 -372 Q-13 -369 -4 -372 Q-7 -361 -14 -361 Q-21 -362 -23 -372 Z" fill="#8C3A34"/>'
          f'<path d="M-21 -371 Q-13 -369 -6 -371" stroke="#fff" stroke-width="1.8"/>')
    return g
