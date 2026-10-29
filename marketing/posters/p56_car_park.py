from lib import *

META = dict(
    id=56, slug='car-park', title='停车场认人', lines=['停车场认人，', '靠球包。'],
    style=['写实光影', '色块', '幽默'], tone='暖色', demo=False,
    concept='柏油停车位上两只球包并肩立着，一只绿、一只藏蓝，拍头探出，长长的影子伸向对方；第一次见面靠球包认人',
    use='第一次约陌生球友；见面的小尴尬',
)


def svg():
    random.seed(56)
    def bag(x, base, accent, name):
        return f'''<g transform="translate({x} 0)">
 <ellipse cx="0" cy="1048" rx="140" ry="16" fill="#000" opacity=".4" filter="url(#bl14)"/>
 <path d="M-90 1040 L{(-90+(540-x)*0.0)} 1046 L{540-x+10} 1046" stroke="#000" stroke-width="0" fill="none"/>
 <ellipse cx="0" cy="560" rx="82" ry="102" fill="none" stroke="#14181B" stroke-width="16"/><ellipse cx="0" cy="560" rx="82" ry="102" fill="none" stroke="#F7EBD6" stroke-width="2" opacity=".6"/>
 <path d="M-62 560 H62 M0 462 V658 M-40 490 V630 M40 490 V630 M-76 525 H76 M-76 595 H76" stroke="#F7EBD6" stroke-width="2" opacity=".5"/>
 <rect x="-20" y="650" width="40" height="80" rx="8" fill="#14181B"/>
 <rect x="-110" y="705" width="220" height="345" rx="56" fill="{base}"/><rect x="-110" y="705" width="220" height="345" rx="56" fill="url(#sh56)"/>
 <rect x="-110" y="810" width="220" height="30" fill="{accent}"/><rect x="-62" y="870" width="124" height="110" rx="22" fill="#000" opacity=".16"/>
 <path d="M-72 712 q72 -62 144 0" fill="none" stroke="#14181B" stroke-width="12" stroke-linecap="round"/>
</g>'''
    stripes = ''.join(f'<path d="M{x} 780 L{x+(x-540)*.35:.0f} {H}" stroke="#F7EBD6" stroke-width="10" opacity=".55"/>' for x in (100, 330, 540, 750, 980))
    body = f'''
<defs><linearGradient id="as56" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3F44"/><stop offset="1" stop-color="#1D2124"/></linearGradient>
<linearGradient id="sh56" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
<linearGradient id="sk56" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F29A4E"/><stop offset="1" stop-color="#F6C98A"/></linearGradient></defs>
<rect width="{W}" height="{H}" fill="url(#sk56)"/>
<rect y="780" width="{W}" height="{H-780}" fill="url(#as56)"/>
{stripes}
{bag(300, '#1B6B4A', '#C6EA3D', 'a')}<g transform='rotate(4 780 1048)'>{bag(780, '#1D3557', '#F6C343', 'b')}</g>
<text x="540" y="650" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="84" fill="#3A1B0C" opacity=".85">？</text>
<path d="M420 700 h200" stroke="#3A1B0C" stroke-width="3" stroke-dasharray="2 12" stroke-linecap="round" opacity=".6"/>
{tag('FIRST MEETING', color='#4A2410', rule='#4A2410')}
{headline(META['lines'], y=290, size=64, colors='#3A1B0C', ls=3, lh=82)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18, True)}'''
    return page(body)
