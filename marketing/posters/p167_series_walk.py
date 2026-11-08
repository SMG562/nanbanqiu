from lib import *
from people import person, wall_shadow
from series import T, frame, foot_shadow

META = dict(
    id=167, slug='series-walk', title='系列 01 · 下班，去打球', lines=['下班，去打球。'],
    style=['场景', '设计系统', '品牌色', '插画'], tone='浅色', demo=False,
    concept='163 的优化版：同一套设计系统——暖白墙、左上来的斜光、墙上带绿调的影子；服装收进品牌色（鼠尾草绿、深绿、奶白、一点浅粉）；左上眉标、左下固定文字区、行动提示带荧光下划线、右下落款和系列编号',
    use='用户旅程：发现（想打球）；浏览今天起 7 天的球局',
)


def svg():
    p = ['<defs><linearGradient id="wl167" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FAF6EE"/><stop offset="1" stop-color="#EEE8DC"/></linearGradient>'
         '<clipPath id="wc167"><rect width="1080" height="1000"/></clipPath>'
         '<filter id="tx167"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 .4  0 0 0 0 .45  0 0 0 0 .4  0 0 0 .09 0"/></filter></defs>',
         '<rect width="1080" height="1350" fill="url(#wl167)"/>', '<rect width="1080" height="1000" filter="url(#tx167)"/>',
         '<path d="M0 0 L460 0 L0 620Z" fill="#FFFFFF" opacity=".55"/>']
    folks = [
        lambda m=None: person(640, 1000, 1.85, 'walk', -1, 0, 2, '#B9CDB8', T['cream'], hairstyle='long', bag=T['g900'], mono=m),
        lambda m=None: person(810, 1004, 1.88, 'hold', -1, 2, 0, T['white'], '#4A5E7A', hairstyle='pony', mono=m),
        lambda m=None: person(975, 1000, 1.85, 'walk', -1, 1, 1, T['g700'], T['cream'], hairstyle='short', bag='#2E3438', mono=m),
    ]
    for f in folks:
        p.append(wall_shadow(lambda col, f=f: f(col), 90, -24, .13, '#2E4A3E', 'wc167'))
    p.append(f'<rect y="1000" width="1080" height="350" fill="{T["sand"]}"/>')
    p.append('<rect y="1000" width="1080" height="3" fill="#D2C6B4"/>')
    p.append(foot_shadow(810, 1006, 260))
    for f in folks:
        p.append(f())
    bx, by = 810 - 44 * 1.88 - 6, 1004 - 246 * 1.88 - 12
    p.append(f'<circle cx="{bx:.0f}" cy="{by:.0f}" r="13" fill="{T["lime"]}"/>')
    frame(p, 'WEEKDAY · 6:10 PM · FITZROY', '下班，去打球。', '今天起 7 天内的球局，挑一场下班后的。', '看看附近的球局', '01')
    return page(''.join(p))
