  USERS.ryan.blocked.add('jason');
  GAMES=[];PARTS=[];NOTIFS=[];INVITES=[];
  const add=(id,code,o,t,dur,v,type,mn,mx,host,others,note)=>{GAMES.push({id,share_code:code,starts_at:dayAt(o,t).toISOString(),duration_min:dur,venue_id:v,game_type:type,ntrp_min:mn,ntrp_max:mx,capacity:CAP[type],host_id:host,note,status:o<0?'completed':'open'});
