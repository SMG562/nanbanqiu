"""日本电影海报质感（171 起）：过曝的柔光、胶片颗粒、漏光、竖排宋体片名、底部演职员表小字。"""
from lib import SERIF, SANS

DEFS = ('<filter id="fg_f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".95" numOctaves="2" seed="71"/><feColorMatrix type="saturate" values="0"/></filter>'
        '<radialGradient id="leak_f" cx="100%" cy="20%" r="60%"><stop offset="0" stop-color="#FFB27A" stop-opacity=".45"/><stop offset="1" stop-color="#FFB27A" stop-opacity="0"/></radialGradient>'
        '<radialGradient id="vig_f" cx="50%" cy="45%" r="75%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>')


def finish(p, leak=True):
    """收尾：漏光 + 暗角 + 颗粒 + 一层发灰的胶片褪色。"""
    if leak:
        p.append('<rect width="1080" height="1350" fill="url(#leak_f)"/>')
    p.append('<rect width="1080" height="1350" fill="#F4EFE4" opacity=".1"/>')
    p.append('<rect width="1080" height="1350" fill="url(#vig_f)"/>')
    p.append('<rect width="1080" height="1350" filter="url(#fg_f)" opacity=".13" style="mix-blend-mode:multiply"/>')


def vtitle(text, x, y, size=78, color='#2A2E2C', gap=1.18):
    return ''.join(f'<text x="{x}" y="{y + i * size * gap:.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="300" font-size="{size}" fill="{color}">{ch}</text>' for i, ch in enumerate(text))


def vline(text, x, y, size=24, color='#4A504C'):
    return ''.join(f'<text x="{x}" y="{y + i * size * 1.5:.0f}" text-anchor="middle" font-family="{SERIF}" font-weight="400" font-size="{size}" fill="{color}">{ch}</text>' for i, ch in enumerate(text) if ch not in '，。')


def credits(p, rows, y=1190, color='#5A605C'):
    """底部演职员表：两行小字，居中，像电影海报的 billing block。"""
    for i, row in enumerate(rows):
        p.append(f'<text x="540" y="{y + i * 24}" text-anchor="middle" font-family="{SANS}" font-weight="400" font-size="14" letter-spacing="3" fill="{color}">{row}</text>')
    p.append(f'<circle cx="490" cy="{y + len(rows) * 24 + 24}" r="7" fill="#C6EA3D"/><circle cx="502" cy="{y + len(rows) * 24 + 31}" r="4.5" fill="#C6EA3D"/>'
             f'<text x="514" y="{y + len(rows) * 24 + 36}" font-family="{SANS}" font-weight="700" font-size="22" letter-spacing="7" fill="{color}">南伴球</text>')
