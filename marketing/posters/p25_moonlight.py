from lib import *

META = dict(
    id=25, slug='moonlight', title='月色正好', lines=['月色正好，', '来打一场。'],
    style=['写实光影', '意境'], tone='深色', demo=False,
    concept='满月上浅浅的两道弧线像球缝，月亮与网球互为倒影；月光洒在安静的球场上，一颗球等着人来',
    use='夜场 / 晚间约球的氛围图；品牌情绪：安静、期待',
)


def svg():
    random.seed(25)
    mx, my, mr = 760, 640, 230
    stars = ''
    for _ in range(70):
        x, y = random.uniform(30, 1050), random.uniform(40, 900)
        if (x - mx) ** 2 + (y - my) ** 2 < (mr + 60) ** 2 or (x < 640 and 90 < y < 560):
            continue
        stars += f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{random.uniform(.8, 2.2):.1f}" fill="#F7EBD6" opacity="{random.uniform(.25, .8):.2f}"/>'
    maria = ''.join(f'<ellipse cx="{mx+dx}" cy="{my+dy}" rx="{rx}" ry="{ry}" transform="rotate({r} {mx+dx} {my+dy})" fill="#B49A55" opacity=".16"/>'
                    for dx, dy, rx, ry, r in [(-70, -60, 62, 40, -20), (60, -90, 40, 28, 15), (20, 50, 78, 46, 8), (-110, 70, 34, 24, 0), (110, 30, 30, 22, 0)])
    # 球场（透视）
    near, far = 1190, 960
    P = lambda t: persp(t, 40, 1040, near, far, 330, 770)
    def seg(t1, t2, side):
        y1, l1, r1 = P(t1); y2, l2, r2 = P(t2)
        return f'M{(l1 if side == 0 else r1):.0f} {y1:.0f} L{(l2 if side == 0 else r2):.0f} {y2:.0f}'
    lines = ''
    for t in (0, .22, .78, 1):
        y, l, r = P(t); lines += f'<path d="M{l:.0f} {y:.0f} L{r:.0f} {y:.0f}"/>'
    lines += f'<path d="{seg(0, 1, 0)}"/><path d="{seg(0, 1, 1)}"/>'
    ya, la, ra = P(.22); yb, lb, rb = P(.78)
    lines += f'<path d="M{(la + ra) / 2:.0f} {ya:.0f} L{(lb + rb) / 2:.0f} {yb:.0f}"/>'
    yn, ln, rn = P(.5)
    net = f'''<g opacity=".8"><rect x="{ln:.0f}" y="{yn-46:.0f}" width="{rn-ln:.0f}" height="46" fill="url(#mesh25)" opacity=".5"/>
<path d="M{ln:.0f} {yn-46:.0f} L{rn:.0f} {yn-46:.0f}" stroke="#F7EBD6" stroke-width="4" fill="none"/>
<path d="M{ln:.0f} {yn-52:.0f} V{yn+4:.0f} M{rn:.0f} {yn-52:.0f} V{yn+4:.0f}" stroke="#F7EBD6" stroke-width="6" stroke-linecap="round"/></g>'''
    body = f'''
<defs>
 <linearGradient id="sky25" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03120C"/><stop offset=".55" stop-color="#0A3326"/><stop offset="1" stop-color="#0E5139"/></linearGradient>
 <radialGradient id="moon25" cx="38%" cy="34%" r="75%"><stop offset="0" stop-color="#FFFBEA"/><stop offset=".6" stop-color="#F6E7B8"/><stop offset="1" stop-color="#DCC57F"/></radialGradient>
 <linearGradient id="ground25" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E5139"/><stop offset="1" stop-color="#04180F"/></linearGradient>
 <linearGradient id="fade25" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04180F" stop-opacity="0"/><stop offset="1" stop-color="#04180F" stop-opacity=".95"/></linearGradient>
 <pattern id="mesh25" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 0 H12 M0 0 V12" stroke="#F7EBD6" stroke-width="1.2" fill="none"/></pattern>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky25)"/>
{stars}
<circle cx="{mx}" cy="{my}" r="{mr+170}" fill="#F6E7B8" opacity=".16" filter="url(#bl60)"/>
<circle cx="{mx}" cy="{my}" r="{mr+60}" fill="#F6E7B8" opacity=".14" filter="url(#bl28)"/>
<circle cx="{mx}" cy="{my}" r="{mr}" fill="url(#moon25)"/>
<clipPath id="mc25"><circle cx="{mx}" cy="{my}" r="{mr}"/></clipPath>
<g clip-path="url(#mc25)">
  {maria}
  <g transform="translate({mx} {my}) rotate(-22) scale({mr/100})" fill="none" stroke="#B89B4E" stroke-width="3.2" stroke-linecap="round" opacity=".55">
    <path d="M-67 -74 C-30 -34 -30 34 -67 74"/><path d="M67 -74 C30 -34 30 34 67 74"/>
  </g>
  <circle cx="{mx}" cy="{my}" r="{mr}" fill="#000" filter="url(#fuzz)" opacity=".1"/>
</g>
<ellipse cx="{mx-30}" cy="{my+150}" rx="360" ry="20" fill="#0C3A2B" opacity=".55" filter="url(#bl28)"/>
<ellipse cx="{mx+60}" cy="{my+205}" rx="300" ry="12" fill="#0C3A2B" opacity=".6" filter="url(#bl14)"/>
<ellipse cx="520" cy="905" rx="700" ry="22" fill="#F6E7B8" opacity=".18" filter="url(#bl28)"/>
<path d="M0 930 H1080 V1350 H0 Z" fill="url(#ground25)"/>
<ellipse cx="{mx-40}" cy="1020" rx="300" ry="60" fill="#F6E7B8" opacity=".14" filter="url(#bl28)"/>
<g stroke="#F7EBD6" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round">{lines}</g>
{net}
<ellipse cx="428" cy="1163" rx="58" ry="11" fill="#000" opacity=".5" filter="url(#bl6)"/>
{ball('mn', 420, 1112, 52)}
<rect y="1000" width="{W}" height="350" fill="url(#fade25)"/>
{tag('MOONLIGHT')}
{headline(META['lines'], y=330, size=96, colors=(C['cream'], C['lime']), ls=4)}
{sub('夜里的球场，也有光。', y=520, size=26)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
