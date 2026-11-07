from lib import *

META = dict(
    id=100, slug='passenger', title='副驾驶', lines=['副驾驶的位置，', '留给了球拍。'],
    style=['写实光影', '极简'], tone='浅色', demo=False,
    concept='清晨开车去球场：副驾驶座上斜放着一支球拍，安全带认认真真给它系上了；窗外是逆光里虚化的街和树',
    use='去打球路上的日常；一处看一会儿才笑的细节（给球拍系安全带）',
)


def svg():
    rnd = random.Random(100)
    # 车窗外：清晨逆光的街，虚化
    street = '''<g filter="url(#bl14)">
<rect x="60" y="420" width="960" height="360" fill="url(#out100)"/>
<rect x="120" y="560" width="160" height="200" fill="#E6CDB0"/><path d="M110 560 L200 500 L290 560Z" fill="#C79C7A"/>
<rect x="330" y="590" width="130" height="170" fill="#EED9C0"/>
<circle cx="600" cy="560" r="110" fill="#6E9B63"/><circle cx="700" cy="600" r="90" fill="#7FAA6E"/>
<rect x="760" y="580" width="200" height="180" fill="#E9D3B6"/>
<circle cx="900" cy="470" r="80" fill="#FFF3D2"/>
</g>
<circle cx="900" cy="470" r="150" fill="#FFF0C8" opacity=".55" filter="url(#bl60)"/>'''
    window = f'''<clipPath id="win100"><path d="M90 760 L90 520 Q100 430 230 420 L960 400 Q1010 400 1010 460 L1010 760Z"/></clipPath>
<g clip-path="url(#win100)">{street}</g>
<path d="M90 760 L90 520 Q100 430 230 420 L960 400 Q1010 400 1010 460 L1010 760Z" fill="none" stroke="#3A3D42" stroke-width="22"/>'''
    # 座椅
    seat = '''<path d="M560 1060 L540 560 Q540 500 600 496 L860 490 Q920 492 922 556 L930 1060Z" fill="url(#seat100)"/>
<path d="M600 520 L606 1040 M880 516 L886 1040" stroke="#B4AA9A" stroke-width="2" stroke-dasharray="6 6"/>
<path d="M646 560 L652 1040 M836 556 L842 1040" stroke="#BDB3A3" stroke-width="2"/>
<rect x="636" y="372" width="200" height="140" rx="44" fill="url(#seat100)"/>
<path d="M680 512 V540 M792 512 V540" stroke="#8C8478" stroke-width="10"/>
<path d="M470 1040 Q470 1010 520 1006 L960 1000 Q1010 1004 1010 1040 L1010 1150 Q1010 1180 970 1180 L500 1180 Q470 1180 470 1150Z" fill="url(#cush100)"/>
<path d="M500 1060 H980" stroke="#B4AA9A" stroke-width="2" stroke-dasharray="6 6"/>'''
    sun = '<path d="M520 380 L760 380 L1100 1200 L780 1200Z" fill="#FFF4DA" opacity=".28" filter="url(#bl28)"/>'
    racket = '''<g transform="rotate(24 720 820)">
<clipPath id="rc100"><ellipse cx="720" cy="660" rx="92" ry="122"/></clipPath>
<ellipse cx="736" cy="680" rx="104" ry="134" fill="#7E7466" opacity=".25" filter="url(#bl6)"/>
<g clip-path="url(#rc100)" stroke="#EFEAE0" stroke-width="2.2">''' + ''.join(f'<path d="M{x} 520 V800"/>' for x in range(620, 822, 17)) + ''.join(f'<path d="M590 {y} H850"/>' for y in range(530, 800, 17)) + '''</g>
<ellipse cx="720" cy="660" rx="100" ry="130" fill="none" stroke="#18332A" stroke-width="15"/>
<path d="M666 772 Q706 830 708 890 M774 772 Q734 830 732 890" stroke="#18332A" stroke-width="12" fill="none"/>
<rect x="705" y="885" width="30" height="80" rx="9" fill="#18332A"/>
<rect x="705" y="960" width="30" height="170" rx="10" fill="#F4F1EA"/>
<path d="M705 990 l30 -14 M705 1020 l30 -14 M705 1050 l30 -14 M705 1080 l30 -14" stroke="#D9D3C6" stroke-width="2"/>
<rect x="703" y="1122" width="34" height="14" rx="5" fill="#C6EA3D"/>
</g>'''
    # 安全带：从右上 B 柱斜跨过球拍到左下卡扣；腰带横过手柄
    belt = '''<path d="M1010 470 L560 1060" stroke="#2F3236" stroke-width="30" stroke-linecap="butt"/>
<path d="M1010 470 L560 1060" stroke="#4A4E54" stroke-width="2" transform="translate(-10 -6)"/>
<path d="M560 1060 L1010 1110" stroke="#2F3236" stroke-width="28"/>
<rect x="520" y="1030" width="64" height="44" rx="8" fill="#2A2C30" transform="rotate(-12 552 1052)"/>
<rect x="534" y="1040" width="36" height="8" rx="3" fill="#8F959C" transform="rotate(-12 552 1052)"/>
<rect x="990" y="440" width="40" height="70" rx="8" fill="#3A3D42"/>'''
    body = f'''
<defs>
<linearGradient id="int100" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9E3D9"/><stop offset="1" stop-color="#DCD4C7"/></linearGradient>
<linearGradient id="out100" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9CC8F2"/><stop offset=".55" stop-color="#F8E6CB"/><stop offset="1" stop-color="#E9D2B4"/></linearGradient>
<linearGradient id="seat100" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DCD3C4"/><stop offset=".5" stop-color="#EAE3D6"/><stop offset="1" stop-color="#CFC5B5"/></linearGradient>
<linearGradient id="cush100" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ECE5D8"/><stop offset="1" stop-color="#CFC5B5"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#int100)"/>
{window}
<rect x="0" y="760" width="{W}" height="460" fill="#E3DBCE"/>
<path d="M0 820 H1080" stroke="#D2C8B8" stroke-width="3"/>
{seat}
{sun}
{racket}
{belt}
<rect y="1200" width="{W}" height="150" fill="#2E3034"/>
{tag('SUNDAY · 6:50 AM', color='#3B4A42', rule='#176B4D', op=.75)}
{headline(META['lines'], y=290, size=60, colors=('#0B3B2A', '#176B4D'), ls=3, lh=80)}
{wordmark(1268, '#FFFFFF', sub=False)}
{grain(.08, light=True)}'''
    return page(body)
