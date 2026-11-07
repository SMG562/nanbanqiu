from lib import *

META = dict(
    id=101, slug='clothesline', title='洗不干净了', lines=['白袜子，', '洗不干净了。'],
    style=['写实光影', '极简'], tone='亮色', demo=False,
    concept='蓝天下的晾衣绳：一件白球衣、一双白袜子用木夹子夹着，被风吹得微微鼓起；袜底还留着一片洗不掉的红土色',
    use='打过红土的人都懂；明亮、干净、一处小细节',
)


def svg():
    rnd = random.Random(101)
    def ly(x):                       # 晾衣绳（下垂）
        t = (x + 20) / 1120
        return 500 + 40 * t + 70 * math.sin(math.pi * t)
    line = 'M-20 500 ' + ' '.join(f'L{x} {ly(x):.1f}' for x in range(0, 1110, 20))
    def peg(x):
        y = ly(x)
        return f'<rect x="{x-7}" y="{y-16:.0f}" width="14" height="42" rx="3" fill="#D9B98C"/><rect x="{x-7}" y="{y-16:.0f}" width="5" height="42" rx="2" fill="#E9D0A8"/><rect x="{x-8}" y="{y+2:.0f}" width="16" height="4" fill="#9C9A96"/>'
    # 球衣（polo）
    sx, sy = 120, ly(120) + 6
    shirt = f'''<g transform="translate({sx} {sy:.0f}) rotate(4)">
<path d="M0 0 L110 -6 Q150 30 200 -8 L310 0 L360 110 L300 140 L292 470 Q160 492 18 470 L12 140 L-50 110Z" fill="url(#cloth101)"/>
<path d="M110 -6 Q150 30 200 -8 L188 40 Q154 66 122 40Z" fill="#FFFFFF" stroke="#DDE3EA" stroke-width="2"/>
<path d="M155 52 V170" stroke="#DDE3EA" stroke-width="3"/><circle cx="155" cy="90" r="4" fill="#E2E7EE"/><circle cx="155" cy="130" r="4" fill="#E2E7EE"/>
<path d="M60 160 Q80 300 70 450 M240 170 Q230 300 250 455" stroke="#D3DCE7" stroke-width="10" fill="none" opacity=".6" filter="url(#bl6)"/>
<path d="M12 140 L-50 110 L-38 96 M300 140 L360 110" stroke="#DDE3EA" stroke-width="3" fill="none"/>
<rect x="232" y="96" width="34" height="22" rx="4" fill="#176B4D" opacity=".85"/>
</g>'''
    # 袜子：夹住袜口，脚尖向右；袜底一片红土色
    def sock(x, id, rot, s=1.0):
        y = ly(x) + 4
        d = 'M2 0 H108 C110 80 114 170 120 222 C126 252 150 262 186 266 C232 270 262 274 280 296 C296 322 280 352 244 354 C190 358 120 360 70 352 C20 344 2 316 0 270 C-2 180 0 90 2 0Z'
        return f'''<g transform="translate({x} {y:.0f}) rotate({rot}) scale({s})">
<clipPath id="sc{id}"><path d="{d}"/></clipPath>
<path d="{d}" fill="url(#sock101)"/>
<g clip-path="url(#sc{id})">
<rect x="-10" y="0" width="140" height="56" fill="#FFFFFF"/>{''.join(f'<path d="M{k} 4 V52" stroke="#E3E8EE" stroke-width="2"/>' for k in range(8, 108, 10))}
<rect x="-10" y="16" width="140" height="6" fill="#176B4D"/><rect x="-10" y="28" width="140" height="4" fill="#C6EA3D"/>
<path d="M-10 318 Q80 300 160 316 Q230 330 300 318 V370 H-10Z" fill="url(#clay101)"/>
<path d="M-10 296 Q30 280 70 300" stroke="#C4562F" stroke-width="18" fill="none" opacity=".35" filter="url(#bl6)"/>
{''.join(f'<circle cx="{rnd.uniform(20, 270):.0f}" cy="{rnd.uniform(318, 350):.0f}" r="{rnd.uniform(1.5, 4):.1f}" fill="#A8401F" opacity=".5"/>' for _ in range(16))}
<path d="M30 70 Q50 160 40 250" stroke="#D3DCE7" stroke-width="12" fill="none" opacity=".55" filter="url(#bl6)"/>
</g>
<path d="{d}" fill="none" stroke="#DDE3EA" stroke-width="1.5"/>
</g>'''
    socks = sock(600, 'a', 3, 1.0) + sock(790, 'b', -2, .96)
    clouds = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="#FFFFFF" opacity=".75" filter="url(#bl28)"/>' for x, y, rx, ry in [(860, 230, 220, 50), (300, 1040, 300, 60), (900, 1100, 200, 40)])
    leaves = ''.join(f'<g transform="translate({x} {y}) rotate({a})"><path d="M0 0 Q40 -12 90 0 Q40 12 0 0Z" fill="{c}"/></g>' for x, y, a, c in [(960, 60, 120, '#5C8C5A'), (1000, 30, 150, '#4E7E4E'), (930, 110, 95, '#6B9A63'), (1040, 90, 110, '#5C8C5A'), (990, 140, 80, '#4E7E4E')])
    body = f'''
<defs>
<linearGradient id="sky101" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F6BDB"/><stop offset=".6" stop-color="#5E9FEC"/><stop offset="1" stop-color="#B9D7F7"/></linearGradient>
<linearGradient id="cloth101" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E9EEF4"/></linearGradient>
<linearGradient id="sock101" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E6EBF1"/></linearGradient>
<linearGradient id="clay101" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9774E" stop-opacity=".35"/><stop offset=".4" stop-color="#C9603A" stop-opacity=".7"/><stop offset="1" stop-color="#B24E2B" stop-opacity=".85"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sky101)"/>
<circle cx="120" cy="120" r="300" fill="#FFFFFF" opacity=".25" filter="url(#bl60)"/>
{clouds}
<path d="M-20 520 L1100 560" stroke="#000" stroke-width="0"/>
{shirt}{socks}
<path d="{line}" stroke="#F4F1EA" stroke-width="3" fill="none"/>
{''.join(peg(x) for x in (150, 440, 630, 690, 815, 880))}
{leaves}
<path d="M-20 1190 C200 1170 420 1180 640 1176 C840 1172 960 1166 1100 1170 V1360 H-20Z" fill="#2F6B3D"/>
<path d="M-20 1206 C300 1196 700 1200 1100 1190 V1360 H-20Z" fill="#245831"/>
{tag('AFTER CLAY · SUNDAY', color='#FFFFFF', op=.85)}
{headline(META['lines'], y=290, size=62, colors=('#FFFFFF', C['lime']), ls=3, lh=84)}
{wordmark(1268, '#fff', sub=False)}
{grain(.05, light=True)}'''
    return page(body)
