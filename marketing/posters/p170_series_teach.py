from lib import *
from people import person
from series import T, frame, court_bg, foot_shadow

META = dict(
    id=170, slug='series-teach', title='系列 04 · 新手也能约', lines=['新手也能约。'],
    style=['场景', '设计系统', '品牌色', '插画'], tone='深色', demo=False,
    concept='166 的优化版：品牌绿场地上的白色网带横过画面；一人帮另一人调握拍，拍子移到身侧不挡脸；统一的文字区和落款',
    use='用户旅程：拉新；按水平找局',
)


def svg():
    p = []
    court_bg(p, fence_y=660)
    p.append('<rect x="0" y="820" width="1080" height="10" fill="#F4F7F2"/>')
    p.append('<g opacity=".3">' + ''.join(f'<line x1="{x}" y1="830" x2="{x}" y2="950" stroke="#0B2A1E" stroke-width="1.6"/>' for x in range(0, 1080, 18))
             + ''.join(f'<line x1="0" y1="{y}" x2="1080" y2="{y}" stroke="#0B2A1E" stroke-width="1.6"/>' for y in range(842, 950, 18)) + '</g>')
    p.append('<rect x="0" y="946" width="1080" height="4" fill="#0B2A1E" opacity=".45"/>')
    p.append(foot_shadow(770, 1014, 230))
    p.append(person(680, 1010, 1.85, 'teach', 1, 0, 0, T['white'], T['g900'], sleeve='short', hairstyle='short'))
    p.append(person(870, 1010, 1.85, 'grip', -1, 1, 2, T['blush'], T['white'], skirt=True, sleeve='short', hairstyle='pony'))
    p.append(f'<line x1="960" y1="620" x2="1000" y2="700" stroke="#2E3438" stroke-width="6" stroke-linecap="round"/><ellipse cx="948" cy="586" rx="22" ry="30" transform="rotate(-25 948 586)" fill="none" stroke="#2E3438" stroke-width="6"/>')
    p.append(f'<circle cx="560" cy="1000" r="10" fill="{T["lime"]}"/>')
    frame(p, 'TUESDAY · 7:30 PM · BEGINNERS', '新手也能约。', '按水平找局，新手有新手的局。', '从新手局开始', '04', dark=True)
    return page(''.join(p))
