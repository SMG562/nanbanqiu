from lib import *
from lettering import nanbanqiu

META = dict(
    id=196, slug='wordmark-en', title='字标草案 A · 英文', lines=['NANBANQIU'],
    style=['字标', '品牌', '定制字体'], tone='浅色', demo=False,
    concept='逐笔画的高对比细长衬线字标 NANBANQIU：粗竖、发丝细横；N 的右竖就是 A 的左腿，A 的右脚就是下一个 N 的左竖；Q 是一个右上角开口的圈，尾巴是一道细弧，甩出去变成一颗荧光球——全标唯一的颜色；下面一行字距拉开的小字',
    use='品牌字标草案（英文）；App 启动页、周边、海报落款',
)


def svg():
    g, w = nanbanqiu()
    k = 900 / w
    p = ['<rect width="1080" height="1350" fill="#FBF8F0"/>',
         f'<g transform="translate({540 - w * k / 2:.1f} 520) scale({k:.4f})">{g}</g>',
         f'<text x="540" y="{520 + 260 * k + 90:.0f}" text-anchor="middle" font-family="{SANS}" font-weight="400" font-size="22" letter-spacing="14" fill="#0B3B2A">MELBOURNE · TENNIS &amp; FRIENDS</text>',
         f'<text x="84" y="1250" font-family="{SANS}" font-weight="500" font-size="16" letter-spacing="6" fill="#7A8A82">字标草案 A　·　英文　·　逐笔绘制</text>']
    return page(''.join(p))
