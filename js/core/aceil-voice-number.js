/* A·CEIL — розбір голосових розмірів («три двадцять п'ять» → 325 см).
   Чиста логіка без DOM: window.A_CEIL_VoiceNumber.parse(текст, опції) і .command(текст).
   Одиниця результату — сантиметри. Одне число = сантиметри («три» → 3, «триста» → 300);
   метри — словом («три метри п'ять» → 305), десятковим («3,25») або двома числами («три двадцять п'ять» → 325).
   Будь-яке ціле число — сантиметри («1300», «тисяча триста» → 1300). Міліметри лише словом («3250 мм»). Опція smallMeters:true повертає «три» → 300.
   Використовує js/canvas/175-aceil-side-input-stepper.js. Тести: tests/voice-number.test.cjs. */
(function(root){
"use strict";
var WORDS=(function(){
  var w={}, add=function(list,k,order,val){list.split(",").forEach(function(x){w[x]={k:k,order:order,val:val}})};
  add("нуль,ноль","zero",0,0);
  var U=[["один,одна,одно,одну",1],["два,дві,две,двe",2],["три",3],["чотири,четыре",4],["пять",5],["шість,шесть",6],["сім,семь",7],["вісім,восемь",8],["девять",9]];
  U.forEach(function(p){add(p[0],"n",1,p[1])});
  var T=[["десять",10],["одинадцять,одиннадцать",11],["дванадцять,двенадцать",12],["тринадцять,тринадцать",13],["чотирнадцять,четырнадцать",14],["пятнадцять,пятнадцать",15],["шістнадцять,шестнадцать",16],["сімнадцять,семнадцать",17],["вісімнадцять,восемнадцать",18],["девятнадцять,девятнадцать",19],
    ["двадцять,двадцать",20],["тридцять,тридцать",30],["сорок",40],["пятдесят,пятьдесят",50],["шістдесят,шестьдесят",60],["сімдесят,семьдесят",70],["вісімдесят,восемьдесят",80],["девяносто",90]];
  T.forEach(function(p){add(p[0],"n",2,p[1])});
  var H=[["сто",100],["двісті,двести",200],["триста",300],["чотириста,четыреста",400],["пятсот",500],["шістсот,шестьсот",600],["сімсот,семьсот",700],["вісімсот,восемьсот",800],["девятсот",900]];
  H.forEach(function(p){add(p[0],"n",3,p[1])});
  add("тисяча,тисячі,тисяч,тысяча,тысячи,тысяч","th",4,1000);
  return w;
})();
function norm(s){
  return String(s).toLowerCase()
    .replace(/[’ʼ'`´]/g,"")
    .replace(/(\d)[,](\d)/g,"$1.$2")
    .replace(/(\d)([^\d.\s])/g,"$1 $2")
    .replace(/([^\d.\s])(\d)/g,"$1 $2")
    .replace(/[^a-zа-яіїєґё\d.\s]/g," ")
    .replace(/\s+/g," ").trim();
}
var CY="[а-яіїєґё]*", RE_M=new RegExp("^(м|метр"+CY+")$"), RE_CM=new RegExp("^(см|сантиметр"+CY+")$"), RE_MM=new RegExp("^(мм|мілімет"+CY+"|миллимет"+CY+")$");
function segmentsOf(raw){
  var toks=norm(raw).split(" ").filter(Boolean), segs=[], cur=null, zero=false;
  function push(){ if(cur){segs.push(cur);cur=null;} }
  function mark(u){ push(); if(segs.length) segs[segs.length-1].unit=u; }
  toks.forEach(function(t){
    if(/^\d+\.\d+$/.test(t)){push();segs.push({v:parseFloat(t),dec:true,unit:null});zero=false;return;}
    if(/^\d+$/.test(t)){push();segs.push({v:+t,unit:null,lz:zero||/^0\d/.test(t)});zero=false;return;}
    if(RE_M.test(t)){mark("m");return;}
    if(RE_CM.test(t)){mark("cm");return;}
    if(RE_MM.test(t)){mark("mm");return;}
    var w=WORDS[t]; if(!w) return;
    if(w.k==="zero"){push();zero=true;return;}
    if(w.k==="th"){
      if(!cur) cur={v:1000,order:4,unit:null,lz:false};
      else {cur.v*=1000;cur.order=4;}
      return;
    }
    if(cur && w.order>=cur.order) push();
    if(!cur) cur={v:0,order:99,unit:null,lz:zero}, zero=false;
    cur.v+=w.val; cur.order=w.order;
  });
  push();
  return segs;
}
function interpret(segs,opts){
  if(!segs.length) return null;
  var r=function(x){return Math.round(x)};
  if(segs.some(function(s){return s.unit})){
    var t=0; segs.forEach(function(s){t+= s.unit==="m"?s.v*100 : s.unit==="mm"?s.v/10 : s.v});
    return {cm:r(t),how:"з одиницями"};
  }
  if(segs.length===1){
    var s=segs[0];
    if(s.dec) return {cm:r(s.v*100),how:"метри"};
    if(s.v<10&&opts&&opts.smallMeters) return {cm:s.v*100,how:"метри"};
    return {cm:s.v,how:"см"};            /* «1300», «тисяча триста» → 1300 см (стіни по 10–13 м існують) */
  }
  if(segs.length===2){
    var A=segs[0],B=segs[1];
    if(A.v>30||A.dec||B.dec) return null;
    var cm;
    if(B.lz) cm=A.v*100+B.v;
    else if(B.v<10) cm=A.v*100+B.v*10;
    else if(B.v<100) cm=A.v*100+B.v;
    else cm=A.v*100+r(B.v/10);
    return {cm:cm,how:"метри + решта"};
  }
  if(segs.every(function(s){return s.v<10&&!s.dec})){
    var rest=segs.slice(1).map(function(s){return s.v}).join("");
    return {cm:r((segs[0].v+parseFloat("0."+rest))*100),how:"цифри"};
  }
  return null;
}
function parseSpoken(raw,opts){ return interpret(segmentsOf(raw),opts); }
function parseCommand(raw){
  var t=" "+norm(raw)+" ";
  var hasNum=segmentsOf(raw).length>0;
  var cmds=[["stop",/ (стоп|досить|хватит|stop) /],["back",/ (назад|попередня|попередній) /],["clear",/ (скасувати|скасуй|відміна|відміни|отмена|стерти|видалити) /],["next",/ (далі|дальше|наступна|наступний|next) /]];
  for(var i=0;i<cmds.length;i++) if(cmds[i][1].test(t)&&!hasNum) return cmds[i][0];
  return null;
}

var api={parse:parseSpoken,command:parseCommand,segments:segmentsOf,normalize:norm};
root.A_CEIL_VoiceNumber=api;
if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
