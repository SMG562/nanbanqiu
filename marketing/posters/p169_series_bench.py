from lib import *
from people import person
from series import T, frame, court_bg, foot_shadow
from scene_common import bench

META = dict(
    id=169, slug='series-bench', title='系列 03 · 换边的九十秒', lines=['换边的九十秒。'],
    style=['场景', '设计系统', '品牌色', '插画'], tone='深色', demo=False,
    concept='165 的优化版：品牌绿场地，长凳居右；一人仰头喝水、一人笑弯了腰；毛巾、球罐、靠着的拍子是生活细节；统一的文字区和落款',
    use='用户旅程：一起打；打完直接约 TA（业务规则：邀约）',
)


def svg():
    p = []
    court_bg(p, fence_y=720)
    p.append(bench(520, 850, 520))
    p.append(foot_shadow(800, 1074, 280))
    p.append(person(660, 1070, 1.95, 'drink', 1, 0, 1, T['blush'], T['cream'], sleeve='short', hairstyle='long'))
    p.append(person(920, 1070, 1.95, 'laugh', -1, 2, 0, T['white'], T['g900'], sleeve='long', hairstyle='short'))
    p.append(f'<path d="M560 850 L610 850 L606 900 L564 900Z" fill="#B9CDB8"/>')
    p.append(f'<line x1="1050" y1="1070" x2="1030" y2="920" stroke="#2E3438" stroke-width="7" stroke-linecap="round"/><ellipse cx="1024" cy="882" rx="26" ry="36" transform="rotate(-8 1024 882)" fill="none" stroke="#2E3438" stroke-width="7"/>')
    p.append(f'<rect x="560" y="1024" width="34" height="46" rx="6" fill="{T["white"]}"/><rect x="560" y="1024" width="34" height="10" rx="4" fill="{T["g900"]}"/>')
    p.append(f'<circle cx="612" cy="1062" r="10" fill="{T["lime"]}"/>')
    frame(p, 'SUNDAY · 4:20 PM · COURT 2', '换边的九十秒。', '打得开心，下次直接约 TA。', '约 TA 再打一场', '03', dark=True)
    return page(''.join(p))
