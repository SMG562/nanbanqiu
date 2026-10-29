from lib import *

META = dict(
    id=47, slug='hardcourt', title='硬地', lines=['硬地，膝盖有意见。'],
    style=['插画', '俯视', '极简'], tone='亮色', demo=False,
    concept='蓝色硬地俯视，傍晚长长的影子：球网的影子、一个弓步击球的人影（人不在画面里）、一颗球；极简构成',
    use='硬地场约球；一句大实话',
)


def svg():
    random.seed(47)
    sh = '#071A3A'
    figure = '''<g stroke="#000" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" fill="none">
 <path d="M0 -72 L34 -42 L24 0"/><path d="M0 -72 L-32 -36 L-52 0"/><path d="M0 -72 L8 -122"/><path d="M8 -112 L44 -128 L74 -154"/></g>
 <circle cx="10" cy="-140" r="13" fill="#000"/><ellipse cx="88" cy="-172" rx="15" ry="22" transform="rotate(38 88 -172)" fill="none" stroke="#000" stroke-width="6"/>'''
    mesh = ''.join(f'<path d="M{70 + k*40} 450 L{230 + k*40} 570" stroke="{sh}" stroke-width="3" opacity=".5"/>' for k in range(24))
    body = f'''
<defs>
 <linearGradient id="lt47" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB872" stop-opacity=".38"/><stop offset=".5" stop-color="#FFB872" stop-opacity="0"/><stop offset="1" stop-color="#0A1F4A" stop-opacity=".4"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="#2E8B74"/>
<rect x="90" y="420" width="900" height="860" fill="#2D68B1"/>
<g stroke="#F4F1E6" stroke-width="7" fill="none">
  <rect x="140" y="470" width="800" height="720"/><path d="M230 470 V1190 M850 470 V1190"/><path d="M230 820 H850"/><path d="M540 450 V820"/><path d="M520 1190 H560"/>
  <path d="M60 450 H1020" stroke-width="5" opacity=".0"/>
</g>
<path d="M70 450 H1010" stroke="#0A1F4A" stroke-width="7" opacity=".85"/>
<g stroke="#0A1F4A" stroke-width="9" stroke-linecap="round"><path d="M70 432 V470"/><path d="M1010 432 V470"/></g>
<g opacity=".5" filter="url(#bl6)"><path d="M70 450 H1010 L1160 560 H220 Z" fill="{sh}"/>{mesh}
 <g transform="translate(430 760) rotate(150) scale(1 1.9)" fill="{sh}">{figure.replace('#000', sh)}</g></g>
<ellipse cx="778" cy="1060" rx="26" ry="20" fill="{sh}" opacity=".4" filter="url(#bl6)"/>
{ball('h', 740, 1000, 26, rot=-30)}
<rect width="{W}" height="{H}" fill="url(#lt47)"/>
{tag('HARD COURT', color='#F7F4EA', rule='#F7F4EA', op=.9, weight=700)}
{headline(META['lines'], y=290, size=60, colors='#F7F4EA', ls=3)}
{wordmark(1268, '#F7F4EA', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
