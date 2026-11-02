-- 申请 + 直接加入频率放宽：每小时 5→10 次，每天 15→30 次（同一局每天 3 次不变）。可重复运行。
update rate_rules set max_hits = 10, note = '申请 + 直接加入：每小时 10 次' where rule = 'apply_hour';
update rate_rules set max_hits = 30, note = '申请 + 直接加入：每天 30 次' where rule = 'apply_day';
