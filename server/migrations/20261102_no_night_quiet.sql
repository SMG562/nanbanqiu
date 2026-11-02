-- 取消夜间不打扰（11-02 你定的）：所有城市的开始 = 结束 = 0 点，代码里「夜间」判断永远不成立，通知随时推。可重复运行。
-- 想恢复：update cities set quiet_start = '22:00', quiet_end = '08:00';
update cities set quiet_start = '00:00', quiet_end = '00:00';
-- 之前被顺延到早上 8 点、还没发出的通知：现在就放行（过时的发送程序会自动略过）
update notifications set send_after = now() where pushed_at is null and send_after > now();
