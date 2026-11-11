from lib import *

META = dict(
    id=33, slug='paper-boat', title='纸船载球', lines=['慢慢来，', '球等你。'],
    style=['插画', '意境', '拟人'], tone='深色', demo=False,
    concept='夜湖上一只纸船，小球坐在里面探出头，月亮的倒影铺在水面；不急，慢慢来',
    use='温柔的邀约、迟到 / 改期时的安抚',
)


def svg():
    random.seed(33)
    wy = 880
    stars = ''.join(f'<circle cx="{random.uniform(30,1050):.0f}" cy="{random.uniform(50,wy-60):.0f}" r="{random.uniform(.8,2.2):.1f}" fill="#F7EBD6" opacity="{random.uniform(.3,.9):.2f}"/>' for _ in range(80))
    mx, my, mr = 810, 470, 105
    refl = ''.join(f'<rect x="{mx - w/2:.0f}" y="{wy+16+i*30}" width="{w:.0f}" height="7" rx="3.5" fill="#F6E7B8" opacity="{max(.08, .6-i*.07):.2f}"/>'
                   for i, w in enumerate([150, 190, 130, 210, 120, 170, 100, 140]))
    ripples = ''.join(f'<ellipse cx="470" cy="{wy+70}" rx="{rx}" ry="{rx*.13:.0f}" fill="none" stroke="#DDEBFF" stroke-width="2" opacity="{o}"/>' for rx, o in [(230, .35), (300, .22), (380, .12)])
    body = f'''
<defs><linearGradient id="bg33" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03100B"/><stop offset="1" stop-color="#0E5139"/></linearGradient>
<linearGradient id="wt33" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0C3F2E"/><stop offset="1" stop-color="#031009"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg33)"/>{stars}
<circle cx="{mx}" cy="{my}" r="{mr*2.6:.0f}" fill="#F6E7B8" opacity=".14" filter="url(#bl60)"/>
<circle cx="{mx}" cy="{my}" r="{mr}" fill="#FBF0CC"/>
<circle cx="{mx}" cy="{my}" r="{mr}" fill="#7A6A33" filter="url(#fuzz)" opacity=".12" style="mix-blend-mode:multiply"/>
<path d="M0 {wy} H1080 V1350 H0 Z" fill="url(#wt33)"/>
<path d="M0 {wy} H1080" stroke="#BFD9CF" stroke-width="2" opacity=".3"/>
{refl}{ripples}
<ellipse cx="470" cy="{wy+62}" rx="170" ry="16" fill="#000" opacity=".5" filter="url(#bl14)"/>
<g transform="translate(470 0) rotate(-3 0 {wy})">
  {ball('b', 0, 768, 92)}{face(0, 776, .78, 'smile', 0)}
  <path d="M-250 {wy-60} L250 {wy-60} L190 {wy+44} L-190 {wy+44} Z" fill="#F7EBD6"/>
  <path d="M-250 {wy-60} L-190 {wy+44} L0 {wy+44} L0 {wy-60} Z" fill="#E4D6B4"/>
  <path d="M-250 {wy-60} L250 {wy-60}" stroke="#FFFDF2" stroke-width="5" stroke-linecap="round"/>
  <path d="M-120 {wy-60} L-85 {wy+44} M120 {wy-60} L85 {wy+44}" stroke="#CDBB92" stroke-width="2" opacity=".7"/>
</g>
{tag('TAKE YOUR TIME')}
{headline(META['lines'], y=330, size=104, colors=(C['cream'], C['lime']), ls=4)}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.18)}'''
    return page(body)
