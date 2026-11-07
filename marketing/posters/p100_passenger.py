from lib import *

META = dict(
    id=100, slug='passenger', title='副驾驶', lines=['副驾驶的位置，', '留给了球拍。'],
    style=['平面', '极简', '光影'], tone='浅色', demo=False,
    concept='扁平光影插画：清晨开车去球场，副驾驶座上斜放着一支球拍，安全带认认真真给它系好；车窗的光斑锐利地落在座椅和球拍上',
    use='去打球路上的日常；看一会儿才笑的细节（给球拍系安全带）',
)


def svg():
    INT, INT_S = '#E9DDC9', '#DACBB2'
    SEAT, SEAT_L, SEAT_S = '#C9B494', '#E3D2B4', '#B39C79'
    LIGHT = '#F6E3BE'
    # 车窗：外面是平涂的清晨街景
    win = 'M80 760 L80 540 Q90 440 220 430 L960 410 Q1010 410 1010 470 L1010 760Z'
    outside = f'''<clipPath id="w100"><path d="{win}"/></clipPath><g clip-path="url(#w100)">
<rect x="60" y="400" width="980" height="380" fill="#F4C99C"/>
<rect x="60" y="400" width="980" height="150" fill="#A9CBE8"/><rect x="60" y="540" width="980" height="60" fill="#D8D6CF"/>
<circle cx="900" cy="560" r="44" fill="#FFF1D6"/>
<path d="M120 760 V600 L190 560 L260 600 V760Z" fill="#D9A47E"/><path d="M280 760 V620 H390 V760Z" fill="#E8BE96"/>
<path d="M400 760 V640 Q470 560 540 640 V760Z" fill="#6E9A7E"/><circle cx="470" cy="610" r="64" fill="#5E8C70"/>
<path d="M560 760 V610 L640 570 L720 610 V760Z" fill="#CF9670"/><circle cx="800" cy="640" r="70" fill="#7EA88A"/>
<rect x="60" y="700" width="980" height="60" fill="#C7B39A"/></g>
<path d="{win}" fill="none" stroke="#33373C" stroke-width="22"/>'''
    seat = f'''<path d="M548 1060 L532 570 Q532 504 596 500 L862 494 Q926 496 928 560 L936 1060Z" fill="{SEAT}"/>
<path d="M600 520 L616 1050 H864 L878 520Z" fill="{SEAT_L}"/>
<path d="M740 520 L740 1050" stroke="{SEAT_S}" stroke-width="2"/>
{''.join(f'<path d="M{608+k*0} {600+k*90} H870" stroke="{SEAT_S}" stroke-width="2"/>' for k in range(5))}
<rect x="640" y="370" width="196" height="136" rx="46" fill="{SEAT}"/><rect x="660" y="384" width="156" height="104" rx="36" fill="{SEAT_L}"/>
<rect x="682" y="504" width="10" height="26" fill="#8B8170"/><rect x="784" y="504" width="10" height="26" fill="#8B8170"/>
<path d="M470 1050 Q470 1010 520 1006 L960 1000 Q1010 1004 1010 1044 L1010 1150 Q1010 1180 970 1180 L506 1180 Q470 1180 470 1150Z" fill="{SEAT}"/>
<path d="M500 1030 H980 V1150 H500Z" fill="{SEAT_L}"/>'''
    # 车窗投下的光斑：锐利的斜四边形，盖在座椅和球拍上
    patch = f'<path d="M600 560 L900 540 L1010 1120 L700 1150Z" fill="{LIGHT}" opacity=".7"/>'
    racket = '''<g transform="rotate(24 720 820)">
<clipPath id="rc100"><ellipse cx="720" cy="660" rx="90" ry="120"/></clipPath>
<ellipse cx="748" cy="690" rx="100" ry="130" fill="#B39C79"/>
<g clip-path="url(#rc100)" stroke="#F5EFE2" stroke-width="2.4">''' + ''.join(f'<path d="M{x} 520 V800"/>' for x in range(622, 822, 18)) + ''.join(f'<path d="M590 {y} H850"/>' for y in range(532, 800, 18)) + '''</g>
<ellipse cx="720" cy="660" rx="100" ry="130" fill="none" stroke="#1B2E27" stroke-width="16"/>
<path d="M664 774 Q706 832 708 890 M776 774 Q734 832 732 890" stroke="#1B2E27" stroke-width="12" fill="none"/>
<rect x="704" y="885" width="32" height="80" rx="9" fill="#1B2E27"/>
<rect x="704" y="960" width="32" height="170" rx="10" fill="#F6F2EA"/>
<path d="M704 992 l32 -15 M704 1024 l32 -15 M704 1056 l32 -15 M704 1088 l32 -15" stroke="#DDD6C9" stroke-width="2.4"/>
<rect x="702" y="1122" width="36" height="14" rx="5" fill="#C6EA3D"/></g>'''
    belt = '''<path d="M1004 486 L560 1064" stroke="#2C3034" stroke-width="32"/>
<path d="M1004 486 L560 1064" stroke="#3D4248" stroke-width="10" transform="translate(-6 -5)"/>
<path d="M560 1064 L1010 1112" stroke="#2C3034" stroke-width="28"/>
<g transform="rotate(-12 552 1056)"><rect x="518" y="1034" width="70" height="46" rx="8" fill="#26292D"/><rect x="532" y="1046" width="40" height="9" rx="3" fill="#9AA1A8"/></g>
<rect x="984" y="450" width="44" height="74" rx="9" fill="#3A3E44"/>'''
    body = f'''
<rect width="{W}" height="{H}" fill="{INT}"/>
{outside}
<rect y="760" width="{W}" height="460" fill="{INT_S}"/>
{seat}{patch}{racket}{belt}
<rect y="1200" width="{W}" height="150" fill="#2C2F33"/>
{tag('SUNDAY · 6:50 AM', color='#3B4A42', rule='#176B4D', op=.75)}
<text x="80" y="290" font-family="{SANS}" font-weight="700" font-size="54" letter-spacing="4" fill="#173D2F">副驾驶的位置，</text>
<text x="80" y="366" font-family="{SANS}" font-weight="700" font-size="54" letter-spacing="4" fill="#2E7A57">留给了球拍。</text>
{wordmark(1272, '#FFFFFF', sub=False)}
{grain(.09, light=True)}'''
    return page(body)
