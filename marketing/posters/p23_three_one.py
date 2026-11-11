from lib import *

META = dict(
    id=23, slug='three-one', title='三缺一', lines=['三缺一，', '球缺你。'],
    style=['插画', '双关', '地域梗'], tone='深色', demo=False,
    concept='麻将“四筒”的四个圆换成网球，第四个只剩虚线；搭子文化的双关',
    use='找双打搭子 / 约局：双打差一人',
)


def svg():
    random.seed(23)
    ivory = '#FBF4E2'
    backs = ''.join(
        f'<g transform="translate({x} {y}) rotate({r})" opacity=".22"><rect x="-60" y="-80" width="120" height="160" rx="16" fill="#1E8E5E"/><rect x="-46" y="-66" width="92" height="132" rx="10" fill="none" stroke="#C6EA3D" stroke-width="3"/></g>'
        for x, y, r in [(110, 640, -14), (980, 590, 12), (90, 1050, 10), (990, 1000, -9), (960, 790, 20)])
    pips = [(-95, -125), (95, -125), (-95, 125)]
    tile_pips = ''.join(seamdisc(x, y, 68, -22 + 30 * i, '#C6EA3D', ivory, f'p{i}') + f'<circle cx="{x}" cy="{y}" r="68" fill="none" stroke="#7FA21C" stroke-width="5"/>' for i, (x, y) in enumerate(pips))
    body = f'''
<defs><radialGradient id="bg23" cx="50%" cy="55%" r="80%"><stop offset="0" stop-color="#14573F"/><stop offset="1" stop-color="#062318"/></radialGradient></defs>
<rect width="{W}" height="{H}" fill="url(#bg23)"/>
{backs}
{tag('THREE PLUS ONE')}
{headline(META['lines'], y=330, size=112, colors=(C['cream'], C['lime']))}
<ellipse cx="540" cy="1135" rx="260" ry="26" fill="#000" opacity=".45" filter="url(#bl14)"/>
<g transform="translate(540 835) rotate(-4)">
  <rect x="-215" y="-250" width="430" height="560" rx="42" fill="#12724D"/>
  <rect x="-215" y="-250" width="430" height="560" rx="42" fill="none" stroke="#0A3F2A" stroke-width="4"/>
  <rect x="-215" y="-276" width="430" height="560" rx="42" fill="{ivory}"/>
  <rect x="-196" y="-257" width="392" height="522" rx="30" fill="none" stroke="#E4D6B4" stroke-width="3"/>
  <g transform="translate(0 -6)">{tile_pips}
    <circle cx="95" cy="125" r="68" fill="none" stroke="#E8643C" stroke-width="7" stroke-dasharray="16 12" stroke-linecap="round"/>
    <text x="95" y="150" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="72" fill="#E8643C">你</text>
  </g>
</g>
{sub('还差一位，水平相近就行。', 540, 1200, 26, C['cream'], .85, 7, 'middle')}
{wordmark(1268, '#fff', sub=False, op=.9)}
{grain(.2)}'''
    return page(body)
