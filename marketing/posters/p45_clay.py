from lib import *

META = dict(
    id=45, slug='clay', title='红土', lines=['回家才发现，', '袜子也红了。'],
    style=['写实光影', '俯视', '质感'], tone='暖色', demo=False,
    concept='红土场俯视：刷过的弧形纹理、一道长长的滑步痕、一颗球和它落下的印子，白线被蹭得发红',
    use='红土场约球；一句大实话',
)


def svg():
    random.seed(45)
    r = random.Random(45)
    arcs = ''.join(f'<circle cx="1500" cy="1750" r="{rad}" fill="none" stroke="{c}" stroke-width="{r.uniform(5,14):.0f}" opacity="{r.uniform(.05,.12):.2f}"/>'
                   for rad, c in [(620 + i * 58, r.choice(['#7A2E14', '#F0A27A', '#7A2E14'])) for i in range(22)])
    crumbs = ''.join(f'<circle cx="{r.uniform(0,1080):.0f}" cy="{r.uniform(0,1350):.0f}" r="{r.uniform(.8,2.6):.1f}" fill="{r.choice(["#7A2E14", "#F2B48C"])}" opacity="{r.uniform(.15,.45):.2f}"/>' for _ in range(700))
    def foot(x, y, a):
        chev = ''.join(f'<path d="M-18 {j*18-52} L0 {j*18-40} L18 {j*18-52}" />' for j in range(6))
        return (f'<g transform="translate({x} {y}) rotate({a})" opacity=".5"><path d="M-30 -70 Q0 -90 30 -70 L26 20 Q0 34 -26 20 Z" fill="#8E3A1C" opacity=".5"/>'
                f'<g stroke="#5A220F" stroke-width="3" fill="none" opacity=".6">{chev}</g><path d="M-26 50 Q0 40 26 50 L22 100 Q0 112 -22 100 Z" fill="#8E3A1C" opacity=".5"/></g>')
    body = f'''
<defs>
 <filter id="cl45" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="4" seed="9"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .15  0 0 0 0 .06  1.9 0 0 0 -.7"/></filter>
 <radialGradient id="bd45" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#E08A5E"/><stop offset="1" stop-color="#B84520"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#bd45)"/>
<rect width="{W}" height="{H}" filter="url(#cl45)" opacity=".6"/>
{arcs}{crumbs}
<g filter="url(#rough2)">
  <path d="M-20 1005 H1100" stroke="#F5EDE0" stroke-width="16"/><path d="M890 1020 V-20" stroke="#F5EDE0" stroke-width="16"/>
  <path d="M-20 1005 H1100" stroke="#C9552E" stroke-width="16" stroke-dasharray="40 90 12 60" opacity=".4"/>
  <path d="M890 1020 V-20" stroke="#C9552E" stroke-width="16" stroke-dasharray="30 120 20 80" opacity=".4"/>
</g>
<g filter="url(#rough)">
  <path d="M150 700 C300 690 470 790 600 995" stroke="#7A2E14" stroke-width="44" stroke-linecap="round" opacity=".09"/>
  <path d="M150 700 C300 690 470 790 600 995" stroke="#7A2E14" stroke-width="24" stroke-linecap="round" opacity=".14"/>
  <path d="M150 700 C300 690 470 790 600 995" stroke="#5A220F" stroke-width="6" stroke-linecap="round" opacity=".16"/>
</g>
<ellipse cx="620" cy="1018" rx="90" ry="34" fill="#F4B890" opacity=".55" filter="url(#bl14)"/>
<ellipse cx="610" cy="1008" rx="48" ry="16" fill="#E48B5C" filter="url(#rough2)"/>
{foot(250, 1120, -20)}{foot(330, 1190, -12)}{foot(620, 1160, 6)}
<g filter="url(#rough2)"><circle cx="640" cy="440" r="34" fill="#9E3C1A" opacity=".55"/><circle cx="640" cy="440" r="48" fill="none" stroke="#F2B48C" stroke-width="7" opacity=".6"/></g>
<ellipse cx="660" cy="466" rx="40" ry="9" fill="#5A220F" opacity=".4" filter="url(#bl6)"/>
{ball('c', 636, 356, 46, rot=-30)}
<defs><radialGradient id="dust45" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="#C9552E" stop-opacity=".75"/><stop offset=".6" stop-color="#C9552E" stop-opacity="0"/></radialGradient></defs>
<circle cx="636" cy="356" r="46" fill="url(#dust45)"/>
{tag('CLAY', color='#FFF3E4', rule='#FFF3E4', op=.9, weight=700)}
{headline(META['lines'], y=290, size=60, colors='#FFF3E4', ls=3, lh=76)}
{wordmark(1268, '#FFF3E4', sub=False, op=.95)}
{grain(.2, True)}'''
    return page(body)
