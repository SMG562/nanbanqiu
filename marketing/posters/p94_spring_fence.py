from lib import *

META = dict(
    id=94, slug='spring-fence', title='球场边的花', lines=['球场边的花，', '又开了。'],
    style=['写实光影', '极简'], tone='亮色', demo=False,
    concept='晴天，一枝白花从右上伸到绿色围网前；网后是虚化的球场和蓝天；网眼里卡着一颗球——春天回来的不只是花',
    use='春季约球；日常、明亮、克制，一处可细看的小细节（卡在网上的球）',
)


def flower(rnd, cx, cy, r, rot):
    petals = ''
    for k in range(5):
        a = rot + k * 72
        px, py = cx + r * .52 * math.cos(math.radians(a)), cy + r * .52 * math.sin(math.radians(a))
        petals += f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{r*.56:.1f}" ry="{r*.46:.1f}" transform="rotate({a:.0f} {px:.1f} {py:.1f})" fill="url(#pet94)" stroke="#E9E4DA" stroke-width="1"/>'
    stamens = ''.join(f'<circle cx="{cx + rnd.gauss(0, r*.12):.1f}" cy="{cy + rnd.gauss(0, r*.12):.1f}" r="{r*.05:.1f}" fill="#E7B83A"/>' for _ in range(12))
    return f'<g><ellipse cx="{cx + r*.15:.0f}" cy="{cy + r*.2:.0f}" rx="{r:.0f}" ry="{r*.9:.0f}" fill="#4B6A86" opacity=".18" filter="url(#bl6)"/>{petals}<circle cx="{cx}" cy="{cy}" r="{r*.2:.1f}" fill="#F2E3A8"/>{stamens}</g>'


def leaf(cx, cy, L, a):
    return f'<g transform="translate({cx} {cy}) rotate({a})"><path d="M0 0 Q{L*.5} {-L*.28} {L} 0 Q{L*.5} {L*.28} 0 0Z" fill="#2F7A45"/><path d="M0 0 Q{L*.5} {-L*.28} {L} 0" fill="#3E9356" opacity=".8"/><path d="M2 0 H{L*.92}" stroke="#7DBB7A" stroke-width="1.4"/></g>'


def svg():
    rnd = random.Random(94)
    # 网后：虚化的蓝天、远树、绿色硬地球场与白线
    back = '''<rect width="1080" height="1350" fill="url(#sky94)"/>
<g filter="url(#bl14)"><ellipse cx="200" cy="820" rx="300" ry="90" fill="#7FB07A"/><ellipse cx="760" cy="800" rx="380" ry="80" fill="#8DBA80"/><ellipse cx="1040" cy="840" rx="200" ry="70" fill="#76A671"/></g>
<rect y="860" width="1080" height="490" fill="#55A579"/>
<g filter="url(#bl6)"><path d="M-40 1000 L1120 940" stroke="#F4F8F2" stroke-width="10"/><path d="M640 950 L760 1350" stroke="#F4F8F2" stroke-width="12"/><rect y="860" width="1080" height="30" fill="#5FA57C" opacity=".6"/></g>'''
    # 围网：深绿包塑铁丝，菱形网眼
    s = 64
    mesh = ''
    for x in range(-1400, 1500, s):
        mesh += f'<path d="M{x} 470 l1000 1000"/><path d="M{x+1000} 470 l-1000 1000"/>'
    post = '<rect x="96" y="470" width="16" height="980" fill="#1F4A35"/><rect x="96" y="470" width="16" height="980" fill="url(#post94)"/>'
    rail = '<rect x="0" y="462" width="1080" height="14" fill="#1F4A35"/><rect x="0" y="462" width="1080" height="4" fill="#5E8E72"/>'
    # 卡在网眼里的球（网线压在球上）
    bx, by, br = 740, 820, 34
    # 花枝从右上伸进来
    branch = '<path d="M1120 120 C980 200 900 260 820 380 C770 450 720 470 640 500" stroke="#5A4634" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M900 270 C880 330 870 360 880 420" stroke="#5A4634" stroke-width="6" fill="none" stroke-linecap="round"/>'
    leaves = ''.join(leaf(x, y, L, a) for x, y, L, a in [(960, 220, 70, 150), (850, 330, 60, 200), (700, 485, 64, 160), (880, 420, 58, 100), (1020, 170, 66, 210)])
    flowers = ''.join(flower(rnd, x, y, r, rot) for x, y, r, rot in [(820, 390, 46, 10), (650, 505, 40, 40), (905, 255, 38, 70), (885, 430, 30, 0), (1010, 140, 34, 30)])
    buds = ''.join(f'<ellipse cx="{x}" cy="{y}" rx="9" ry="12" fill="#F7EFE6" stroke="#E2D7C8"/>' for x, y in [(740, 470), (960, 300)])
    body = f'''
<defs>
<linearGradient id="sky94" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F64D8"/><stop offset=".45" stop-color="#5D9BEA"/><stop offset=".62" stop-color="#BFD9F6"/></linearGradient>
<radialGradient id="pet94" cx="35%" cy="35%" r="80%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEF0F2"/></radialGradient>
<linearGradient id="post94" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
<clipPath id="fc94"><rect x="0" y="476" width="1080" height="980"/></clipPath>
</defs>
{back}
<g filter="url(#bl6)" opacity=".18">{''.join(f'<path d="M{x} 470 l1000 1000" stroke="#0B2A1C" stroke-width="2"/>' for x in range(-1400, 1500, s))}</g>
<ellipse cx="{bx + 8}" cy="{by + 30}" rx="{br}" ry="10" fill="#0B2A1C" opacity=".25" filter="url(#bl6)"/>
{ball('b94', bx, by, br, rot=-25)}
<g clip-path="url(#fc94)" stroke="#1C4632" stroke-width="2.2" fill="none">{mesh}</g>
<g clip-path="url(#fc94)" stroke="#6FA088" stroke-width=".9" fill="none" opacity=".7" transform="translate(-.8 -.8)">{mesh}</g>
{rail}{post}
{branch}{leaves}{buds}{flowers}
{tag('SPRING · COURT 2', color='#FFFFFF', op=.85)}
{headline(META['lines'], y=290, size=64, colors=('#FFFFFF', C['lime']), ls=4, lh=84)}
<rect y="1210" width="{W}" height="140" fill="#0B3B2A" opacity=".0"/>
{wordmark(1268, '#fff', sub=False)}
{grain(.06, light=True)}'''
    return page(body)
