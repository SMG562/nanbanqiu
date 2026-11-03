let USERS,GAMES,PARTS,NOTIFS,ME,LOC,PUSH,NID=100;
const UI={tab:'disc',mode:'agenda',page:0,mapDay:0,selVenue:null,sel:null,landing:null,exp:new Set(),pastShown:20,comm:true};
function seed(){
  rs=7;USERS={};
  // id, 名字, UTR, 颜色, Home Club, 线下基础数据 [场次, 组织, 点赞, 连续周, 邀请, 晚场, 早场, 场地种类, Club 数]
