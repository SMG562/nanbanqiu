import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import lib
lib.H = 1440                       # 小红书 3:4
W, H = lib.W, lib.H
from lib import SERIF, SANS, C, ball, tag, headline, sub, wordmark, grain, page
import segno
WD = '一二三四五六日'
TOMORROW = datetime.date(2026, 11, 9)
DATE_ZH = f'{TOMORROW.month} 月 {TOMORROW.day} 日 · 周{WD[TOMORROW.weekday()]}'
URL = f'https://nanbanqiu.app/melbourne/?date={TOMORROW.isoformat()}&source=xhs_{TOMORROW:%m%d}'
TYPE = {'s': '单打', 'd': '双打', 'r': '拉球'}
CAP = {'s': 2, 'd': 4, 'r': 2}
CLAY = '#C2410C'

def esc(s): return str(s).replace('&', '&amp;').replace('<', '&lt;')

def qr(x, y, size, url=URL, dark=C['deep'], light='#FBF4E3', pad=10):
    m = segno.make(url, error='m').matrix; n = len(m); u = (size - 2 * pad) / n
    cells = ''.join(f'M{x+pad+c*u:.2f} {y+pad+r*u:.2f}h{u:.2f}v{u:.2f}h-{u:.2f}z' for r, row in enumerate(m) for c, v in enumerate(row) if v)
    return f'<rect x="{x}" y="{y}" width="{size}" height="{size}" rx="14" fill="{light}"/><path d="{cells}" fill="{dark}" shape-rendering="crispEdges"/>'

def demo_badge(x=996, y=96, ink='#F7EBD6'):
    return f'<g opacity=".55"><rect x="{x-92}" y="{y-24}" width="92" height="34" rx="17" fill="none" stroke="{ink}" stroke-width="1.5"/><text x="{x-46}" y="{y}" text-anchor="middle" font-family="{SANS}" font-size="17" letter-spacing="3" fill="{ink}">示意数据</text></g>'

# ---- 第二版 ----
NUM = "'Inter','Inter Display',sans-serif"          # 数字：等宽（tnum），开源 OFL
ISSUE = 23                                          # 期号（正式版 = 已发期数 + 1）
WEATHER = '晴 22°C · 微风'                           # 正式版取气象局预报
SUNSET = '20:12'
LAST = (9, 7)                                       # 上一期：几局在找人、最后成了几局（社会认同）
SITE = 'nanbanqiu.app'
# 水平叫法（提议，待所有者定）：只做阅读辅助，数字仍是 UTR
BANDS = [(0, 2.5, '新手'), (2.5, 3.5, '进阶'), (3.5, 4.5, '中级'), (4.5, 5.5, '中高'), (5.5, 99, '高手')]
def level_word(lo, hi):
    mid = (lo + hi) / 2
    return next(w for a, b, w in BANDS if a <= mid < b)

# 真实字体测宽（标签避让、截断用，不再按字数估）
from PIL import ImageFont
_F = {}
def text_w(s, size, bold=False):
    k = (size, bold)
    if k not in _F: _F[k] = ImageFont.truetype(f'/usr/share/fonts/opentype/noto/NotoSansCJK-{"Bold" if bold else "Regular"}.ttc', size)
    return _F[k].getlength(s)

GRAIN_SVG = '<svg class="grain" width="1080" height="1440"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="8"/><feColorMatrix type="saturate" values="0"/></filter><rect width="1080" height="1440" filter="url(#g)"/></svg>'
def qr_svg(size, url=URL, dark='#0B3B2A', light='#FBF4E3', pad=8):
    return f'<svg width="{size}" height="{size}" viewBox="0 0 {size} {size}">{qr(0, 0, size, url, dark, light, pad)}</svg>'
