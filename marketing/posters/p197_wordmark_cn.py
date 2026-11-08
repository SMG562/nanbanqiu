from lib import *

META = dict(
    id=197, slug='wordmark-cn', title='字标草案 B · 中文', lines=['南伴球'],
    style=['字标', '品牌', '定制字体'], tone='浅色', demo=False,
    concept='中文字标「南伴球」：宋体拉成高挑的比例，横细竖粗的反差拉到最大；「伴」的长竖往下延伸成一根发丝细线，沿着字底一路划到「球」的右边，末端是一颗荧光球；下面一行字距拉开的小字',
    use='品牌字标草案（中文）；App 图标旁、海报落款',
)


def svg():
    G = '#0B3B2A'
    p = ['<rect width="1080" height="1350" fill="#FBF8F0"/>',
         f'<g transform="translate(540 0) scale(.8 1) translate(-540 0)"><text x="540" y="700" text-anchor="middle" font-family="{SERIF}" font-weight="900" font-size="300" letter-spacing="-6" fill="{G}">南伴球</text></g>']
    p.append(f'<path d="M470 704 L470 760 C470 790 490 796 520 796 L800 796" stroke="{G}" stroke-width="3.6" fill="none"/>')   # 伴的长竖延伸成一根细线
    p.append('<circle cx="824" cy="796" r="16" fill="#C6EA3D"/>')
    p.append(f'<text x="540" y="890" text-anchor="middle" font-family="{SANS}" font-weight="400" font-size="22" letter-spacing="16" fill="{G}">MELBOURNE · TENNIS &amp; FRIENDS</text>')
    p.append(f'<text x="84" y="1250" font-family="{SANS}" font-weight="500" font-size="16" letter-spacing="6" fill="#7A8A82">字标草案 B　·　中文　·　宋体改笔</text>')
    return page(''.join(p))
