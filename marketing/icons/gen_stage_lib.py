from helpers import *
import pathlib
SAGE = dict(bg1='#F1F6EC', bg2='#DCE9D4', far='#D2E3CA', near='#C2D9B8', dark='#AFCDA4', tree='#B5D0AA', line='#8FAE8B')
RAIN = dict(bg1='#EEF2F5', bg2='#D8E1E8', far='#CBD7DF', near='#BCCBD5', dark='#A9BCC9', tree='#B3C4CF', line='#8DA3B2')
NIGHT = dict(bg1='#34445A', bg2='#1F2B3D', far='#2B3B52', near='#243349', dark='#1C2A3D', tree='#2E4058', line='#8FA6C2')
ACC = '#E8643C'
CXS, CYS, RS = 110, 112, 96

def sw(inner, W=220, H=220): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><defs>{COMMON}</defs>{inner}</svg>'

def stage(uid, pal, back, mid, front, hills=True, trees=((30, 150, 1), (190, 158, .9))):
    """back: 山后（太阳/云）; mid: 两层山之间; front: 近山之后、角色之前"""
    s = (f'<defs><linearGradient id="sb{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{pal["bg1"]}"/><stop offset="1" stop-color="{pal["bg2"]}"/></linearGradient>'
         f'<clipPath id="sc{uid}"><circle cx="{CXS}" cy="{CYS}" r="{RS}"/></clipPath></defs>'
         f'<circle cx="{CXS}" cy="{CYS}" r="{RS}" fill="url(#sb{uid})"/><g clip-path="url(#sc{uid})">{back}')
    if hills:
        s += f'<path d="M0 150 Q46 126 96 146 T220 136 V220 H0Z" fill="{pal["far"]}"/>'
        for x, y, k in trees:
            s += f'<g transform="translate({x} {y}) scale({k})"><rect x="-6" y="-14" width="12" height="13" rx="3.5" fill="{pal["tree"]}"/><rect x="-1" y="-2" width="2" height="9" fill="{pal["tree"]}"/></g>'
        s += mid + f'<path d="M0 170 Q60 152 118 168 T220 160 V220 H0Z" fill="{pal["near"]}"/>'
    s += front + '</g>'
    return s

def confetti(pal, items):
    out = ''
    for k, x, y in items:
        c = pal['line']
        if k == 'o': out += f'<circle cx="{x}" cy="{y}" r="3.6" fill="none" stroke="{c}" stroke-width="1.8"/>'
        elif k == 'p': out += f'<path d="M{x-4} {y} h8 M{x} {y-4} v8" stroke="{c}" stroke-width="1.8" stroke-linecap="round"/>'
        elif k == 's': out += f'<path d="M{x-6} {y} q3 -5 6 0 t6 0" fill="none" stroke="{c}" stroke-width="1.8" stroke-linecap="round"/>'
        elif k == 'a': out += f'<circle cx="{x}" cy="{y}" r="3" fill="{ACC}"/>'
        elif k == 'q': out += f'<rect x="{x-3}" y="{y-3}" width="6" height="6" rx="1.5" fill="none" stroke="{c}" stroke-width="1.8"/>'
    return out

def mao(uid, cx, gy, r, pose, mood, look=0, char='mao'):
    return figure3(uid, cx, 0, r, pose, mood, look=look, gy=gy, char=char).replace('filter="url(#rough2)"', '')

def small_ball(cx, cy, r): return ball(cx, cy, r)
