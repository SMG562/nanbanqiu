from lib import *
from storybook import wc_filter
from storyfig85 import woman_walk, man_lean
from storybook import wash, hatch, person


META = dict(
    id=85, slug='tram-after-work', title='下班了，去打球', lines=['下班了，', '去打球。'],
    style=['插画', '绘本', '故事', '意境'], tone='深色', demo=False,
    concept='绘本风（水彩晕染 + 彩铅排线）：墨尔本傍晚，大月亮和满天小星，电车静静停在远处；穿驼色风衣、斜挎小皮包的女生笑着走过来，路灯下穿白外套、绿围巾的男生把一罐新球举过头顶，笑着喊她',
    use='下班后约晚场的朋友圈 / 小红书配图；绘本风第一张',
)


def svg():
    random.seed(85)
    pts = [(random.uniform(20, 1060), random.uniform(40, 640)) for _ in range(160)]
    stars = ''.join(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{random.choice([1.2, 1.6, 2.2, 2.8]):.1f}"/>' for x, y in pts if not (x < 560 and y < 430))
    crosses = ''.join(f'<path transform="translate({x} {y})" d="M0 -9 Q1.2 -1.2 9 0 Q1.2 1.2 0 9 Q-1.2 1.2 -9 0 Q-1.2 -1.2 0 -9Z"/>'
                      for x, y in [(640, 150), (980, 560), (330, 520), (720, 470), (180, 600), (1010, 120)])
    # 远处楼群
    bld, win = '', ''
    x = -10
    while x < 1090:
        bw, bh = random.randint(50, 110), random.randint(60, 230)
        bld += f'<rect x="{x}" y="{860 - bh}" width="{bw}" height="{bh + 20}" rx="3"/>'
        for wy in range(860 - bh + 14, 850, 22):
            for wx in range(x + 10, x + bw - 12, 18):
                if random.random() < .28:
                    win += f'<rect x="{wx}" y="{wy}" width="7" height="10" rx="1"/>'
        x += bw + random.randint(-6, 8)
    # 电车
    tx, ty = 50, 840
    tw, th = 560, 118
    tram_win = ''.join(f'<rect x="{tx + 46 + i*62}" y="{ty + 22}" width="44" height="40" rx="7"/>' for i in range(8))
    heads = ''.join(f'<circle cx="{tx + 40 + i*62 + random.uniform(10, 34):.0f}" cy="{ty + 48}" r="9"/>' for i in (1, 3, 4, 6))
    tram = f'''
<g filter="url(#rough)">
 <path d="M{tx} {ty + th} V{ty + 30} Q{tx} {ty} {tx + 34} {ty} H{tx + tw - 34} Q{tx + tw} {ty} {tx + tw} {ty + 30} V{ty + th} Z" fill="#3F6266"/>
 <rect x="{tx}" y="{ty + 72}" width="{tw}" height="20" fill="#7E9894"/>
 <rect x="{tx + 6}" y="{ty + th - 6}" width="{tw - 12}" height="16" rx="5" fill="#123224"/>
</g>
<g fill="#A9BDB4">{tram_win}</g>
<g fill="#7A5A2A" opacity=".45">{heads}</g>
<circle cx="{tx + 14}" cy="{ty + 100}" r="7" fill="#FFF1B8"/>
<path d="M{tx + 250} {ty} L{tx + 290} {ty - 34} L{tx + 330} {ty} M{tx + 270} {ty - 34} H{tx + 312}" stroke="#123224" stroke-width="4" fill="none"/>
<circle cx="{tx + 110}" cy="{ty + th + 12}" r="13" fill="#0E2A1E"/><circle cx="{tx + tw - 110}" cy="{ty + th + 12}" r="13" fill="#0E2A1E"/>'''
    # 车站和路灯
    lx = 900
    stop = f'''
<path d="M0 {ty - 36} Q540 {ty - 26} 1080 {ty - 38}" stroke="#0E2A1E" stroke-width="2.5" fill="none" opacity=".8"/>
<polygon points="{lx - 26},{688} {lx + 26},{688} {lx + 210},{1160} {lx - 250},{1160}" fill="#FFE8A8" opacity=".22" filter="url(#bl14)"/>
<ellipse cx="{lx - 20}" cy="1160" rx="230" ry="44" fill="#FBEBC0" opacity=".9" filter="url(#bl14)"/>
<g filter="url(#rough2)">
 <path d="M{lx + 60} 1160 V660 Q{lx + 60} 640 {lx + 40} 640 H{lx + 6}" stroke="#123224" stroke-width="9" fill="none" stroke-linecap="round"/>
 <path d="M{lx - 24} 690 Q{lx} 652 {lx + 26} 690 Z" fill="#123224"/>
 <path d="M{lx - 230} 1010 V940" stroke="#123224" stroke-width="5"/>
 <rect x="{lx - 262}" y="900" width="64" height="44" rx="6" fill="#F4E6C4" stroke="#123224" stroke-width="3"/>
 <path d="M{lx - 250} 916 H{lx - 210} M{lx - 250} 928 H{lx - 222}" stroke="#2E7A57" stroke-width="4" stroke-linecap="round"/>
</g>
<circle cx="{lx}" cy="692" r="40" fill="#FFF0B8" opacity=".7" filter="url(#bl14)"/>
<circle cx="{lx}" cy="692" r="10" fill="#FFF8DA"/>'''
    her = f'<g transform="translate(350 1232) scale(1.05)" filter="url(#wc85)"><ellipse cx="0" cy="0" rx="80" ry="9" fill="#000" opacity=".18"/>{woman_walk()}</g>'
    him = f'<g transform="translate(850 1212) scale(1.05)" filter="url(#wc85)"><ellipse cx="20" cy="0" rx="70" ry="9" fill="#000" opacity=".16"/>{man_lean()}</g>'
    body = f'''
<defs>
 <linearGradient id="bg85" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0D2A3A"/><stop offset=".45" stop-color="#1D4F5A"/><stop offset=".68" stop-color="#6B7F86"/><stop offset=".78" stop-color="#C9A28E"/></linearGradient>
 {wc_filter('wc85')}
 {wash('w85a', 11, '.004 .006', (.02, .05, .08), 1.6, -.55)}
 {wash('w85b', 23, '.012', (.9, .85, .75), 1.2, -.5)}
</defs>
<rect width="{W}" height="{H}" fill="url(#bg85)"/>
<rect width="{W}" height="{H}" filter="url(#w85a)" opacity=".55"/>
<rect width="{W}" height="900" filter="url(#w85b)" opacity=".18"/>
{hatch(900, 0, 0, W, 760, '#BFD6D6', .07, ang=-14, ln=(6, 14), w=1.1)}
<circle cx="820" cy="300" r="190" fill="#FFF3D2" opacity=".18" filter="url(#bl60)"/>
<g filter="url(#rough)"><circle cx="820" cy="300" r="118" fill="#FBEFD0"/></g>
{hatch(90, 720, 200, 920, 400, '#E8D7AE', .35, ang=-40, ln=(8, 16), w=1.6).replace('<path', '<path clip-path="url(#mc85)"')}
<clipPath id="mc85"><circle cx="820" cy="300" r="112"/></clipPath>
<g fill="#FFF6DC" opacity=".8">{stars}</g>
<g fill="#FFF6DC">{crosses}</g>
<g fill="#1A3A3F" filter="url(#rough)">{bld}</g>
<g fill="#F8D27E" opacity=".85">{win}</g>
<rect y="850" width="{W}" height="{H}" fill="#0F3426"/>
<path d="M0 980 H1080 M0 996 H1080" stroke="#4E6F5E" stroke-width="3" opacity=".7"/>
<rect y="1010" width="{W}" height="{H}" fill="#1B4634"/>
<path d="M0 1010 H1080" stroke="#557E68" stroke-width="5"/>
<g stroke="#2C5A45" stroke-width="2" opacity=".8">{''.join(f'<path d="M{x} 1012 L{x + (x-540)*.9:.0f} 1350"/>' for x in range(-60, 1200, 110))}<path d="M0 1080 H1080 M0 1180 H1080"/></g>
{tram}
{stop}
{her}{him}
{hatch(500, 0, 1000, W, 1350, '#3D6B55', .25, ang=-20, ln=(14, 30))}
{tag('MELBOURNE · 6:40 PM')}
{headline(META['lines'], y=290, size=64, colors=(C['cream'], C['lime']), lh=82)}
{wordmark(1268, '#fff', sub=False)}
{grain(.2)}'''
    return page(body)
