from lib import *

META = dict(
    id=72, slug='ball-mark', title='红土球印', lines=['印子在这，', '你说呢。'],
    style=['写实光影', '微距', '幽默'], tone='暖色', demo=False,
    concept='红土场俯拍：白线边缘留着一个清楚的球印，一半压在线上；用白粉笔手画的圈圈住它；红土上的球印就是铁证',
    use='红土 / 线上线下的争议；打过红土的人都懂',
)


def svg():
    random.seed(72)
    r = random.Random(72)
    grains = ''.join(f'<circle cx="{r.uniform(0,1080):.0f}" cy="{r.uniform(380,1230):.0f}" r="{r.uniform(.8,2.6):.1f}" fill="{r.choice(["#7C3220","#F0A07A","#A44629"])}" opacity="{r.uniform(.15,.5):.2f}"/>' for _ in range(900))
    mx, my = 520, 820
    body = f'''
<defs>
 <filter id="cl72" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".012 .03" numOctaves="4" seed="7"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .2  0 0 0 0 .1  0 0 0 1.5 -.5"/></filter>
 <radialGradient id="mk72" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#B84C2B"/><stop offset=".8" stop-color="#C85B37"/><stop offset="1" stop-color="#A9421F"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="#D8703F"/>
<rect width="{W}" height="{H}" filter="url(#cl72)" opacity=".5"/>
{grains}
<rect x="-20" y="{my-6}" width="1120" height="86" fill="#F3EDE0"/>
<rect x="-20" y="{my-6}" width="1120" height="86" fill="#C06A44" opacity=".25" filter="url(#bl6)"/>
<path d="M-20 {my-6} H1100 M-20 {my+80} H1100" stroke="#B94E2B" stroke-width="3" opacity=".4"/>
<ellipse cx="{mx+6}" cy="{my+8}" rx="150" ry="104" fill="#000" opacity=".25" filter="url(#bl14)"/>
<ellipse cx="{mx}" cy="{my}" rx="146" ry="102" fill="#E39166" opacity=".6"/>
<ellipse cx="{mx}" cy="{my}" rx="132" ry="90" fill="url(#mk72)"/>
<path d="M{mx-60} {my-20} C{mx-20} {my-40} {mx+40} {my-40} {mx+80} {my-10} M{mx-70} {my+24} C{mx-20} {my+44} {mx+40} {my+44} {mx+86} {my+16}" fill="none" stroke="#F7B58E" stroke-width="5" stroke-linecap="round" opacity=".55"/>
<g filter="url(#rough)"><ellipse cx="{mx}" cy="{my-4}" rx="212" ry="160" fill="none" stroke="#fff" stroke-width="10" opacity=".95"/><ellipse cx="{mx+6}" cy="{my-2}" rx="206" ry="156" fill="none" stroke="#fff" stroke-width="5" opacity=".7"/></g>
{tag('BALL MARK', color='#FFF3E0', rule='#FFF3E0')}
{headline(META['lines'], y=290, size=66, colors='#FFF3E0', ls=3, lh=84)}
<rect y="1190" width="{W}" height="160" fill="#2A1209" opacity=".9"/>
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.2)}'''
    return page(body)
