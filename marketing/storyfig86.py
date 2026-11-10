"""86 号的两个人：撑伞（伞歪向她、自己半边肩膀湿了）的男生，伸手出伞外试雨的女生。"""
from storybook import *
from storyfig85 import racket_in_bag
from storyface import head


def umbrella_man():
    hair, jacket, jk_d, wet, pants = '#241A16', '#A9BCAF', '#8EA396', '#6F857A', '#3C4A5C'
    g = racket_in_bag(-40, -404, -28, '#7A4A3A')
    # 腿
    g += limb((-12, -228), (-16, -120), (-18, -32), 32, 18, pants)
    g += limb((14, -228), (20, -120), (26, -32), 32, 18, pants)
    g += ''.join(f'<path d="M{x - 12} -44 L{x + 12} -44 L{x + 12} -32 L{x - 12} -32 Z" fill="#53627A" stroke="{OUT}" stroke-width="1.2"/>'
                 f'<rect x="{x - 9}" y="-32" width="18" height="12" fill="{SKIN}"/>' for x in (-18, 26))
    g += sneaker(-14, -10, 0, 1, accent='#2F7552') + sneaker(34, -10, 0, 1, accent='#2F7552')
    # 外套；左肩被雨打湿（伞都歪给她了）
    g += (f'<path d="M-40 -344 C-14 -352 14 -352 40 -344 L44 -226 C14 -218 -14 -218 -44 -226 Z" fill="{jacket}" stroke="{OUT}" stroke-width="1.5"/>'
          f'<path d="M0 -346 V-222" stroke="{jk_d}" stroke-width="2"/><path d="M-30 -270 h18 M14 -270 h18" stroke="{jk_d}" stroke-width="2"/>')
    g += f'<g fill="{wet}" opacity=".8"><ellipse cx="-30" cy="-334" rx="14" ry="9"/><ellipse cx="-38" cy="-312" rx="7" ry="10"/><circle cx="-22" cy="-318" r="4"/><circle cx="-44" cy="-292" r="3.5"/></g>'
    # 左手自然垂着
    g += limb((-36, -334), (-54, -284), (-50, -232), 22, 15, jacket)
    g += f'<g fill="{wet}" opacity=".8"><ellipse cx="-44" cy="-318" rx="8" ry="11"/></g>'
    g += hand(-50, -230, 4, 'open', mirror=-1)
    # 毛巾挂在脖子上
    g += (f'<path d="M-24 -352 C-10 -342 10 -342 24 -352 L28 -336 C10 -326 -10 -326 -28 -336 Z" fill="#FFFFFF" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-24 -340 L-30 -276 L-14 -274 L-10 -336 Z M12 -336 L16 -274 L30 -276 L26 -340 Z" fill="#FFFFFF" stroke="{OUT}" stroke-width="1.3"/>'
          f'<path d="M-29 -286 L-15 -284 M-29 -281 L-14 -279 M15 -284 L29 -286 M15 -279 L30 -281" stroke="#2F7552" stroke-width="2"/>')
    # 伞：伞柄在右手里，伞面整个歪向右边（她那边）
    px, py = 70, -400
    tx, ty = 100, -560
    can = f'<g transform="rotate(9 {tx} {ty})">'
    canopy = (f'M{tx - 240} {ty + 90} Q{tx - 220} {ty - 16} {tx} {ty - 22} Q{tx + 220} {ty - 16} {tx + 240} {ty + 90} '
              + ' '.join(f'Q{tx + 240 - 40 - 80*i} {ty + 66} {tx + 240 - 80*(i + 1)} {ty + 90}' for i in range(6)) + ' Z')
    can += f'<path d="{canopy}" fill="#1E5A40" stroke="{OUT}" stroke-width="1.6"/>'
    can += ''.join(f'<path d="M{tx} {ty - 22} Q{tx + k*0.55} {ty + 30} {tx + k} {ty + 88}" stroke="#2F7552" stroke-width="2.4" fill="none"/>' for k in (-160, -80, 80, 160))
    can += ''.join(f'<path d="M{tx + 240 - 80*i} {ty + 90} l0 6" stroke="{OUT}" stroke-width="2.4" stroke-linecap="round"/>' for i in range(7))
    can += f'<path d="M{tx} {ty - 22} V{ty - 46}" stroke="{OUT}" stroke-width="4" stroke-linecap="round"/>'
    can += ''.join(f'<path d="M{tx + x} {ty + y} q3 5 0 8 q-3 -3 0 -8Z" fill="#CFE3EA" stroke="{OUT}" stroke-width=".9"/>' for x, y in ((-150, 4), (40, -10), (170, 20), (-60, -8)))
    can += '</g>'
    g += can
    g += f'<path d="M{px} {py + 40} L{tx} {ty}" stroke="{OUT}" stroke-width="4.5" stroke-linecap="round"/>'
    g += f'<path d="M{px - 2} {py + 40} C{px - 5} {py + 62} {px - 26} {py + 62} {px - 26} {py + 46}" stroke="#7A4A3A" stroke-width="7" fill="none" stroke-linecap="round"/>'
    # 右臂举着伞柄
    g += limb((34, -334), (74, -330), (70, -392), 22, 15, jacket)
    g += hand(71, -398, 190, 'hold')
    hb, hf = head('m', 'short', 'smile', look=(1.5, 1.2), hc='#1E1A1D', hl='#5A6680')
    g += f'<g transform="translate(2 -392)">{hb}{hf}</g>'
    return g


def rain_girl():
    hair, card, card_d, skirt = '#3A2520', '#F6EEDC', '#E2D6BC', '#E98C78'
    g = racket_in_bag(-38, -400, -26, '#2F4A6A') + '<!--HB-->'
    # 腿、白袜、玛丽珍鞋
    g += limb((-10, -196), (-12, -100), (-14, -26), 24, 13, SKIN)
    g += limb((12, -196), (18, -100), (22, -26), 24, 13, SKIN)
    for x in (-14, 22):
        g += (f'<path d="M{x - 8} -46 H{x + 8} L{x + 8} -14 H{x - 8} Z" fill="#FFFFFF" stroke="{OUT}" stroke-width="1.2"/>'
              f'<path d="M{x - 8} -40 H{x + 8} M{x - 8} -36 H{x + 8}" stroke="{OUT}" stroke-width=".8" opacity=".4"/>')
    g += maryjane(-10, -8, 0, 1) + maryjane(28, -8, 0, 1)
    # 百褶裙，被风带得往右摆
    hem = [(-48, -146), (-28, -140), (-8, -146), (12, -138), (32, -144), (52, -136), (72, -142)]
    g += (f'<path d="M-28 -262 L28 -262 C40 -222 56 -180 72 -142 ' + ' '.join(f'L{x} {y}' for x, y in hem[::-1][1:]) +
          f' C-42 -180 -34 -222 -28 -262 Z" fill="{skirt}" stroke="{OUT}" stroke-width="1.5"/>')
    g += ''.join(f'<path d="M{-20 + i*8} -260 L{x} {y + 2}" stroke="#FFF4EC" stroke-width="2.2" opacity=".85"/>' for i, (x, y) in enumerate(hem[1:-1]))
    g += f'<path d="M-30 -262 H30 V-252 H-30 Z" fill="#D9705E" stroke="{OUT}" stroke-width="1.2"/>'
    # 开衫 + 白衬衫小圆领
    g += (f'<path d="M-30 -346 C-12 -352 12 -352 30 -346 L34 -254 L-34 -254 Z" fill="{card}" stroke="{OUT}" stroke-width="1.5"/>'
          f'<path d="M0 -344 V-254" stroke="{card_d}" stroke-width="2"/>'
          + ''.join(f'<circle cx="4" cy="{y}" r="2.6" fill="#B07A50"/>' for y in (-326, -302, -278))
          + f'<path d="M-14 -348 Q-8 -334 0 -340 Q8 -334 14 -348" fill="#FFFFFF" stroke="{OUT}" stroke-width="1.2"/>')
    # 左手抓着球拍包的带子
    g += f'<path d="M-22 -346 L-30 -250" stroke="#22303F" stroke-width="7" stroke-linecap="round"/>'
    g += limb((-28, -336), (-44, -296), (-26, -292), 20, 14, card)
    g += hand(-24, -296, -100, 'hold')
    # 右手伸到伞外，掌心朝上接雨
    g += limb((28, -336), (80, -324), (124, -318), 20, 13, card)
    g += hand(126, -320, 0, 'palm')
    hb, hf = head('f', 'bob', 'o', look=(0.5, -2.2), tilt=-12, hc='#2E1E1A', hl='#8A6050')
    g = g.replace('<!--HB-->', f'<g transform="translate(4 -390)">{hb}</g>')
    g += f'<g transform="translate(4 -390)">{hf}</g>'
    return g
