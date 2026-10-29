from lib import *

META = dict(
    id=60, slug='not-waiting', title='我才没在等', lines=['我才没在等。', '只是在练发球。'],
    style=['写实光影', '色块', '幽默'], tone='亮色', demo=False,
    concept='蓝色硬地与浅蓝天两块大色块：一只球被抛到半空，地上一篓球，手机立在球包旁，屏幕亮着 7:03；嘴上说没在等',
    use='对方迟到时的小心思；等人的小尴尬',
)


def svg():
    random.seed(60)
    gy = 860
    pile = ''.join(ball(f'h{i}', 760 + dx, gy - 130 + dy, 30, rot=i * 33) for i, (dx, dy) in enumerate([(-50, 20), (0, 10), (50, 20), (-24, -26), (26, -26), (0, -60)]))
    body = f'''
<defs><linearGradient id="sk60" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC4E8"/><stop offset="1" stop-color="#D9EAF6"/></linearGradient>
<linearGradient id="gd60" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3C74B6"/><stop offset="1" stop-color="#244B80"/></linearGradient>
<linearGradient id="ph60" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2C3338"/><stop offset="1" stop-color="#0F1316"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#sk60)"/>
<rect y="{gy}" width="{W}" height="{H-gy}" fill="url(#gd60)"/><path d="M0 {gy} H1080" stroke="#F7EBD6" stroke-width="4" opacity=".7"/>
<path d="M0 1010 H1080 M540 {gy} V1190" stroke="#F7EBD6" stroke-width="3" opacity=".3"/>
<path d="M320 {gy-100} V650" stroke="#2A4A70" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round" opacity=".6"/>
{ball('t', 320, 580, 36, rot=30, blur=2)}
<ellipse cx="320" cy="{gy+40}" rx="36" ry="7" fill="#000" opacity=".25" filter="url(#bl6)"/>
<ellipse cx="760" cy="{gy+6}" rx="130" ry="16" fill="#000" opacity=".35" filter="url(#bl14)"/>
<path d="M650 {gy-100} h220 l-24 100 h-172 Z" fill="none" stroke="#E8EDF0" stroke-width="6"/><path d="M670 {gy-100} l14 100 M720 {gy-100} v100 M770 {gy-100} v100 M820 {gy-100} l-14 100" stroke="#E8EDF0" stroke-width="3" opacity=".7"/>
{pile}
<path d="M650 {gy-100} h220" stroke="#E8EDF0" stroke-width="8" stroke-linecap="round"/>
<g transform="translate(180 {gy+10}) rotate(-8)">
 <ellipse cx="60" cy="30" rx="80" ry="10" fill="#000" opacity=".3" filter="url(#bl6)"/>
 <rect x="0" y="-230" width="120" height="250" rx="16" fill="url(#ph60)"/>
 <rect x="10" y="-220" width="100" height="230" rx="10" fill="#F6F1E2"/>
 <text x="60" y="-120" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="46" fill="#0B3B2A">7:03</text>
 <rect x="22" y="-90" width="76" height="14" rx="7" fill="#0B3B2A" opacity=".15"/><rect x="22" y="-66" width="56" height="14" rx="7" fill="#0B3B2A" opacity=".15"/>
 <circle cx="60" cy="-120" r="130" fill="#FFF6D8" opacity=".25" filter="url(#bl28)"/>
</g>
{tag('JUST SERVING', color='#10345A', rule='#10345A')}
{headline(META['lines'], y=290, size=58, colors='#10345A', ls=3, lh=76)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.16, True)}'''
    return page(body)
