from lib import *

META = dict(
    id=199, slug='wordmark-simple', title='字标草案 D · 简约', lines=['南伴球'],
    style=['字标', '品牌', '极简'], tone='浅色', demo=False,
    concept='不加任何花样的字标：宋体「南伴球」，中等字重、字距放开，南伴深绿；下面一行字距很开的 NANBANQIU；只靠比例、字距和留白撑起气质；上浅底、下深底反白',
    use='品牌字标草案（简约）；对比 196–198 的「为设计而设计」',
)


def mark(y, c, sub):
    return (f'<text x="562" y="{y}" text-anchor="middle" font-family="{SERIF}" font-weight="600" font-size="128" letter-spacing="44" fill="{c}">南伴球</text>'
            f'<text x="551" y="{y + 86}" text-anchor="middle" font-family="{SERIF}" font-weight="400" font-size="22" letter-spacing="22" fill="{sub}">NANBANQIU</text>')


def svg():
    p = ['<rect width="1080" height="1350" fill="#FBF8F0"/>', mark(470, '#0B3B2A', '#3E5A4E'),
         '<rect y="760" width="1080" height="420" fill="#0B3B2A"/>', mark(980, '#F4F0E4', '#C8D8CE'),
         f'<text x="84" y="1250" font-family="{SANS}" font-weight="500" font-size="16" letter-spacing="6" fill="#7A8A82">字标草案 D　·　简约　·　上：浅底　下：深底反白</text>']
    return page(''.join(p))
