from lib import *

META = dict(
    id=42, slug='windy', title='今天风有点大', lines=['今天风有点大。'],
    style=['写实光影', '风景'], tone='暖色', demo=False,
    concept='傍晚的海边，沙丘草被吹得全倒向一边，球网鼓起，一颗球被风吹着滚；打过野球的人都懂',
    use='户外 / 海边约球；一句大实话，不煽情',
)


def svg():
    random.seed(42)
    r = random.Random(42)
    hz = 790
    sea = ''
    for i in range(48):
        t = i / 47
        y = hz + 6 + t ** 1.5 * 230
        l = 24 + t * 220
        x = r.uniform(-40, 1080)
        nearsun = abs(x + l / 2 - 700) < 50 + (y - hz) * .5
        sea += f'<path d="M{x:.0f} {y:.0f} h{l:.0f}" stroke="{"#FFF0CC" if nearsun else "#FFD9A8"}" stroke-width="{1.5+t*2.5:.1f}" stroke-linecap="round" opacity="{(.7 if nearsun else .16+t*.1):.2f}"/>'
    streaks = ''
    for (x, y, l, c) in [(90, 392, 400, 1), (360, 430, 520, 1), (150, 560, 380, 1), (620, 620, 400, 1), (40, 700, 300, 1), (700, 300, 330, 1)]:
        streaks += f'<path d="M{x} {y} q{l*.25:.0f} -14 {l*.5:.0f} 0 t{l*.5:.0f} 0" fill="none" stroke="#FFF3DC" stroke-width="2.2" stroke-linecap="round" opacity=".28"/><path d="M{x+l} {y} c18 -2 24 -22 6 -24 c-14 -1 -14 14 -2 14" fill="none" stroke="#FFF3DC" stroke-width="2.2" stroke-linecap="round" opacity=".28"/>'
    grass = ''
    for _ in range(340):
        x = r.uniform(-20, 1100); y = 1012 + r.uniform(-8, 36) + (0 if r.random() < .8 else 40)
        h = r.uniform(34, 116); lean = h * r.uniform(.55, .95)
        c = r.choice(['#2B8A5E', '#1C6B4A', '#3AA06E', '#0F5238'])
        grass += f'<path d="M{x:.0f} {y:.0f} Q{x+lean*.1:.0f} {y-h*.7:.0f} {x+lean:.0f} {y-h:.0f}" stroke="{c}" stroke-width="{r.uniform(2,3.6):.1f}" fill="none" stroke-linecap="round"/>'
    body = f'''
<defs><linearGradient id="sk42" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14405A"/><stop offset=".45" stop-color="#6E9AA0"/><stop offset=".78" stop-color="#F0B286"/><stop offset="1" stop-color="#FFE0A8"/></linearGradient>
<linearGradient id="se42" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9A57C"/><stop offset=".25" stop-color="#3E7C84"/><stop offset="1" stop-color="#0E3E46"/></linearGradient>
<linearGradient id="gd42" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C6B4A"/><stop offset=".3" stop-color="#0B3B2A"/><stop offset="1" stop-color="#04180F"/></linearGradient>
<pattern id="mesh42" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 0 H9 M0 0 V9" stroke="#F7EBD6" stroke-width="1.2" fill="none"/></pattern></defs>
<rect width="{W}" height="{H}" fill="url(#sk42)"/>
<circle cx="700" cy="{hz-30}" r="260" fill="#FFE2A8" opacity=".5" filter="url(#bl60)"/>
<circle cx="700" cy="{hz-30}" r="78" fill="#FFF1CC"/>
<g>{streaks}</g>
<rect y="{hz}" width="{W}" height="300" fill="url(#se42)"/>
<g>{sea}</g>
<path d="M0 {hz} H1080" stroke="#FFF3DC" stroke-width="2" opacity=".6"/>
<path d="M0 1010 C180 975 380 1000 600 1008 S900 980 1080 1004 V1350 H0Z" fill="url(#gd42)"/>
{grass}
<g>
  <path d="M300 1040 L300 962 M640 1040 L640 962" stroke="#DDEBFF" stroke-width="5" stroke-linecap="round"/>
  <path d="M300 966 Q480 992 640 966 L640 1040 Q480 1050 300 1040 Z" fill="url(#mesh42)" opacity=".55"/>
  <path d="M300 966 Q480 992 640 966" fill="none" stroke="#F7EBD6" stroke-width="5" stroke-linecap="round"/>
</g>
<g stroke="#F7EBD6" stroke-width="2.5" fill="none" opacity=".4"><path d="M120 1090 H900"/><path d="M60 1180 H980"/></g>
<ellipse cx="560" cy="1150" rx="34" ry="6" fill="#000" opacity=".5" filter="url(#bl6)"/>
<g stroke="#F7EBD6" stroke-width="3" stroke-linecap="round" opacity=".6"><path d="M420 1118 H500"/><path d="M440 1132 H508"/><path d="M430 1146 H494"/></g>
{ball('b', 560, 1122, 28, rot=10)}
{tag('BY THE SEA · 5:50 PM', color='#F7EBD6', rule='#F7EBD6', op=.85, weight=700)}
{headline(META['lines'], y=290, size=60, colors='#F7EBD6', ls=3)}
{wordmark(1268, '#F3E6CC', sub=False, op=.95)}
{grain(.2)}'''
    return page(body)
