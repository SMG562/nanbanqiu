import sys, math, random, pathlib
sys.path.insert(0, '/home/claude/nanbanqiu/marketing')
import mao3
from lib import *
PEN = mao3.PEN
mao3.pen = lambda d, w, op=1.0: f'<path d="{d}" fill="none" stroke="{PEN}" stroke-width="{w*1.1:.2f}" stroke-linecap="round" stroke-linejoin="round" opacity="{op}"/>'
from mao3 import figure3, DOWN_L, DOWN_R, POSES

R0, GY, CX = 42, 198, 110
CY = GY - 1.53 * R0
def P(x, y): return (CX + x * R0, CY + y * R0)
def ln(d, w=2.6, col=PEN, extra=''): return f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def wrap(inner): return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220"><defs>{COMMON}</defs>{inner}</svg>'
def fig(id, pose, mood, look=0, cx=CX, r=R0):
    return figure3(id, cx, 0, r, pose, mood, look=look, gy=GY).replace('filter="url(#rough2)"', '')
def ball(cx, cy, r):
    return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="#C6EA3D" stroke="{PEN}" stroke-width="2"/>'
            f'<path d="M{cx-r*.62:.1f} {cy-r*.55:.1f} Q{cx-r*.1:.1f} {cy:.1f} {cx-r*.62:.1f} {cy+r*.55:.1f} M{cx+r*.62:.1f} {cy-r*.55:.1f} Q{cx+r*.1:.1f} {cy:.1f} {cx+r*.62:.1f} {cy+r*.55:.1f}" fill="none" stroke="#FBFFE8" stroke-width="2.2" stroke-linecap="round"/>')
def dots(d): return ln(d, 2.2, extra='stroke-dasharray="1 6.5"')
def racket(hx, hy, ang=24, k=1.0, strings=True, broken=False):
    s = f'<g transform="translate({hx:.1f} {hy:.1f}) rotate({ang})">' + ln(f'M0 0 L0 {-22*k}', 2.6)
    s += f'<ellipse cx="0" cy="{-44*k}" rx="{16*k}" ry="{22*k}" fill="#fff" fill-opacity=".4" stroke="{PEN}" stroke-width="2.6"/>'
    if strings:
        for i in (-1, 0, 1): s += ln(f'M{i*7*k} {-44*k-19*k} V{-44*k+19*k}', 1, extra='opacity=".55"')
        if broken: s += ln(f'M{-14*k} {-44*k} H{-3*k}', 1, extra='opacity=".55"') + ln(f'M{3*k} {-44*k} q{6*k} {4*k} {11*k} {1*k}', 1.2, extra='opacity=".7"')
        else:
            for j in (-1, 0, 1): s += ln(f'M{-14*k} {-44*k+j*9*k} H{14*k}', 1, extra='opacity=".55"')
    return s + '</g>'

