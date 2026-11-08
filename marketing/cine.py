"""电影镜头感（186 起）：上下电影黑边 + 场记字、胶片颗粒、暗角、镜头光斑。"""
from lib import SANS, SERIF

DEFS = ('<filter id="gr_c"><feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="2" seed="86"/><feColorMatrix type="saturate" values="0"/></filter>'
        '<radialGradient id="vg_c" cx="50%" cy="50%" r="72%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>'
        '<filter id="dof_c" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>'
        '<filter id="dof2_c" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>')
TOP, BOT = 120, 1150


def frame(p, scene, title, time, line):
    """电影黑边 + 场记：上边场次和片名，下边一句很轻的话 + 时间码 + 落款。"""
    p.append('<rect width="1080" height="1350" fill="url(#vg_c)"/>')
    p.append('<rect width="1080" height="1350" filter="url(#gr_c)" opacity=".1" style="mix-blend-mode:overlay"/>')
    p.append(f'<rect width="1080" height="{TOP}" fill="#0A0A0A"/><rect y="{BOT}" width="1080" height="{1350 - BOT}" fill="#0A0A0A"/>')
    p.append(f'<text x="64" y="74" font-family="{SANS}" font-weight="500" font-size="16" letter-spacing="6" fill="#9A9A92">{scene}</text>')
    p.append(f'<text x="1016" y="74" text-anchor="end" font-family="{SANS}" font-weight="300" font-size="16" letter-spacing="6" fill="#9A9A92">{time}</text>')
    p.append(f'<text x="540" y="{BOT + 78}" text-anchor="middle" font-family="{SERIF}" font-weight="500" font-size="30" letter-spacing="8" fill="#E8E4D8">{title}</text>')
    p.append(f'<text x="540" y="{BOT + 122}" text-anchor="middle" font-family="{SANS}" font-weight="300" font-size="17" letter-spacing="3" fill="#8A8A84">{line}</text>')
    p.append(f'<circle cx="474" cy="{BOT + 166}" r="6" fill="#C6EA3D"/><circle cx="485" cy="{BOT + 173}" r="4" fill="#C6EA3D"/>'
             f'<text x="496" y="{BOT + 178}" font-family="{SANS}" font-weight="700" font-size="16" letter-spacing="6" fill="#B8B8B0">南伴球</text>')


def boards(p, cx, y, bw=40, text='好好打球天天向上', fill='#C8402E', txt='#F7E9C8', glow=False, mirror=False, op=1):
    n = len(text)
    gap, mid = bw * .14, bw * .4
    total = n * bw + (n - 1) * gap + mid
    x0 = cx - total / 2
    out = []
    for i, ch in enumerate(text):
        x = x0 + i * (bw + gap) + (mid if i >= n // 2 else 0)
        if glow:
            out.append(f'<rect x="{x - 4:.0f}" y="{y - 4:.0f}" width="{bw + 8:.0f}" height="{bw * 1.1 + 8:.0f}" fill="#FF7A4A" opacity=".5" filter="url(#bl6)"/>')
        out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="{bw:.1f}" height="{bw * 1.1:.1f}" fill="{fill}"/>'
                   f'<text x="{x + bw / 2:.1f}" y="{y + bw * .84:.1f}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="{bw * .74:.1f}" fill="{txt}">{ch}</text>')
    g = ''.join(out)
    if mirror:
        g = f'<g transform="translate(0 {2 * y + bw * 2.3:.0f}) scale(1 -1)">{g}</g>'
    p.append(f'<g opacity="{op}">{g}</g>')
