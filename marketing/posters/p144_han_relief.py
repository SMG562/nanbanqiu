from lib import *
from han import MARBLE, marble_bg, relief, figure, cloud_scroll

META = dict(
    id=144, slug='han-relief', title='值得刻在石头上', lines=['这一拍，', '值得刻在石头上。'],
    style=['汉风', '画像石', '浮雕', '光亮'], tone='浅色', demo=False,
    concept='汉白玉上的一块画像石：一长条浮雕带里，四个宽袍束腰、衣带飘飞的人在打球——抛球、跨步、腾空扣杀、弯腰捡球，动势像汉代百戏；四周是云气纹和飞鸟，一颗荧光球是石头上唯一的颜色',
    use='打出好球的得意；汉代的雄浑和动势',
)


def svg():
    r = random.Random(144)
    p = [f'<defs>{MARBLE}</defs>', marble_bg(W, H)]
    # 浮雕带：一块凹进去的石板
    p.append('<rect x="40" y="430" width="1000" height="560" fill="#E6E2D8"/>')
    p.append('<rect x="40" y="430" width="1000" height="560" fill="none" stroke="#B8B2A4" stroke-width="3"/>')
    p.append('<rect x="40" y="430" width="1000" height="14" fill="#9A9488" opacity=".35"/><rect x="40" y="430" width="14" height="560" fill="#9A9488" opacity=".25"/>')
    for x in range(60, 1040, 28):                                                                              # 边框菱纹
        p.append(f'<path d="M{x} 456 l14 -10 l14 10 l-14 10Z" fill="none" stroke="#A8A294" stroke-width="1.6"/><path d="M{x} 966 l14 -10 l14 10 l-14 10Z" fill="none" stroke="#A8A294" stroke-width="1.6"/>')
    carve = ''
    for x, y, s, f in [(90, 560, .8, 1), (430, 520, .7, -1), (760, 580, .9, 1), (300, 900, .6, -1), (880, 880, .6, -1)]:
        carve += cloud_scroll(x, y, s, f, 6)
    for x, y in [(600, 520), (650, 500), (700, 530), (220, 500)]:                                             # 飞鸟
        carve += f'<path d="M{x-18} {y} Q{x-8} {y-14} {x} {y} Q{x+8} {y-14} {x+18} {y} Q{x} {y+6} {x-18} {y}Z" fill="FILL"/>'
    carve += figure(170, 930, 1.35, 'serve', 1)
    carve += figure(430, 930, 1.3, 'lunge', 1)
    carve += figure(700, 900, 1.3, 'leap', -1)
    carve += figure(930, 930, 1.25, 'pick', -1)
    carve += '<rect x="60" y="932" width="960" height="8" fill="FILL"/>'
    p.append(relief(carve, face='#FAF8F2', shadow='#7E7A70', d=5))
    p.append('<circle cx="676" cy="618" r="14" fill="#C6EA3D"/><path d="M666 608 C672 614 672 622 666 628" stroke="#F4F6DC" stroke-width="2" fill="none"/>')   # 扣杀的球
    p.append(tag('HAN · STONE RELIEF', color='#4A463E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=272, size=50, colors=('#3A362E', '#9E2A2B'), lh=72, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
