from lib import *

META = dict(
    id=29, slug='sunset-net', title='日落之前', lines=['日落之前，', '再打一局。'],
    style=['插画', '意境'], tone='暖色', demo=False,
    concept='落日是半沉的网球（带球缝），球网剪影横在前景，远处飞过几只鸟；黄昏的球场',
    use='傍晚约球、下班后打球的氛围图',
)


def svg():
    random.seed(29)
    hy = 880  # 地平线
    sx, sy, sr = 540, 790, 210
    P = lambda t: persp(t, -120, 1200, 1340, hy + 8, 360, 720)
    ln = ''
    for t in (0, .35, .7, 1):
        y, l, r = P(t); ln += f'<path d="M{l:.0f} {y:.0f} L{r:.0f} {y:.0f}"/>'
    for t in (0, 1):
        pass
    y0, l0, r0 = P(0); y1, l1, r1 = P(1)
    ln += f'<path d="M{l0:.0f} {y0:.0f} L{l1:.0f} {y1:.0f} M{r0:.0f} {y0:.0f} L{r1:.0f} {y1:.0f} M540 {y0:.0f} L540 {y1:.0f}"/>'
    birds = ''.join(f'<path transform="translate({x} {y}) scale({s})" d="M-14 0 Q-7 -9 0 0 Q7 -9 14 0" fill="none" stroke="#0B3B2A" stroke-width="3" stroke-linecap="round"/>'
                    for x, y, s in [(250, 560, 1.1), (320, 520, .8), (870, 470, .9), (800, 520, .6), (190, 610, .6)])
    body = f'''
<defs>
 <linearGradient id="sk29" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B3B2A"/><stop offset=".3" stop-color="#3C6B58"/><stop offset=".55" stop-color="#E39A72"/><stop offset=".68" stop-color="#F2B134"/><stop offset="1" stop-color="#FFD977"/></linearGradient>
 <radialGradient id="sun29" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#FFF6CF"/><stop offset=".6" stop-color="#FFD978"/><stop offset="1" stop-color="#F29A3A"/></radialGradient>
 <linearGradient id="gr29" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B5A3D"/><stop offset=".2" stop-color="#0E4A33"/><stop offset="1" stop-color="#04180F"/></linearGradient>
 <pattern id="mesh29" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M0 0 H14 M0 0 V14" stroke="#7FA98F" stroke-width="1.6" fill="none"/></pattern>
</defs>
<rect width="{W}" height="{H}" fill="url(#sk29)"/>
<circle cx="{sx}" cy="{sy}" r="{sr*2.1:.0f}" fill="#FFD977" opacity=".35" filter="url(#bl60)"/>
<circle cx="{sx}" cy="{sy}" r="{sr}" fill="url(#sun29)"/>
<clipPath id="sc29"><circle cx="{sx}" cy="{sy}" r="{sr}"/></clipPath>
<g clip-path="url(#sc29)"><g transform="translate({sx} {sy}) rotate(-22) scale({sr/100})" fill="none" stroke="#FFF8DC" stroke-width="7" stroke-linecap="round" opacity=".85"><path d="M-67 -74 C-30 -34 -30 34 -67 74"/><path d="M67 -74 C30 -34 30 34 67 74"/></g></g>
{birds}
<path d="M0 {hy} H1080 V1350 H0 Z" fill="url(#gr29)"/>
<ellipse cx="540" cy="{hy+22}" rx="420" ry="26" fill="#FFD977" opacity=".5" filter="url(#bl14)"/>
<g stroke="#F6D9A8" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round">{ln}</g>
<g>
  <rect x="0" y="1010" width="1080" height="96" fill="#04180F" opacity=".92"/>
  <rect x="0" y="1010" width="1080" height="96" fill="url(#mesh29)" opacity=".35"/>
  <rect x="0" y="1000" width="1080" height="12" fill="#04180F"/><path d="M0 1004 H1080" stroke="#F3E6CC" stroke-width="4" opacity=".55"/>
  <rect x="70" y="960" width="16" height="190" rx="6" fill="#04180F"/><rect x="994" y="960" width="16" height="190" rx="6" fill="#04180F"/>
</g>
{tag('BEFORE SUNSET', color='#F7EBD6')}
{headline(META['lines'], y=330, size=104, colors=(C['cream'], C['amber']), ls=4)}
{wordmark(1268, '#F3E6CC', sub=False, op=.95)}
{grain(.2)}'''
    return page(body)
