-- 登录漏斗埋点（#297，可重复执行；内容与 schema.sql 同名段落一致）。只动事件字典：加 login_resend / login_abandon 两个事件，
-- 给 login_send_code / login_verify 补属性说明（事件名不变、属性只增不改）。不改任何表结构和接口；不记手机号。
insert into event_definitions(event, category, description, props, source, status, replaced_by) values
 ('login_send_code','登录','发送验证码的结果（号码格式通过才发；真实登录拿到结果后才记）','ok, reason(rate_limited/provider_error/network/paused/unknown，仅失败), cc, n(本次登录第几次发送)','client','active',null),
 ('login_resend','登录','重发验证码（第 2 次及以后的发送）','n','client','active',null),
 ('login_verify','登录','提交验证码的结果','ok, reason(wrong_code/too_many/network/unknown，仅失败), secs(从发码成功到提交的秒数)','client','active',null),
 ('login_abandon','登录','关闭登录窗口时还停在手机号页 / 验证码页','step(phone/otp), n','client','active',null)
on conflict (event) do update set status='active', description=excluded.description, props=excluded.props;
insert into schema_migrations(version) values ('20261119_login_funnel_events') on conflict do nothing;
