"""瞬间（222 起）：借发布会邀请函的思路（一个主角做到极致、预告式短句、大留白、情绪先于信息），不借它的元素。
每张只画网球生活里一个心理瞬间；统一骨架：左上编号、主角、左下宋体短句 + 一句心里话 + 一行邀请、右下落款。"""
from lib import SERIF, SANS


def frame(p, no, title, sub, info, ink='#1E2A22', sub_c='#4A5A50', info_c='#6A7A70', mark_c=None, total=4):
    mark_c = mark_c or ink
    p.append(f'<text x="72" y="86" font-family="{SANS}" font-weight="500" font-size="18" letter-spacing="6" fill="{info_c}">南伴球 · 瞬间　{no:02d}' + (f' / {total:02d}' if total else '') + '</text>')
    p.append(f'<text x="68" y="1178" font-family="{SERIF}" font-weight="900" font-size="92" fill="{ink}">{title}</text>')
    p.append(f'<text x="74" y="1236" font-family="{SANS}" font-weight="500" font-size="30" fill="{sub_c}">{sub}</text>')
    p.append(f'<text x="74" y="1290" font-family="{SANS}" font-weight="500" font-size="20" letter-spacing="3" fill="{info_c}">{info}</text>')
    p.append(f'<g transform="translate(1008 1290)"><circle cx="-134" cy="-8" r="8" fill="#C6EA3D"/><circle cx="-120" cy="1" r="5" fill="#C6EA3D"/>'
             f'<text x="0" y="5" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="24" letter-spacing="6" fill="{mark_c}">南伴球</text></g>')


def racket(x, y, ang, frame='#F4F1E8', grip='#1E2A22', s=1.0, sid='r'):
    """一支球拍（拍柄底端在 x,y，ang 为偏离竖直的角度）：拍框、线床、拍喉、手胶。"""
    return (f'<g transform="translate({x} {y}) rotate({ang}) scale({s})">'
            f'<clipPath id="rs{sid}"><ellipse cx="0" cy="-330" rx="74" ry="98"/></clipPath>'
            f'<g clip-path="url(#rs{sid})" stroke="#E8E4D6" stroke-width="2.2" opacity=".9">'
            + ''.join(f'<path d="M{-70 + i * 14} -430 V-230"/>' for i in range(11))
            + ''.join(f'<path d="M-80 {-420 + i * 14} H80"/>' for i in range(14)) + '</g>'
            f'<ellipse cx="0" cy="-330" rx="80" ry="104" fill="none" stroke="{frame}" stroke-width="14"/>'
            f'<path d="M-30 -230 L-9 -150 M30 -230 L9 -150" stroke="{frame}" stroke-width="13" stroke-linecap="round"/>'
            f'<rect x="-11" y="-152" width="22" height="70" rx="6" fill="{frame}"/>'
            f'<rect x="-13" y="-84" width="26" height="84" rx="7" fill="{grip}"/>'
            + ''.join(f'<path d="M-13 {-80 + i * 12} l26 -6" stroke="#FFFFFF" stroke-width="1.4" opacity=".25"/>' for i in range(7))
            + '</g>')
