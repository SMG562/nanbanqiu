from lib import *

META = dict(
    id=53, slug='wait-you', title='怕你来，又怕你不来', lines=['怕你来，', '又怕你不来。'],
    style=['写实光影', '夜景', '心理'], tone='深色', demo=False,
    concept='晚上 6:58，球场灯已亮，长椅上只有自己的球包；场外远处一对车灯正缓缓靠近，不知道是不是你',
    use='约球等人的小心思；第一次约陌生球友的忐忑',
)


def svg():
    random.seed(53)
    r = random.Random(53)
    stars = ''.join(f'<circle cx="{r.uniform(0,1080):.0f}" cy="{r.uniform(40,620):.0f}" r="{r.uniform(.8,1.7):.1f}" fill="#F7EBD6" opacity="{r.uniform(.2,.8):.2f}"/>' for _ in range(60))
    fence = ''.join(f'<path d="M{x} 770 V905" stroke="#050E1C" stroke-width="2" opacity=".75"/>' for x in range(0, 1081, 16))
    body = f'''
<defs>
 <linearGradient id="sk53" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050D1C"/><stop offset="1" stop-color="#1B3556"/></linearGradient>
 <linearGradient id="gd53" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F9A68"/><stop offset="1" stop-color="#0C4430"/></linearGradient>
 <linearGradient id="cn53" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF6D8" stop-opacity=".62"/><stop offset="1" stop-color="#FFF6D8" stop-opacity="0"/></linearGradient>
</defs>
<rect width="{W}" height="{H}" fill="url(#sk53)"/>{stars}
<rect y="800" width="{W}" height="120" fill="#06101E"/>
<rect x="400" y="790" width="250" height="40" rx="14" fill="#0B1A2E"/><path d="M430 790 q40 -34 90 -34 q50 0 84 34 Z" fill="#0B1A2E"/>
<ellipse cx="300" cy="826" rx="210" ry="16" fill="#FFD27A" opacity=".12" filter="url(#bl14)"/>
<circle cx="418" cy="812" r="8" fill="#FFE2A6"/><circle cx="632" cy="812" r="8" fill="#FFE2A6"/>
<circle cx="418" cy="812" r="34" fill="#FFE2A6" opacity=".55" filter="url(#bl14)"/><circle cx="632" cy="812" r="34" fill="#FFE2A6" opacity=".55" filter="url(#bl14)"/>
{fence}<path d="M0 770 H1080 M0 905 H1080" stroke="#050E1C" stroke-width="5" opacity=".9"/>
<path d="M870 460 V920" stroke="#050E1C" stroke-width="16"/>
<path d="M800 456 H940 L920 482 H820 Z" fill="#0A1626"/><rect x="814" y="480" width="112" height="9" fill="#FFF6D8"/>
<circle cx="870" cy="492" r="70" fill="#FFF6D8" opacity=".55" filter="url(#bl28)"/>
<polygon points="816,490 924,490 1090,1000 620,1000" fill="url(#cn53)"/>
<rect y="905" width="{W}" height="285" fill="url(#gd53)"/>
<path d="M0 960 H1080" stroke="#F7EBD6" stroke-width="3" opacity=".6"/>
<path d="M150 905 L60 1190 M540 905 V1190 M930 905 L1020 1190" stroke="#F7EBD6" stroke-width="3" opacity=".25"/>
<g transform="translate(60 0)">
 <ellipse cx="190" cy="1052" rx="190" ry="14" fill="#000" opacity=".4" filter="url(#bl14)"/>
 <rect x="20" y="976" width="340" height="18" rx="5" fill="#C9A267"/><rect x="20" y="994" width="340" height="7" fill="#7E5E34"/>
 <path d="M50 1001 V1050 M330 1001 V1050" stroke="#2A2A2A" stroke-width="9"/>
 <g transform="translate(160 884) rotate(-8)">
  <rect x="0" y="0" width="120" height="96" rx="30" fill="#1B6B4A"/><rect x="0" y="40" width="120" height="14" fill="#C6EA3D"/>
  <rect x="30" y="-22" width="60" height="30" rx="10" fill="none" stroke="#0E3F2C" stroke-width="7"/>
  <ellipse cx="60" cy="100" rx="60" ry="8" fill="#000" opacity=".25" filter="url(#bl6)"/>
 </g>
</g>
{ball('w', 700, 1075, 22, rot=30)}
<ellipse cx="702" cy="1098" rx="26" ry="5" fill="#000" opacity=".4" filter="url(#bl6)"/>
<text x="84" y="1180" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="6" fill="#F7EBD6" opacity=".7">6:58 PM</text>
{tag('COURT 3 · MELBOURNE', color='#F7EBD6', rule=C['lime'])}
{headline(META['lines'], y=290, size=64, colors='#F7EBD6', ls=3, lh=82)}
{wordmark(1268, '#F7EBD6', sub=False, op=.95)}
{grain(.18)}'''
    return page(body)
