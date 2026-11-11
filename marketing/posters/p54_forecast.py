from lib import *

META = dict(
    id=54, slug='forecast', title='看了十二遍天气预报', lines=['周六降雨概率 30%，', '我看了十二遍。'],
    style=['信息图', '色块', '幽默'], tone='暖色', demo=False,
    concept='天气预报格子被四等分：晴、云、雨、风，中间一个 30%；墨尔本一天四季，约球前反复刷新天气',
    use='墨尔本约球的天气焦虑',
)


def svg():
    random.seed(54)
    S, x0, y0 = 660, 210, 470
    h = S // 2
    drops = ''.join(f'<path d="M{x0+h+60+i*58} {y0+h+70+(i%3)*30} l-10 34" stroke="#EAF3FF" stroke-width="5" stroke-linecap="round" opacity=".85"/>' for i in range(5)) + ''.join(f'<path d="M{x0+h+88+i*58} {y0+h+160+(i%2)*30} l-10 34" stroke="#EAF3FF" stroke-width="5" stroke-linecap="round" opacity=".7"/>' for i in range(4))
    rays = ''.join(f'<path d="M{x0+h//2} {y0+h//2} l{math.cos(a)*200:.0f} {math.sin(a)*200:.0f}" stroke="#FFE08A" stroke-width="6" stroke-linecap="round" opacity=".6"/>' for a in [i * math.pi / 6 for i in range(12)])
    wind = ''.join(f'<path d="M{x0+30} {y0+h+70+i*52} h{150-i*14} q34 0 34 -22 q0 -18 -20 -18" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".85"/>' for i in range(3))
    body = f'''
<defs>
 <clipPath id="sq54"><rect x="{x0}" y="{y0}" width="{S}" height="{S}" rx="34"/></clipPath>
 <radialGradient id="su54" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#FFD25A"/><stop offset="1" stop-color="#F29A2E"/></radialGradient>
</defs>
<rect width="{W}" height="{H}" fill="#F3E6CC"/>
<rect x="{x0+10}" y="{y0+26}" width="{S}" height="{S}" rx="34" fill="#000" opacity=".25" filter="url(#bl28)"/>
<g clip-path="url(#sq54)">
 <rect x="{x0}" y="{y0}" width="{h}" height="{h}" fill="url(#su54)"/>
 <rect x="{x0+h}" y="{y0}" width="{h}" height="{h}" fill="#9CB1C4"/>
 <rect x="{x0}" y="{y0+h}" width="{h}" height="{h}" fill="#2E8C8A"/>
 <rect x="{x0+h}" y="{y0+h}" width="{h}" height="{h}" fill="#2D5E94"/>
 {rays}<circle cx="{x0+h//2}" cy="{y0+h//2}" r="62" fill="#FFF3C2"/>
 <g fill="#F3F7FA"><circle cx="{x0+h+110}" cy="{y0+h//2+20}" r="52"/><circle cx="{x0+h+170}" cy="{y0+h//2-10}" r="70"/><circle cx="{x0+h+240}" cy="{y0+h//2+20}" r="52"/><rect x="{x0+h+110}" y="{y0+h//2+20}" width="130" height="52"/></g>
 {wind}{drops}
</g>
<circle cx="{x0+h}" cy="{y0+h}" r="128" fill="#0B3B2A"/><circle cx="{x0+h}" cy="{y0+h}" r="128" fill="none" stroke="{C['lime']}" stroke-width="6"/>
<text x="{x0+h}" y="{y0+h+30}" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="94" fill="#F7EBD6">30%</text>
<text x="{x0+h}" y="{y0+h+74}" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="18" letter-spacing="5" fill="{C['lime']}">SAT</text>
<text x="{x0}" y="{y0+S+64}" font-family="{SANS}" font-weight="700" font-size="24" letter-spacing="4" fill="#0B3B2A" opacity=".8">MELBOURNE · 四季一日</text>
<text x="{x0+S}" y="{y0+S+64}" text-anchor="end" font-family="{SANS}" font-weight="700" font-size="24" letter-spacing="2" fill="#0B3B2A" opacity=".8">已刷新 12 次</text>
{tag('WEATHER CHECK', color='#0B3B2A', rule='#0B3B2A')}
{headline(META['lines'], y=290, size=58, colors='#0B3B2A', ls=2, lh=76)}
{wordmark(1268, '#0B3B2A', sub=False, op=.95)}
{grain(.16, True)}'''
    return page(body)
