/*! © 2026 YABAI · BHP Run · all rights reserved */
export const QUIPS=[
'Chạy đến đâu cũng bị bế thôi — đừng làm BHP.',
'Chạy nhanh mấy cũng không nhanh bằng hết hạn visa.',
'Có chạy đằng trời cũng không thoát — đừng làm BHP.',
'Bị bế rồi mới thấy: làm đúng giấy tờ vẫn nhàn hơn.',
'Dép lào chạy không lại pháp luật đâu Tèo ơi.',
'Kỷ lục mới: chạy xa nhất… rồi vẫn bị bế.',
'Lương chui chưa kịp gửi về, Tèo đã được gửi về trước.',
'Đường chui nào rồi cũng có cảnh sát đứng cuối.',
'Muốn khỏi phải chạy thì đừng làm BHP.',
'Tèo: «Biết vậy em làm hợp pháp từ đầu.»',
'Trốn được hôm nay, không trốn được ngày mai.',
'Lời khuyên của Tèo: đi đúng đường, khỏi phải chạy.'
];
export const QUIPS_GA=[
'Trộm gà thì gà chạy, người vào đồn.',
'Gà của trại, còng của cảnh sát.',
'Ôm gà chạy sao thoát? Đừng trộm, đừng làm BHP.',
'Con gà còn biết đường về chuồng — người thì về đồn.'
];
export function quipFor(seed,characterId='TEO'){
let list=QUIPS;
if(characterId==='GA')list=QUIPS_GA;
return list[(seed>>>0)%list.length];
}
export function wrapText(text,maxWidth,measureFn){
if(!text)return[];
const words=text.split(' ');
const lines=[];
let currentLine='';
for(let i=0;i<words.length;i++){
const word=words[i];
const candidate=currentLine?`${currentLine} ${word}`:word;
if(measureFn(candidate)<=maxWidth){
currentLine=candidate;
}else{
if(currentLine){
lines.push(currentLine);
}
currentLine=word;
}
}
if(currentLine){
lines.push(currentLine);
}
return lines;
}
