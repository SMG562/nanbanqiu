-- ## seed suburbs / users / two St James TC in different suburbs
insert into suburbs(name,postcode,centroid) values ('Brighton','3186','POINT(145 -37.9)'),('Coburg North','3058','POINT(144.96 -37.73)'),('Glen Iris','3146','POINT(145.05 -37.86)');
insert into users(id,phone_e164,nickname,utr,gender) values
 ('00000000-0000-0000-0000-000000000001','+61400000001','Host',8.5,'f'),
 ('00000000-0000-0000-0000-000000000002','+61400000002','B',4,'m'),
 ('00000000-0000-0000-0000-000000000003','+61400000003','C',4,'m'),
 ('00000000-0000-0000-0000-000000000004','+61400000004','D',4,'f'),
 ('00000000-0000-0000-0000-000000000005','+61400000005','E',4,'f'),
 ('00000000-0000-0000-0000-000000000006','+61400000006','F',4,'m'),
 ('00000000-0000-0000-0000-000000000007','+61400000007','G',4,'m'),
 ('00000000-0000-0000-0000-000000000008','+61400000008','H',4,'m');
insert into venues(id,name,short_name,suburb,postcode,location,surfaces) values
 ('10000000-0000-0000-0000-000000000085','St James Tennis Club','St James TC','Brighton','3186','POINT(145 -37.9)','{hard}'),
 ('10000000-0000-0000-0000-000000000253','St James Tennis Club','St James TC','Coburg North','3058','POINT(144.96 -37.73)','{clay,synclay}'),
 ('10000000-0000-0000-0000-000000000001','Glen Iris Tennis Club','Glen Iris TC','Glen Iris','3146','POINT(145.05 -37.86)','{hard}');
select short_name, suburb from venues where short_name='St James TC' order by suburb;
-- ## !same short_name in same suburb is rejected
insert into venues(name,short_name,suburb,postcode,location) values ('Dup','St James TC','Brighton','3186','POINT(0 0)');
-- ## !UTR above 16.5 rejected
insert into users(phone_e164,nickname,utr) values ('+61400000099','X',17);
-- ## games: singles g1, doubles g2 with filled=2, g3 to cancel, g4 decline-reason lab, g5 finished
insert into games(id,share_code,host_id,venue_id,starts_at,duration_min,game_type,capacity,utr_min,utr_max,created_device) values
 ('20000000-0000-0000-0000-000000000001','g1','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000085', now()+interval '2 days',90,'singles',2,3,10.5,'mobile'),
 ('20000000-0000-0000-0000-000000000002','g2','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000253', now()+interval '2 days',90,'doubles',4,3,10.5,'desktop'),
 ('20000000-0000-0000-0000-000000000003','g3','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001', now()+interval '3 days',90,'singles',2,3,10.5,'mobile'),
 ('20000000-0000-0000-0000-000000000004','g4','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001', now()+interval '3 days',90,'doubles',4,3,10.5,'mobile'),
 ('20000000-0000-0000-0000-000000000005','g5','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001', now()-interval '3 hours',90,'doubles',4,3,10.5,'mobile');
update games set filled=2 where id='20000000-0000-0000-0000-000000000002';
select share_code, status, filled, (select count(*) from game_participants p where p.game_id=g.id and p.role='host' and p.status='approved') host_rows from games g order by share_code;
-- ## g1: two applicants, approve one -> game full, other auto full_auto
insert into game_participants(game_id,user_id,device) values ('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','mobile'),('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','desktop');
update game_participants set status='approved', decided_at=now(), approved_at=now() where game_id='20000000-0000-0000-0000-000000000001' and user_id='00000000-0000-0000-0000-000000000002';
select (select status from games where share_code='g1') game_status, user_id, status, decline_reason from game_participants where game_id='20000000-0000-0000-0000-000000000001' order by user_id;
-- ## g2: filled seats count toward full (host 1 + filled 2 + approved 1 = 4)
insert into game_participants(game_id,user_id,status,approved_at) values ('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','approved',now());
select status from games where share_code='g2';
-- ## g2: lowering filled reopens the game
update games set filled=1 where share_code='g2';
select status, filled from games where share_code='g2';
-- ## g2: approved player leaves (soft delete left + left_at) keeps row, stays open, not counted
update game_participants set status='left', left_at=now() where game_id='20000000-0000-0000-0000-000000000002' and user_id='00000000-0000-0000-0000-000000000004';
select g.status, c.approved_count, c.spots_left, (select count(*) from game_participants where game_id=g.id) rows_kept from games g join game_cards c on c.id=g.id where g.share_code='g2';
-- ## !left without left_at rejected
update game_participants set status='left', left_at=null where game_id='20000000-0000-0000-0000-000000000002' and user_id='00000000-0000-0000-0000-000000000004';
-- ## g4: all decline reasons known/level/pass/blocked + timeout(expired) + withdrawn + re-apply
insert into game_participants(game_id,user_id) select '20000000-0000-0000-0000-000000000004', ('00000000-0000-0000-0000-00000000000'||i)::uuid from generate_series(2,8) i;
update game_participants set status='rejected', decline_reason='known', decline_note='下次约' where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000002';
update game_participants set status='rejected', decline_reason='level' where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000003';
update game_participants set status='rejected', decline_reason='pass'  where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000004';
update game_participants set status='rejected', decline_reason='blocked' where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000005';
update game_participants set status='expired', decline_reason='timeout', expired_at=now() where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000006';
update game_participants set status='withdrawn', left_at=now() where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000007';
update game_participants set status='pending', left_at=null, created_at=now() where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000007';
select status, decline_reason, count(*) from game_participants where game_id='20000000-0000-0000-0000-000000000004' group by 1,2 order by 1,2;
-- ## !old decline reason 'full' rejected
update game_participants set status='rejected', decline_reason='full' where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000008';
-- ## !rejected without reason rejected
update game_participants set status='rejected', decline_reason=null where game_id='20000000-0000-0000-0000-000000000004' and user_id='00000000-0000-0000-0000-000000000008';
-- ## g3 cancel -> cancelled_at auto + explicit cancelled_at from front-end kept
update games set status='cancelled' where share_code='g3';
update games set status='cancelled', cancelled_at='2026-10-14 10:00+00' where share_code='g4';
select share_code, status, cancelled_at is not null has_cancelled_at from games where share_code in ('g3','g4') order by 1;
-- ## g5 finished game: participants, impressions, badges, notifications + deliveries
insert into game_participants(game_id,user_id,status,approved_at) values
 ('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','approved',now()-interval '1 day'),
 ('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003','approved',now()-interval '1 day');
insert into impressions(game_id,from_id,to_id,kinds) values
 ('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','{ontime,kind}'),
 ('20000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','{fun}');
insert into user_badges(user_id,code,game_id,seen_at,shared_at) values ('00000000-0000-0000-0000-000000000001','first','20000000-0000-0000-0000-000000000005',now(),null),('00000000-0000-0000-0000-000000000002','first','20000000-0000-0000-0000-000000000005',null,null);
with n as (insert into notifications(user_id,kind,game_id) values ('00000000-0000-0000-0000-000000000002','recap','20000000-0000-0000-0000-000000000005') returning id)
insert into notification_deliveries(notification_id,channel,reason) select id,'push_mobile','mobile_first' from n;
select (select count(*) from notification_deliveries) deliveries, (select count(*) from notifications) notifs;
-- ## user_kudos_v2 returns rows
select user_id, kudos, partners, kudos_rate from user_kudos_v2 order by user_id;
-- ## user_kudos (deprecated) still valid
select * from user_kudos;
-- ## player_cards / v_badge_rarity / v_counted_games
select (select count(*) from v_counted_games) counted, (select json_agg(r) from v_badge_rarity r) rarity, (select played from player_cards where nickname='Host') host_played;
-- ## events: Dec 2026 partition + 2028 default partition + opt-out dropped
insert into events(occurred_at,user_id,anon_id,session_id,build,device,event,props) values
 ('2026-12-15 10:00+11','00000000-0000-0000-0000-000000000002','a1','s1','pwa','mobile','page_view','{"screen":"disc"}'),
 ('2026-12-15 10:01+11','00000000-0000-0000-0000-000000000002','a1','s1','pwa','mobile','page_time','{"screen":"disc","ms":4000}'),
 ('2028-03-01 10:00+11',null,'a2','s2','web','desktop','card_view','{"target_uid":"00000000-0000-0000-0000-000000000001","own":false,"via":"link"}'),
 (now(),'00000000-0000-0000-0000-000000000002','a1','s3','web','desktop','game_apply_submit','{"game_id":"x"}');
update users set analytics_opt_out=true where nickname='C';
insert into events(occurred_at,user_id,anon_id,session_id,build,device,event) values (now(),'00000000-0000-0000-0000-000000000003','a3','s4','pwa','mobile','page_view');
select tableoid::regclass as part, event from events order by occurred_at;
-- ## !events old platform value / bad build rejected
insert into events(occurred_at,anon_id,session_id,build,event) values (now(),'a','s','ios','x');
-- ## v_user_activity_7d / functions
select nickname, apply, played, impression, active_day, score from v_user_activity_7d where score<>0 order by nickname;
-- ## page_traffic / card_views / env_usage / fill_rate / distinct_people
select (select json_agg(t) from page_traffic('2026-12-01','2027-01-01') t) pt,
       (select json_agg(c) from card_views('2028-01-01','2028-12-31') c) cv,
       (select count(*) from v_env_30d) env, (select json_agg(f) from fill_rate(now()-interval '30 days', now()) f) fr,
       distinct_people('page_view','2026-12-01','2027-01-01','mobile') dp;
-- ## views v_suburb_activity / v_venue_activity_30d / v_applications_daily / admin_game_slots / v_page_traffic_7d / v_card_views_30d
select (select count(*) from v_suburb_activity) sa, (select count(*) from v_venue_activity_30d) va, (select json_agg(a) from v_applications_daily a) ad,
       (select count(*) from admin_game_slots) gs, (select count(*) from v_page_traffic_7d) p7, (select count(*) from v_card_views_30d) c30,
       (select count(*) from frequent_partners) fp, (select count(*) from v_badge_partner) bp, (select count(*) from private_game_contacts) pc;
-- ## daily_metrics multi-dim + metric_sum
insert into daily_metrics(day,metric,dims,value) values ('2026-10-01','page_views','{"device":"mobile","screen":"disc"}',10),('2026-10-02','page_views','{"device":"mobile","screen":"disc"}',5),('2026-10-01','page_views','{}',20);
insert into daily_metrics(day,metric,dims,value,additive) values ('2026-10-01','dau','{}',7,false);
select metric_sum('page_views','2026-10-01','2026-10-03','{"device":"mobile","screen":"disc"}') s1, metric_sum('page_views','2026-10-01','2026-10-03') s0;
-- ## !metric_sum refuses distinct metric
select metric_sum('dau','2026-10-01','2026-10-03');
-- ## user_suburb_picks with (suburb, postcode)
insert into user_suburb_picks(user_id,suburb,postcode) values ('00000000-0000-0000-0000-000000000002','Brighton','3186');
select count(*) from user_suburb_picks;
-- ## event_definitions matches spec
select status, count(*) from event_definitions group by 1 order by 1;
-- ## risk_rules / reports.source / suspension check / identity_links
insert into admin_users(id,email,name,role,password_hash,totp_secret) values ('30000000-0000-0000-0000-000000000001','a@x.com','A','operator','x','y');
insert into reports(reporter_id,target_type,target_id,reason,entered_by) values ('00000000-0000-0000-0000-000000000002','user','00000000-0000-0000-0000-000000000003','pact_violation','30000000-0000-0000-0000-000000000001');
update users set status='suspended', status_since=now(), status_until=now()+interval '7 days', status_reason='no_show' where nickname='E';
insert into identity_links(anon_id,user_id) values ('a1','00000000-0000-0000-0000-000000000002'),('a1','00000000-0000-0000-0000-000000000003');
select (select string_agg(code||':'||enabled,',' order by code) from risk_rules) rules, (select source from reports) src, (select count(*) from identity_links) links;
-- ## !suspension of 5 days rejected
update users set status='suspended', status_since=now(), status_until=now()+interval '5 days' where nickname='F';
-- ## can_act: 账号状态权限矩阵（与前台 acctCan 同一套）
do $$
declare b uuid := '00000000-0000-0000-0000-000000000002'; c uuid := '00000000-0000-0000-0000-000000000003';
        g uuid := '00000000-0000-0000-0000-000000000007'; h uuid := '00000000-0000-0000-0000-000000000008';
begin
  -- 正常
  update users set status='active', status_since=null, status_until=null, status_reason=null where id=g;
  assert can_act(g,'apply',null,true) is null and can_act(g,'chat',h) is null, 'active';
  -- 待核实：只拦女生局
  update users set status='review', status_since=now() where id=g;
  assert can_act(g,'apply',null,true)='review' and can_act(g,'join',null,true)='review' and can_act(g,'apply') is null and can_act(g,'chat',h) is null and can_act(g,'create') is null, 'review';
  -- 受限：女生局 + 没一起打过球的人
  update users set status='limited' where id=g;
  assert can_act(g,'apply',null,true)='limited' and can_act(g,'apply') is null and can_act(g,'create') is null, 'limited women';
  assert can_act(g,'invite',h)='limited' and can_act(g,'chat',h)='limited' and can_act(g,'accept',h)='limited' and can_act(g,'counter',h) is null, 'limited stranger';
  -- 暂停：全部写操作
  update users set status='suspended', status_since=now(), status_until=now()+interval '7 days', status_reason='no_show' where id=g;
  assert can_act(g,'apply')='suspended' and can_act(g,'create')='suspended' and can_act(g,'counter')='suspended' and can_act(g,'chat',h)='suspended', 'suspended';
  -- 暂停已到期（定时任务还没跑）：按正常处理
  update users set status_since=now()-interval '8 days', status_until=now()-interval '1 day' where id=g;
  assert can_act(g,'apply') is null, 'suspended expired';
  -- 封禁 / 注销
  update users set status='banned', status_until=null, status_since=now() where id=g;
  assert can_act(g,'apply')='banned' and can_act(g,'chat',h)='banned', 'banned';
  update users set status='deleted', status_reason='self_delete' where id=g;
  assert can_act(g,'create')='deleted', 'deleted';
  update users set status='active', status_since=null, status_until=null, status_reason=null where id=g;
end $$;
select 'ok' as can_act;
-- ## notif_kind 有 account_status
select 'account_status'::notif_kind as k;
-- ## 站内举报：正常写入
insert into reports(reporter_id,target_type,target_id,reason,note,source,via) values ('00000000-0000-0000-0000-000000000004','user','00000000-0000-0000-0000-000000000006','harass',null,'in_app','card');
insert into reports(reporter_id,target_type,target_id,reason,note,source,via,context_ref) values ('00000000-0000-0000-0000-000000000004','user','00000000-0000-0000-0000-000000000007','other','私信里推销课程','in_app','chat','t12');
select count(*) filter (where source='in_app') in_app from reports;
-- ## !站内举报：同一人对同一对象未处理时不能重复
insert into reports(reporter_id,target_type,target_id,reason,source,via) values ('00000000-0000-0000-0000-000000000004','user','00000000-0000-0000-0000-000000000006','no_show','in_app','card');
-- ## 站内举报：处理后可以再举报
update reports set status='actioned' where reporter_id='00000000-0000-0000-0000-000000000004' and target_id='00000000-0000-0000-0000-000000000006';
insert into reports(reporter_id,target_type,target_id,reason,source,via) values ('00000000-0000-0000-0000-000000000004','user','00000000-0000-0000-0000-000000000006','no_show','in_app','card');
select count(*) from reports where target_id='00000000-0000-0000-0000-000000000006';
-- ## !站内举报：「其他」必须写说明
insert into reports(reporter_id,target_type,target_id,reason,note,source,via) values ('00000000-0000-0000-0000-000000000005','user','00000000-0000-0000-0000-000000000006','other','  ','in_app','card');
-- ## !站内举报：不能用管理员录入专用的原因
insert into reports(reporter_id,target_type,target_id,reason,source,via) values ('00000000-0000-0000-0000-000000000005','user','00000000-0000-0000-0000-000000000006','spam','in_app','card');
-- ## !站内举报：说明不能超过 200 字
insert into reports(reporter_id,target_type,target_id,reason,note,source,via) values ('00000000-0000-0000-0000-000000000005','user','00000000-0000-0000-0000-000000000006','harass',repeat('字',201),'in_app','card');
-- ## !邮件举报必须有录入人
insert into reports(reporter_id,target_type,target_id,reason,source) values ('00000000-0000-0000-0000-000000000005','user','00000000-0000-0000-0000-000000000006','spam','email');
-- ## 后台卡片数据源（3e）：17 个视图 / 函数都能执行，结果自洽
do $$
declare a timestamptz := now() - interval '30 days'; b timestamptz := now() + interval '30 days'; n bigint; m bigint; r record;
begin
  perform * from today_board();
  select coalesce(sum(o.n),0) into n from application_outcomes(a, b) o;
  select count(*) into m from game_participants where role='player' and created_at >= a and created_at < b;
  assert n = m, format('申请的结果加起来 %s ≠ 申请次数 %s', n, m);
  -- 漏斗每一步都不多于上一步
  for r in select f.step, f.people, lag(f.people) over (order by f.step) as prev from visit_funnel(a, b) f loop
    assert r.prev is null or r.people <= r.prev, format('来访漏斗第 %s 步变多', r.step); end loop;
  for r in select f.step, f.people, lag(f.people) over (order by f.step) as prev from pwa_install_funnel(a, b) f loop
    assert r.prev is null or r.people <= r.prev, format('主屏幕漏斗第 %s 步变多', r.step); end loop;
  for r in select * from inapp_handoff_funnel(a, b) loop assert r.acted <= r.moved and r.moved <= r.inapp_users, 'App 内漏斗变多'; end loop;
  for r in select * from today_board() loop
    assert r.filled_n + r.short_n = r.left_n and r.soon_short <= r.short_n and r.expiring_n <= r.pending_n, '今天面板不自洽'; end loop;
  -- 区域之和 = 公开 + 私人未取消的局；球场活跃 ≤ 区域
  select coalesce(sum(s.games),0) into n from suburb_activity(a, b) s;
  select count(*) into m from games where status <> 'cancelled' and starts_at >= a and starts_at < b;
  assert n = m, format('区域球局之和 %s ≠ %s', n, m);
  select coalesce(sum(v.games),0) into n from venue_activity(a, b) v; assert n <= m, '球场之和多于全部球局';
  perform * from start_heatmap(a, b); perform * from share_attribution(a, b); perform * from less_effect_counts(a, b);
  perform * from entry_sources(a, b); perform * from game_view_via(a, b); perform * from device_compare(a, b);
  perform * from v_user_retention; perform * from v_level_stuck;
  select count(*) into n from v_multi_applicant_games where applicants >= 4 and not multi; assert n = 0, '4 人以上申请应标为 multi';
  select count(*) into n from v_invite_outcomes where reply_minutes < 0; assert n = 0, '邀约回复用时为负';
end $$;
select 'ok' as card_sources;
-- ## 提醒去了哪里：第一去向、出发类同时推手机、已读
do $$
declare u uuid := '00000000-0000-0000-0000-000000000002'; n1 bigint; n2 bigint; r record; tot bigint; tot0 bigint; o0 bigint; g0 bigint; e0 bigint;
begin
  select coalesce(sum(notifications),0), coalesce(sum(opened) filter (where channel='in_app'),0), coalesce(sum(go_extra) filter (where channel='in_app'),0) into tot0, o0, g0 from notification_route(now()-interval '1 day', now());
  select coalesce(sum(notifications),0) into e0 from notification_route(now()-interval '1 day', now()) where channel='email';
  insert into notifications(user_id,kind,read_at) values (u,'soon',now()) returning id into n1;
  insert into notifications(user_id,kind) values (u,'approved') returning id into n2;
  insert into notification_deliveries(notification_id,channel,reason,at) values (n1,'in_app','active_device',now()-interval '1 hour'),(n1,'push_mobile','go_kind',now()-interval '1 hour'),
    (n2,'push_desktop','no_mobile_push',now()-interval '2 hours'),(n2,'email','unread_5min',now()-interval '115 minutes');
  select sum(notifications) into tot from notification_route(now()-interval '1 day', now()); assert tot - tot0 = 2, format('每条提醒只算一次：%s', tot - tot0);
  select sum(opened) opened, sum(go_extra) go_extra into r from notification_route(now()-interval '1 day', now()) where channel='in_app'; assert r.opened - o0 = 1 and r.go_extra - g0 = 1, '页面里提醒 + 同时推手机 + 已读';
  select coalesce(sum(notifications),0) n into r from notification_route(now()-interval '1 day', now()) where channel='email'; assert r.n = e0, '推电脑后补邮件仍算第一去向推电脑';
end $$;
select 'ok' as notification_route;
-- ## 夏令时：天的边界按墨尔本墙上时间（会话时区是 UTC 时也对）
set timezone = 'UTC';
do $$
begin
  assert mel_day_start('2026-10-05') - mel_day_start('2026-10-04') = interval '23 hours', '夏令时开始那天应为 23 小时';
  assert mel_day_start('2027-04-05') - mel_day_start('2027-04-04') = interval '25 hours', '夏令时结束那天应为 25 小时';
  assert mel_day_start('2026-10-14') = timestamptz '2026-10-14 00:00+11', '夏令时期间 0 点 = +11';
  assert mel_day_start('2026-07-01') = timestamptz '2026-07-01 00:00+10', '冬令时 0 点 = +10';
  perform * from today_board();
end $$;
reset timezone;
select 'ok' as dst;
