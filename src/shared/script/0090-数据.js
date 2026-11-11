  [['han','Han Liu',3.5,'#176B4D',['v1','v2'],[0,0,41,6,4,0,0,0,0]],['jason','Jason',3.0,'#3C6FA8',['v2'],[0,0,22,5,1,0,0,0,0]],
   ['alex','Alex M.',3.5,'#E0672F',['v7'],[34,5,28,3,1,14,6,2,4]],['sarah','Sarah L.',3.0,'#8E5BB5',['v4'],[19,2,15,2,0,9,2,2,3]],
   ['david','David K.',3.0,'#2A8C82',['v2'],[12,4,9,1,0,6,1,2,3]],['chris','Chris T.',4.0,'#B0802A',['v4'],[61,8,47,7,2,30,12,3,5]],
   ['daniel','Daniel R.',4.0,'#C0446B',['v6'],[88,15,70,9,3,40,20,3,6]],['ryan','Ryan L.',4.5,'#3E5C76',['v6'],[132,28,120,12,6,70,25,3,7]],
   ['mia','Mia C.',3.5,'#D2691E',['v5'],[15,3,12,2,0,4,9,1,2]],['leo','Leo S.',3.0,'#5B7F3A',['v3'],[4,1,3,1,0,1,1,1,1]],
   ['grace','Grace Y.',3.0,'#A05195',['v1'],[22,4,18,3,1,10,5,2,3]],['tom','Tom H.',3.5,'#2F6690',['v7'],[27,6,21,4,1,12,3,2,4]]]
  .forEach(([id,name,ntrp,color,clubs,b])=>USERS[id]={id,name,ntrp,color:id==='jason'?'#F4EFE3':avcOf(id),avatar_kind:id==='jason'?'animal':aniOf(id)?'animal':'letter',animal:id==='jason'?'tiger':aniOf(id)||'tiger',home_club_ids:clubs,blocked:new Set(),
    base:{played:b[0],hosted:b[1],kudos:b[2],streak:b[3],invites:b[4],night:b[5],early:b[6],surfaces:b[7],clubs:b[8]}});
const SEED_NO={han:1,jason:62,alex:7,sarah:12,david:23,chris:31,daniel:40,ryan:44,mia:58,leo:71,grace:85,tom:90};Object.keys(SEED_NO).forEach(id=>{if(USERS[id])USERS[id].no=SEED_NO[id]});if(USERS.jason)USERS.jason.last='W';if(USERS.han)USERS.han.wechat='hanliu_mel';if(USERS.jason)USERS.jason.wechat='jason_tennis';
