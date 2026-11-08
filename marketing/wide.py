"""宽幅长镜头海报（192 起）：纸底，中间一条横贯的宽幅画面（约 2:1），上面一行故事编号，下面一句故事 + 一句旁白 + 落款。"""
from lib import SERIF
from textbook import DEFS as TDEFS, PAPER, INK, RED, BLUE, GREEN, outlined, finish

IX, IY, IW, IH = 0, 300, 1080, 560          # 画面按这个坐标画
OY, OH = 220, 680                             # 实际出图时放大到这个高度（两边略裁）


def open_frame(p, extra_defs=''):
    k = OH / IH
    p.append(f'<defs>{TDEFS}<clipPath id="wide_c"><rect x="0" y="{OY}" width="1080" height="{OH}"/></clipPath>{extra_defs}</defs>')
    p.append(f'<rect width="1080" height="1350" fill="{PAPER}"/>')
    p.append(f'<g clip-path="url(#wide_c)"><g transform="translate(540 {OY}) scale({k:.4f}) translate(-540 -{IY})">')


def close_frame(p, no, title, sub):
    p.append('</g></g>')
    p.append(f'<rect x="0" y="{OY}" width="1080" height="{OH}" fill="none" stroke="{INK}" stroke-width="3"/>')
    p.append(f'<text x="84" y="150" font-family="{SERIF}" font-weight="500" font-size="22" letter-spacing="10" fill="{INK}" opacity=".7">第 {no} 个故事</text>')
    p.append(f'<line x1="84" y1="176" x2="150" y2="176" stroke="{RED}" stroke-width="3"/>')
    p.append(f'<text x="84" y="{OY + OH + 140}" font-family="{SERIF}" font-weight="900" font-size="58" letter-spacing="4" fill="{INK}">{title}</text>')
    p.append(f'<text x="86" y="{OY + OH + 196}" font-family="{SERIF}" font-weight="500" font-size="26" letter-spacing="3" fill="{INK}" opacity=".8">{sub}</text>')
    p.append(f'<circle cx="872" cy="1286" r="8" fill="#C6EA3D" stroke="{INK}" stroke-width="2"/><circle cx="886" cy="1296" r="5" fill="#C6EA3D" stroke="{INK}" stroke-width="1.6"/>'
             f'<text x="1000" y="1302" text-anchor="end" font-family="{SERIF}" font-weight="900" font-size="24" letter-spacing="4" fill="{INK}">南伴球</text>')
    finish(p)


def tiny(x, y, s=1.0, shirt='#FFFFFF', pants='#3E5E9A', arm='up', racket=True):
    """远景里米粒大的人：一个头、一截上衣、两条腿，必要时举拍。"""
    o = (f'<rect x="{x - 4*s:.1f}" y="{y - 22*s:.1f}" width="{3.4*s:.1f}" height="{22*s:.1f}" fill="{pants}"/><rect x="{x + .6*s:.1f}" y="{y - 22*s:.1f}" width="{3.4*s:.1f}" height="{22*s:.1f}" fill="{pants}"/>'
         f'<rect x="{x - 5*s:.1f}" y="{y - 40*s:.1f}" width="{10*s:.1f}" height="{19*s:.1f}" rx="{2*s:.1f}" fill="{shirt}"/><circle cx="{x:.1f}" cy="{y - 45*s:.1f}" r="{5*s:.1f}" fill="#2A1E18"/>')
    if racket:
        if arm == 'up':
            o += f'<line x1="{x + 4*s:.1f}" y1="{y - 36*s:.1f}" x2="{x + 10*s:.1f}" y2="{y - 56*s:.1f}" stroke="{INK}" stroke-width="{1.6*s:.1f}"/><ellipse cx="{x + 12*s:.1f}" cy="{y - 62*s:.1f}" rx="{3.4*s:.1f}" ry="{5*s:.1f}" fill="none" stroke="{INK}" stroke-width="{1.4*s:.1f}"/>'
        else:
            o += f'<line x1="{x + 4*s:.1f}" y1="{y - 30*s:.1f}" x2="{x + 14*s:.1f}" y2="{y - 34*s:.1f}" stroke="{INK}" stroke-width="{1.6*s:.1f}"/><ellipse cx="{x + 19*s:.1f}" cy="{y - 36*s:.1f}" rx="{5*s:.1f}" ry="{3.4*s:.1f}" fill="none" stroke="{INK}" stroke-width="{1.4*s:.1f}"/>'
    return o


def court(x, y, w, h, color=GREEN, net=True, fence=True):
    """远景里的一小块球场（略带透视的梯形）+ 围网。"""
    d = w * .12
    o = f'<path d="M{x + d} {y} L{x + w - d} {y} L{x + w} {y + h} L{x} {y + h}Z" fill="{color}" stroke="#F4EED8" stroke-width="2"/>'
    o += f'<line x1="{x + w / 2}" y1="{y}" x2="{x + w / 2}" y2="{y + h}" stroke="#F4EED8" stroke-width="1.4"/>'
    if net:
        o += f'<line x1="{x + d / 2}" y1="{y + h / 2}" x2="{x + w - d / 2}" y2="{y + h / 2}" stroke="#F4EED8" stroke-width="3"/>'
    if fence:
        o += f'<rect x="{x + d}" y="{y - h * .35}" width="{w - 2 * d}" height="{h * .35}" fill="url(#mesh_t)" opacity=".6"/>'
        o += ''.join(f'<rect x="{x + d + (w - 2 * d) * k / 8 - 1:.1f}" y="{y - h * .38:.1f}" width="2" height="{h * .38:.1f}" fill="#2E5A44"/>' for k in range(9))
        n = 8
        bw = (w - 2 * d) * .09
        for k in range(n):
            bx = x + d + (w - 2 * d) * (.08 + k * .105 + (.04 if k >= 4 else 0))
            o += f'<rect x="{bx:.1f}" y="{y - h * .3:.1f}" width="{bw:.1f}" height="{bw * 1.1:.1f}" fill="{RED}"/>'
    return o
