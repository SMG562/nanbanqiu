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
