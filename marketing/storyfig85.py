"""85 号的两个人：下班走来的女生、靠着路灯等她的男生（局部坐标，脚底 y=0，身高约 440）。"""
from storybook import *
from storyface import head


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
    hb, hf = head('f', 'long', 'smile', look=(1, 0))
    g += f'<g transform="translate(6 -392)">{hb}</g>'
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
    g += f'<g transform="translate(6 -392)">{hf}</g>'
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
    hb, hf = head('m', 'short', 'call', look=(1, 0), mirror=-1, hc='#1E1A1D', hl='#5A6680')
    g += f'<g transform="translate(-4 -392)">{hf}</g>'
    # 围巾绕脖子 + 垂在胸前的一截
    g += (f'<path d="M-24 -358 C-8 -350 12 -350 26 -358 L26 -340 C10 -334 -10 -334 -24 -340 Z" fill="{scarf}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-14 -344 L-22 -284 L-6 -282 L0 -342 Z" fill="{scarf}" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-22 -286 l-2 8 M-17 -285 l-1 8 M-12 -284 l0 8" stroke="{scarf}" stroke-width="2"/>')
    return g
