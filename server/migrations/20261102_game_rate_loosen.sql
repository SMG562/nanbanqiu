-- 发局频率放宽：每天 3→5 个（进行中最多 5 个不变；取消的也算今天发的）。可重复运行。
update rate_rules set max_hits = 5, note = '发局：每天 5 个' where rule = 'game_day';
