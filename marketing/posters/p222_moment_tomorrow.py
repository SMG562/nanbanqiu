from lib import *
from moment import frame, racket

META = dict(
    id=222, slug='moment-tomorrow', title='明天。', lines=['明天。'],
    style=['瞬间', '静物', '极简', '暖光'], tone='亮色', demo=False,
    concept='借发布会邀请函的思路而不借它的元素：只画一个主角——前一晚就收好、靠在门边南伴绿墙上的球包，拍柄露出包口，一罐新球立在旁边；一束暖光从左上照下来。约好了球的人，前一晚的心理活动全在这只包里。',
    use='瞬间系列 · 01；约好之后的期待 / 明日球局',
)


def svg():
    p = ['<defs><linearGradient id="wall222" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F6B4F"/><stop offset="1" stop-color="#176B4D"/></linearGradient>'
         '<radialGradient id="lamp222" cx=".3" cy=".1" r=".75"><stop offset="0" stop-color="#FFE7B0" stop-opacity=".55"/><stop offset="1" stop-color="#FFE7B0" stop-opacity="0"/></radialGradient>'
         '<linearGradient id="fl222" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D8B07E"/><stop offset="1" stop-color="#E9CDA4"/></linearGradient>'
         '<linearGradient id="bag222" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#F7F0E0"/><stop offset=".7" stop-color="#ECE2CC"/><stop offset="1" stop-color="#D9CCB0"/></linearGradient>'
         '<linearGradient id="can222" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9EEF0"/><stop offset=".35" stop-color="#FFFFFF"/><stop offset="1" stop-color="#AEB8BC"/></linearGradient>'
         '<filter id="sh222" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#wall222)"/>',
         '<rect width="1080" height="900" fill="url(#lamp222)"/>',
         '<rect x="0" y="880" width="1080" height="20" fill="#14603F"/>',
         '<path d="M0 900 H1080 V1350 H0Z" fill="url(#fl222)"/>']
    for i in range(-6, 14):
        p.append(f'<path d="M{540 + i * 30} 900 L{540 + i * 150} 1350" stroke="#C49A68" stroke-width="2" opacity=".5"/>')
    p.append('<path d="M920 0 V900" stroke="#F4EED8" stroke-width="22"/><path d="M908 0 V900" stroke="#0E5139" stroke-width="3" opacity=".5"/>')   # 门框
    # 包的影子
    p.append('<ellipse cx="560" cy="960" rx="300" ry="34" fill="#5A3E22" opacity=".35" filter="url(#sh222)"/>')
    # 两支拍柄露出包口
    p.append(racket(470, 780, -8, frame='#F4F1E8', grip='#1E2A22', s=1.0, sid='a'))
    p.append(racket(560, 790, 6, frame='#C6EA3D', grip='#F4F1E8', s=1.0, sid='b'))
    # 球包（盖住拍头下半）
    p.append('<path d="M330 560 Q330 520 380 516 L720 506 Q770 504 772 548 L790 930 Q790 960 760 960 L340 966 Q310 966 312 936Z" fill="url(#bag222)"/>')
    p.append('<path d="M340 600 Q550 584 776 590" stroke="#176B4D" stroke-width="26" fill="none"/><path d="M340 600 Q550 584 776 590" stroke="#0E5139" stroke-width="2" fill="none" opacity=".4"/>')
    p.append('<path d="M380 520 Q550 420 720 512" stroke="#176B4D" stroke-width="14" fill="none" stroke-linecap="round"/>')
    p.append('<path d="M350 540 Q550 528 760 532" stroke="#B9AC90" stroke-width="3" stroke-dasharray="5 5" fill="none"/>'
             '<rect x="700" y="520" width="16" height="34" rx="6" fill="#C6EA3D"/>')
    p.append('<path d="M312 920 Q550 912 790 916 L790 930 Q790 960 760 960 L340 966 Q310 966 312 936Z" fill="#CDBE9E"/>')
    p.append('<path d="M326 570 L314 930 M776 560 L788 916 M330 918 Q550 908 786 912" stroke="#B9AC90" stroke-width="2.4" stroke-dasharray="7 6" fill="none"/>')
    p.append(''.join(f'<path d="M{x} 640 q{8 if i % 2 else -6} 120 {2 if i % 2 else -4} 260" stroke="#8C7A5A" stroke-width="10" fill="none" opacity=".03"/>' for i, x in enumerate((380, 460, 640, 730))))
    p.append('<rect x="420" y="720" width="250" height="140" rx="10" fill="none" stroke="#C9BBA0" stroke-width="3"/>'
             f'<text x="545" y="802" text-anchor="middle" font-family="{SANS}" font-weight="700" font-size="26" letter-spacing="10" fill="#B9AC90">NANBANQIU</text>')
    # 一罐新球
    p.append('<ellipse cx="880" cy="1000" rx="56" ry="12" fill="#5A3E22" opacity=".3" filter="url(#sh222)"/>'
             '<rect x="830" y="800" width="100" height="196" rx="10" fill="url(#can222)"/><ellipse cx="880" cy="800" rx="50" ry="12" fill="#C6CFD2"/>'
             '<rect x="830" y="860" width="100" height="70" fill="#C6EA3D" opacity=".9"/>'
             f'<text x="880" y="906" text-anchor="middle" font-family="{SANS}" font-weight="900" font-size="22" letter-spacing="2" fill="#176B4D">NEW</text>')
    frame(p, 1, '明天。', '包，前一晚就收好了。', '明天的球局，今晚就能约。')
    return page(''.join(p))
