function saveCard(uid){SC.uid=uid;SC.blob=null;SHARE_OPEN(shareCardHTML(uid));scBlob(uid).then(b=>{if(SC.uid===uid)SC.blob=b})}
