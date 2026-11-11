from lib import *

META = dict(
    id=49, slug='new-balls', title='新球开罐', lines=['新球开罐，', '先闻一下。'],
    style=['写实光影', '俯视', '质感'], tone='暖色', demo=False,
    concept='橙色大色块上，俯视一只刚拉开的球罐：金属罐沿、深色罐口里一颗崭新的球，旁边一枚拉环，罐口喷出一点气',
    use='开新球的仪式感；打过球的人都懂',
)


def svg():
    random.seed(49)
    cx, cy, R = 540, 770, 335
    rings = ''.join(f'<circle cx="{cx}" cy="{cy}" r="{R - 8 - i * 7}" fill="none" stroke="{"#fff" if i % 2 else "#6C757A"}" stroke-width="1" opacity=".22"/>' for i in range(1, 7))
    steam = ''.join(f'<path d="{d}" fill="none" stroke="#FFF3E4" stroke-width="{w}" stroke-linecap="round" opacity="{o}"/>' for d, w, o in [
        ('M760 470 q36 -34 22 -84', 6, .85), ('M820 520 q50 -20 62 -76', 5, .75), ('M850 590 q56 -6 86 -52', 5, .65),
        ('M700 440 q10 -44 -14 -82', 5, .6), ('M880 660 q50 12 84 -14', 4, .5)])
    puffs = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#FFF3E4" opacity=".28" filter="url(#bl6)"/>' for x, y, r in [(790, 420, 26), (900, 480, 20), (960, 560, 16)])
    body = f'''
<defs>
 <radialGradient id="bg49" cx="45%" cy="50%" r="80%"><stop offset="0" stop-color="#F27A4E"/><stop offset="1" stop-color="#C94A22"/></radialGradient>
 <linearGradient id="rim49" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7F9FA"/><stop offset=".35" stop-color="#B9C0C4"/><stop offset=".65" stop-color="#E4E8EA"/><stop offset="1" stop-color="#8A949A"/></linearGradient>
 <linearGradient id="rim49b" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#EEF1F2"/><stop offset=".5" stop-color="#A5AEB3"/><stop offset="1" stop-color="#DCE1E3"/></linearGradient>
 <radialGradient id="in49" cx="50%" cy="50%" r="50%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".78"/></radialGradient>
 <clipPath id="op49"><circle cx="{cx}" cy="{cy}" r="{R-74}"/></clipPath>
</defs>
<rect width="{W}" height="{H}" fill="url(#bg49)"/>
<ellipse cx="{cx+16}" cy="{cy+R-6}" rx="{R*.92:.0f}" ry="40" fill="#000" opacity=".4" filter="url(#bl28)"/>
<circle cx="{cx}" cy="{cy}" r="{R}" fill="url(#rim49)"/>
<circle cx="{cx}" cy="{cy}" r="{R-26}" fill="url(#rim49b)"/>
{rings}
<circle cx="{cx}" cy="{cy}" r="{R-58}" fill="#59636A"/>
<circle cx="{cx}" cy="{cy}" r="{R-72}" fill="#050807"/>
<g clip-path="url(#op49)">{ball('n', cx, cy + 6, R - 90, rot=-20)}<circle cx="{cx}" cy="{cy}" r="{R-74}" fill="url(#in49)"/></g>
<g transform="translate(870 1110) rotate(-24)">
  <ellipse cx="6" cy="14" rx="96" ry="30" fill="#000" opacity=".35" filter="url(#bl14)"/>
  <rect x="-96" y="-14" width="96" height="28" rx="12" fill="url(#rim49)"/>
  <ellipse cx="38" cy="0" rx="58" ry="40" fill="none" stroke="url(#rim49b)" stroke-width="16"/>
  <ellipse cx="38" cy="0" rx="58" ry="40" fill="none" stroke="#fff" stroke-width="2" opacity=".5"/>
</g>
{steam}{puffs}
{tag('NEW BALLS', color='#FFF3E4', rule='#FFF3E4', op=.95, weight=700)}
{headline(META['lines'], y=290, size=60, colors='#FFF3E4', ls=3, lh=76)}
{wordmark(1268, '#FFF3E4', sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
