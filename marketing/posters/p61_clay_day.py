from four_times import *

META = dict(
    id=61, slug='clay-day', title='同一块红土，四个时间', lines=['同一块红土，', '一天四个样。'],
    style=['系列', '色块', '场地质感'], tone='暖色', demo=False,
    concept='红土场同一机位四格：清晨刷过的纹路、正午烫脚、傍晚滑步的印、深夜袜子已红；每格一句小毛病',
    use='红土 / 场地系列；打过红土的人都懂',
)


def svg():
    return render('clay', 'c', META['lines'], 'CLAY · 4 TIMES', '#2A1209', '#F7EBD6', '#E8643C',
                  ['刷过的线，舍不得踩。', '中午的红土，烫脚。', '滑步的印，自己看得懂。', '回家才发现，袜子红了。'])
