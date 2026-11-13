/* Offline-safe PDF export of the exact approved report image. No server upload. */
(function(){
  "use strict";
  if(window.A_CEIL_ReportPdf)return;
  var loading=null;
  function library(){
    if(window.jspdf&&window.jspdf.jsPDF)return Promise.resolve(window.jspdf.jsPDF);
    if(loading)return loading;
    loading=new Promise(function(resolve,reject){
      var url=new URL("/vendor/jspdf-2.5.2.umd.min.js",location.origin).href;
      var script=Array.prototype.find.call(document.scripts,function(s){return s.src===url});
      var timeout=setTimeout(function(){reject(new Error("Бібліотека PDF не відповідає. Повторіть."))},15000);
      function done(){clearTimeout(timeout);window.jspdf&&window.jspdf.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error("Бібліотека PDF недоступна"))}
      function fail(){clearTimeout(timeout);reject(new Error("Не вдалося завантажити модуль PDF"))}
      if(script){script.addEventListener("load",done,{once:true});script.addEventListener("error",fail,{once:true})}
      else{
        script=document.createElement("script");script.src=url;script.onload=done;script.onerror=fail;
        document.head.appendChild(script);
      }
    }).catch(function(err){loading=null;throw err});
    return loading;
  }
  function imageFrom(dataUrl){
    if(!/^data:image\/(?:png|jpeg|webp);base64,/i.test(String(dataUrl||"")))
      return Promise.reject(new Error("Немає готового зображення звіту для PDF"));
    return new Promise(function(resolve,reject){
      var img=new Image(),timer=setTimeout(function(){reject(new Error("Не вдалося відкрити зображення звіту"))},15000);
      img.onload=function(){clearTimeout(timer);resolve(img)};
      img.onerror=function(){clearTimeout(timer);reject(new Error("Зображення звіту пошкоджене"))};
      img.src=dataUrl;
    });
  }
  function safeFileName(value){
    var stem=String(value||"A-CEIL-report").replace(/\.(?:png|jpe?g|webp|pdf)$/i,"")
      .replace(/[\\/<>:"|?*\x00-\x1f]/g,"_").trim().slice(0,100);
    return (stem||"A-CEIL-report")+".pdf";
  }
  async function createBlob(dataUrl){
    var results=await Promise.all([library(),imageFrom(dataUrl)]);
    var Pdf=results[0],image=results[1],width=image.naturalWidth,height=image.naturalHeight;
    if(!width||!height)throw new Error("Порожнє зображення звіту");
    var pdf=new Pdf({orientation:"portrait",unit:"mm",format:"a4",compress:true}),
      margin=8,contentWidth=194,contentHeight=281,
      pxPerMm=width/contentWidth,sliceHeight=Math.max(1,Math.floor(contentHeight*pxPerMm)),y=0,page=0;
    while(y<height){
      if(page++>0)pdf.addPage();
      var srcHeight=Math.min(sliceHeight,height-y),targetWidth=Math.min(width,1440),
        targetHeight=Math.max(1,Math.round(targetWidth*srcHeight/width)),
        part=document.createElement("canvas");
      part.width=targetWidth;part.height=targetHeight;
      var ctx=part.getContext("2d");
      if(!ctx)throw new Error("Не вдалося підготувати сторінку PDF");
      ctx.fillStyle="#fff";ctx.fillRect(0,0,targetWidth,targetHeight);
      ctx.drawImage(image,0,y,width,srcHeight,0,0,targetWidth,targetHeight);
      pdf.addImage(part.toDataURL("image/jpeg",0.92),"JPEG",margin,margin,contentWidth,srcHeight/pxPerMm,undefined,"FAST");
      part.width=0;part.height=0;
      y+=srcHeight;
      if(page>120)throw new Error("Звіт завеликий для PDF");
    }
    return pdf.output("blob");
  }
  async function download(dataUrl,fileName,button){
    if(button&&button.disabled)return false;
    var old=button&&button.textContent;
    if(button){button.disabled=true;button.textContent="⏳ Створюємо PDF…"}
    try{
      var blob=await createBlob(dataUrl),url=URL.createObjectURL(blob),
        name=safeFileName(fileName),a=document.createElement("a");
      a.href=url;a.download=name;
      document.body.appendChild(a);a.click();a.remove();
      // Safari needs the object URL to survive the user gesture/download handoff.
      setTimeout(function(){URL.revokeObjectURL(url)},60000);
      return true;
    }finally{if(button){button.disabled=false;button.textContent=old}}
  }
  window.A_CEIL_ReportPdf={createBlob:createBlob,download:download,safeFileName:safeFileName};
})();