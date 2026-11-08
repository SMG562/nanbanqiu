from lib import *
from han import MARBLE, marble_bg, relief, figure, cloud_scroll

META = dict(
    id=149, slug='han-office', title='包已经背上了', lines=['五点五十九，', '包已经背上了。'],
    style=['汉风', '画像石', '现代日常', '幽默'], tone='浅色', demo=False,
    concept='汉画像石里的办公室：一个汉代小人坐在电脑前，手还在键盘上，人已经扭头看墙上的钟——五点五十九；背上斜挎着球拍包，桌下一罐球',
    use='下班去打球；上班族都懂',
)


def svg():
    p = [f'<defs>{MARBLE}</defs>', marble_bg(W, H, '#ECE6DA')]
    p.append('<rect x="50" y="440" width="980" height="640" fill="#DCD4C4"/><rect x="50" y="440" width="980" height="640" fill="none" stroke="#A89E8A" stroke-width="4"/>')
    p.append('<rect x="50" y="440" width="980" height="12" fill="#8E8470" opacity=".3"/>')
    c = '<rect x="80" y="1040" width="920" height="6" fill="FILL"/>'
    c += '<rect x="420" y="840" width="460" height="16" fill="FILL"/><rect x="440" y="856" width="14" height="184" fill="FILL"/><rect x="846" y="856" width="14" height="184" fill="FILL"/>'   # 桌子
    c += '<rect x="560" y="680" width="220" height="140" rx="6" fill="FILL"/><rect x="654" y="820" width="32" height="20" fill="FILL"/><rect x="500" y="828" width="140" height="10" rx="3" fill="FILL"/>'   # 显示器 + 键盘
    c += '<rect x="318" y="900" width="120" height="12" fill="FILL"/><rect x="372" y="912" width="12" height="128" fill="FILL"/>'   # 椅子
    c += '<rect x="304" y="770" width="12" height="140" fill="FILL"/>'
    c += '<rect x="318" y="700" width="26" height="128" rx="12" transform="rotate(-24 331 764)" fill="FILL"/><ellipse cx="306" cy="694" rx="20" ry="26" transform="rotate(-24 306 694)" fill="FILL"/>'   # 背上的球拍包
    c += figure(390, 966, 1.25, 'sit', 1, sash=False)
    c += '<path d="M372 812 L418 868" stroke="FILL" stroke-width="7"/>'                                        # 斜挎包带
    c += '<circle cx="250" cy="560" r="62" fill="FILL"/>'                                                     # 墙上的钟
    c += '<rect x="760" y="1000" width="34" height="40" rx="6" fill="FILL"/>'                                  # 桌下球罐
    for x, y, s_, f in [(720, 520, .6, -1), (440, 520, .5, 1)]:
        c += cloud_scroll(x, y, s_, f, 6)
    p.append(relief(c, face='#F6F2EA', shadow='#6E665A', d=5))
    p.append('<rect x="574" y="694" width="192" height="112" rx="4" fill="#CFC6B4"/>')                          # 屏幕凹面
    for k in range(12):                                                                                         # 钟面刻度
        a = 2 * math.pi * k / 12
        p.append(f'<line x1="{250 + 48*math.sin(a):.0f}" y1="{560 - 48*math.cos(a):.0f}" x2="{250 + 54*math.sin(a):.0f}" y2="{560 - 54*math.cos(a):.0f}" stroke="#6E665A" stroke-width="3"/>')
    p.append('<line x1="250" y1="560" x2="246" y2="530" stroke="#3A362E" stroke-width="5" stroke-linecap="round"/>')   # 时针近 6——这里画 5:59：时针指向 6 前
    p.append('<line x1="250" y1="560" x2="252" y2="594" stroke="#3A362E" stroke-width="6" stroke-linecap="round"/>')
    p.append('<line x1="250" y1="560" x2="245" y2="510" stroke="#9E2A2B" stroke-width="3" stroke-linecap="round"/>')
    p.append('<circle cx="777" cy="1000" r="0" fill="none"/>')
    p.append(tag('HAN · 5:59 PM', color='#4A463E', rule='#9E2A2B', op=.7))
    p.append(headline(META['lines'], y=272, size=50, colors=('#3A362E', '#9E2A2B'), lh=72, weight=900))
    p.append('<path d="M0 1182 Q540 1160 1080 1182 L1080 1350 L0 1350Z" fill="#0B3B2A"/>')
    p.append(wordmark(1268, '#fff', sub=False))
    return page(''.join(p))
