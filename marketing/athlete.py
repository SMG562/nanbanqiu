"""高对比运动海报用的人物剪影（160 起）：低机位、发球奖杯姿势，有肌肉体块的粗细；rim() 做单侧轮廓光。"""
from lin import ink


def server(color):
    """发球蓄力的人（全身剪影），坐标按 1080×1350 画布写死，脚在底部。"""
    th = lambda a, b: (lambda t: a + (b - a) * t)
    o = []
    o.append(ink([(628, 822), (660, 900), (680, 990), (668, 1100), (656, 1200)], 76, color, 1, (0, 0), press=lambda t: 1 - .6 * t))     # 前腿：屈膝蓄力
    o.append(ink([(568, 826), (540, 900), (520, 980), (494, 1070), (466, 1150)], 72, color, 1, (0, 0), press=lambda t: 1 - .62 * t))    # 后腿
    o.append(f'<path d="M634 1190 L716 1206 C728 1212 724 1230 710 1232 L634 1232Z" fill="{color}"/>')                                      # 前脚鞋
    o.append(f'<path d="M448 1140 L486 1132 L500 1176 C494 1188 480 1190 470 1184Z" fill="{color}"/>')                                      # 后脚踮起
    o.append(f'<path d="M560 836 C554 790 564 744 572 704 C560 664 540 624 534 586 C532 562 540 548 556 544 L642 532 C666 534 678 556 674 590 C670 640 656 690 650 740 C654 784 656 814 652 836Z" fill="{color}"/>')   # 躯干：腰收、胸开、后仰
    o.append(ink([(624, 548), (650, 470), (670, 400), (688, 300)], 40, color, 1, (0, .3), press=lambda t: 1 - .45 * t))                    # 抛球手，直指天
    o.append(ink([(540, 556), (488, 520), (452, 470)], 42, color, 1, (0, 0), press=lambda t: 1 - .3 * t))                                  # 持拍上臂
    o.append(ink([(452, 474), (456, 430), (470, 386)], 32, color, 1, (0, .2), press=lambda t: 1 - .3 * t))                                 # 前臂
    o.append(f'<circle cx="590" cy="476" r="40" fill="{color}"/>')                                                                         # 头，仰着
    o.append(f'<path d="M552 462 C560 430 610 422 630 448 L650 452 L628 466Z" fill="{color}"/>')                                            # 帽檐
    o.append(f'<path d="M570 506 L610 506 L606 540 L574 540Z" fill="{color}"/>')                                                           # 脖子
    o.append(ink([(470, 390), (452, 334)], 14, color, 1, (0, 0)))                                                                          # 拍柄
    o.append(f'<ellipse cx="438" cy="272" rx="44" ry="64" transform="rotate(-14 438 272)" fill="none" stroke="{color}" stroke-width="13"/>')
    return ''.join(o)


def rim(fig_fn, dx=7, dy=-4, light='#F2EFE6', dark='#060606'):
    """单侧轮廓光：亮色剪影错开一点垫在下面，黑色剪影压在上面，只露出一道亮边。"""
    return f'<g transform="translate({dx} {dy})">{fig_fn(light)}</g>{fig_fn(dark)}'
