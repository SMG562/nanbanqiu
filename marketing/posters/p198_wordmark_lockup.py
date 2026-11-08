from lib import *
from lettering import nanbanqiu

META = dict(
    id=198, slug='wordmark-lockup', title='字标草案 C · 中英组合', lines=['南伴球 NANBANQIU'],
    style=['字标', '品牌', '定制字体'], tone='浅色', demo=False,
    concept='中英横排组合：左边高挑的宋体「南伴球」，中间一根发丝细竖线，右边定制的 NANBANQIU（Q 甩出一颗荧光球），下面一行小字；横向适合 App 顶栏、名片、球包上的织标；底下另附一个深绿底的反白版本',
    use='品牌字标草案（组合）；顶栏、名片、周边',
)


def lockup(y, c, bg_ball='#C6EA3D'):
    g, w = nanbanqiu(c, bg_ball)
    k = 500 / w
    o = [f'<g transform="translate(80 0) scale(.82 1) translate(-80 0)"><text x="80" y="{y + 118}" font-family="{SERIF}" font-weight="900" font-size="140" letter-spacing="-4" fill="{c}">南伴球</text></g>',
         f'<rect x="460" y="{y - 6}" width="2" height="146" fill="{c}"/>',
         f'<g transform="translate(496 {y + 10}) scale({k:.4f})">{g}</g>',
         f'<text x="540" y="{y + 210}" text-anchor="middle" font-family="{SANS}" font-weight="400" font-size="18" letter-spacing="12" fill="{c}">MELBOURNE · TENNIS &amp; FRIENDS</text>']
    return ''.join(o)


def svg():
    p = ['<rect width="1080" height="1350" fill="#FBF8F0"/>', lockup(380, '#0B3B2A'),
         '<rect y="760" width="1080" height="420" fill="#0B3B2A"/>', lockup(880, '#F4F0E4'),
         f'<text x="84" y="1250" font-family="{SANS}" font-weight="500" font-size="16" letter-spacing="6" fill="#7A8A82">字标草案 C　·　中英组合　·　上：浅底　下：深底反白</text>']
    return page(''.join(p))
