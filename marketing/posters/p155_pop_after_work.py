from lib import *
from han import figure, flat, cloud_scroll, POP

META = dict(
    id=155, slug='pop-after-work', title='一小时是自己的', lines=['下班后的一小时，', '是自己的。'],
    style=['平面设计', '剪影', '城市', '多彩'], tone='亮色', demo=False,
    concept='现代海报的负形构图：一轮巨大的暖橙落日占据画面，城市天际线是几层粉紫、钴蓝的平涂块，楼窗是小小的亮格；一个汉画像小人在落日正中腾空挥拍，剪影切开太阳，球在他头顶——古人活在当下，下班后这一小时也一样',
    use='下班后打球 / 夜场；明亮的晚霞色',
)


def svg():
    r = random.Random(155)
    C = POP
    p = [f'<defs><linearGradient id="sk155" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFB38A"/><stop offset=".6" stop-color="#FFD9A8"/><stop offset="1" stop-color="#FFE9C8"/></linearGradient></defs>',
         f'<rect width="{W}" height="{H}" fill="url(#sk155)"/>',
         f'<circle cx="540" cy="700" r="330" fill="{C["orange"]}"/>', f'<circle cx="540" cy="700" r="330" fill="#FF7A3C" opacity=".35"/>']
    for x, y, s, f in [(80, 470, .8, 1), (820, 430, .7, -1)]:
        p.append(flat(cloud_scroll(x, y, s, f, 7), '#FFFFFF'))
    for layer, (base, cols) in enumerate([(880, ['#E08AA8', '#D47AA0']), (960, [C['lilac'], '#9A8AF0']), (1040, [C['cobalt'], '#2448C8'])]):
        x = -20
        while x < 1100:
            w = r.uniform(60, 130)
            h = r.uniform(80, 260) * (1 - layer * .2)
            p.append(f'<rect x="{x:.0f}" y="{base - h:.0f}" width="{w:.0f}" height="{h + 400:.0f}" fill="{r.choice(cols)}"/>')
            for _ in range(int(w * h / 1800)):
                p.append(f'<rect x="{x + r.uniform(8, w - 14):.0f}" y="{base - h + r.uniform(10, h - 10):.0f}" width="6" height="8" fill="#FFE9A8" opacity="{r.uniform(.5, 1):.2f}"/>')
            x += w + r.uniform(4, 16)
    p.append(f'<rect x="0" y="1040" width="1080" height="140" fill="{C["navy"]}"/>')
    p.append('<path d="M360 1100 L720 1100 L760 1160 L320 1160Z" fill="#3FA88E"/><path d="M360 1100 L720 1100 L760 1160 L320 1160Z M340 1130 L740 1130 M540 1100 L540 1160" stroke="#FFFFFF" stroke-width="2.5" fill="none"/>')
    p.append(flat(figure(560, 900, 2.0, 'leap', 1), C['navy']))
    p.append('<circle cx="640" cy="330" r="20" fill="#C6EA3D"/><path d="M626 316 C634 324 634 336 626 344" stroke="#F6F8E0" stroke-width="3" fill="none"/>')
    p.append(tag('AFTER WORK · 6:30 PM', y=120, color=C['navy'], rule=C['cobalt'], op=.85))
    p.append(headline(META['lines'], y=226, size=52, colors=(C['navy'], '#FFFFFF'), lh=72, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
