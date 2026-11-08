"""霓虹抽帧质感（179 起）：横向拖影的光带、残影、倾斜画框、字幕式独白、数字时钟。"""
from lib import SANS, SERIF

DEFS = ('<filter id="smear_w" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="22 2"/></filter>'
        '<filter id="smear2_w" x="-30%" y="-10%" width="160%" height="120%"><feGaussianBlur stdDeviation="8 1"/></filter>'
        '<filter id="glow_w" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'
        '<filter id="gr_w"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="79"/><feColorMatrix type="saturate" values="0"/></filter>')


def subtitle(p, zh, en, y=1150):
    """电影字幕：中文一行（带黑描边阴影），英文小一号在下。"""
    for dx, dy in ((2, 2), (-1, 1)):
        p.append(f'<text x="{540 + dx}" y="{y + dy}" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="30" letter-spacing="2" fill="#000" opacity=".6">{zh}</text>')
    p.append(f'<text x="540" y="{y}" text-anchor="middle" font-family="{SANS}" font-weight="500" font-size="30" letter-spacing="2" fill="#F6F2D8">{zh}</text>')
    p.append(f'<text x="540" y="{y + 36}" text-anchor="middle" font-family="{SANS}" font-style="italic" font-size="18" letter-spacing="1" fill="#E8E4C8" opacity=".85">{en}</text>')


def clock(x, y, t, color='#3DFF9A'):
    return (f'<g filter="url(#glow_w)"><text x="{x}" y="{y}" font-family="{SANS}" font-weight="300" font-size="44" letter-spacing="6" fill="{color}">{t}</text></g>')


def grain(p):
    p.append('<rect width="1080" height="1350" filter="url(#gr_w)" opacity=".14" style="mix-blend-mode:screen"/>')
