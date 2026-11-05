/*! © 2026 YABAI · BHP Run · all rights reserved */
export const HUD={
distance:{x:16,y:14,w:116,h:52},
score:{x:140,y:10,w:204,h:60},
best:{x:352,y:14,w:112,h:52},
mute:{x:476,y:14,w:52,h:52},
meter:{x:16,y:78,w:512,h:36}
};
export const CAUGHT={
art:{x:94,y:112,w:352,h:264},
card:{x:40,y:362,w:460,h:560},
menuBtn:{x:60,y:748,w:150,h:76},
restartBtn:{x:222,y:748,w:258,h:76}
};
export const PAUSE={
btn:{x:476,y:124,w:52,h:52},
card:{x:60,y:290,w:420,h:390},
resume:{x:100,y:372,w:340,h:80},
restart:{x:100,y:476,w:340,h:72},
menu:{x:100,y:568,w:340,h:72}
};
function inBox(x,y,b){
return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h;
}
export function pauseTapAction(x,y){
if(inBox(x,y,PAUSE.resume))return'resume';
if(inBox(x,y,PAUSE.restart))return'restart';
if(inBox(x,y,PAUSE.menu))return'menu';
return null;
}
export function isPauseButtonTap(x,y){
const b=PAUSE.btn;
return x>=b.x-8&&x<=b.x+b.w+8&&y>=b.y-8&&y<=b.y+b.h+8;
}
export function caughtTapAction(x,y){
const btn=CAUGHT.menuBtn;
if(x>=btn.x&&x<=btn.x+btn.w&&y>=btn.y&&y<=btn.y+btn.h){
return'menu';
}
return'restart';
}
export function fitFontSize(text,maxW,startSize,minSize,measure){
let size=startSize;
while(size>minSize&&measure(text,size)>maxW){
size-=2;
}
return Math.max(size,minSize);
}
export function formatScore(n){
if(typeof n!=='number'||isNaN(n)||n<0){
return'0';
}
const intVal=Math.floor(n);
return intVal.toString().replace(/\B(?=(\d{3})+(?!\d))/g,' ');
}
export function meterColor(m){
if(m<40)return'#22c55e';
if(m<70)return'#fbbf24';
return'#ef4444';
}
