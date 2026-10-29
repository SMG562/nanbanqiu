from four_times import *

META = dict(
    id=63, slug='hard-day', title='同一块硬地，四个时间', lines=['同一块硬地，', '一天四个样。'],
    style=['系列', '色块', '场地质感'], tone='深色', demo=False,
    concept='蓝色硬地同一机位四格：清晨积水要先扫、正午刺眼、傍晚影子比人先到、深夜灯下膝盖有意见；每格一句小毛病',
    use='硬地 / 场地系列；打过硬地的人都懂',
)


def svg():
    return render('hard', 'h', META['lines'], 'HARD COURT · 4 TIMES', '#0F2C52', '#F7EBD6', '#6FB4F0',
                  ['场上有水，先扫。', '正午，晒得鞋底发软。', '影子比人先到。', '灯下的硬地，膝盖有意见。'])
