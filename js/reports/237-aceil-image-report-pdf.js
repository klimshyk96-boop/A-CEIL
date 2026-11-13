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
  function normalizedBreaks(value,height){
    // Relative positions survive Safari/cloud image optimization and remain
    // valid even if the stored PNG is resized before publishing.
    try{if(typeof value==="string")value=JSON.parse(value)}catch(_){value=[]}
    if(!Array.isArray(value))return [];
    return value.filter(function(v){return typeof v==="number"&&isFinite(v)&&v>0&&v<1})
      .map(function(v){return Math.round(v*height)})
      .filter(function(v){return v>0&&v<height})
      .sort(function(a,b){return a-b});
  }
  function quietBreak(image,from,to,width){
    // Legacy published reports do not carry room boundaries. Prefer a clean
    // horizontal gap near the bottom of a page over cutting table text.
    var span=to-from;
    if(span<50)return null;
    try{
      var preview=document.createElement("canvas");
      preview.width=180;preview.height=Math.min(200,Math.max(30,Math.round(span/5)));
      var c=preview.getContext("2d",{willReadFrequently:true});
      if(!c||typeof c.getImageData!=="function")return null;
      c.drawImage(image,0,from,width,span,0,0,preview.width,preview.height);
      var rgba=c.getImageData(0,0,preview.width,preview.height).data,rows=[],i,x;
      for(i=0;i<preview.height;i++){
        var ink=0;
        for(x=0;x<preview.width;x+=3){
          var p=(i*preview.width+x)*4,r=rgba[p],g=rgba[p+1],b=rgba[p+2];
          if(Math.min(r,g,b)<211||(Math.max(r,g,b)-Math.min(r,g,b))>35)ink++;
        }
        rows.push(ink);
      }
      // Require several consecutive nearly empty rows. This avoids picking
      // a line that happens to cross only one side of the two-column report.
      var best=null,run=0;
      for(i=0;i<rows.length;i++){
        if(rows[i]<=3)run++;else run=0;
        if(run>=4)best=i;
      }
      return best==null?null:Math.round(from+((best-run/2)/preview.height)*span);
    }catch(_){return null}
  }
  function planPages(image,maxPixels,breaks){
    var height=image.naturalHeight,width=image.naturalWidth,
      anchors=normalizedBreaks(breaks,height),pages=[],y=0;
    while(y<height){
      var end=Math.min(height,y+maxPixels);
      if(end<height){
        // The start of every room and the grand-total area is a safe boundary.
        // If a whole room fits, don't append a fraction of the next room to
        // the bottom of the current A4 page.
        var min=y+Math.round(maxPixels*.48),top=end-Math.round(maxPixels*.02);
        var eligible=anchors.filter(function(b){return b>=min&&b<=top});
        if(eligible.length)end=eligible[eligible.length-1];
        else{
          var quiet=quietBreak(image,y+Math.floor(maxPixels*.72),end-Math.floor(maxPixels*.015),width);
          if(quiet&&quiet>min&&quiet<end)end=quiet;
        }
      }
      if(end<=y)end=Math.min(height,y+maxPixels);
      pages.push({start:y,end:end});y=end;
      if(pages.length>120)throw new Error("Звіт завеликий для PDF");
    }
    return pages;
  }
  async function createDocument(dataUrl,options){
    var result=await Promise.all([library(),imageFrom(dataUrl)]),
      Pdf=result[0],image=result[1],width=image.naturalWidth,height=image.naturalHeight;
    if(!width||!height)throw new Error("Порожнє зображення звіту");
    var pdf=new Pdf({orientation:"portrait",unit:"mm",format:"a4",compress:true}),
      margin=8,contentWidth=194,contentHeight=281,pxPerMm=width/contentWidth,
      pageHeight=Math.max(1,Math.floor(contentHeight*pxPerMm)),
      breaks=options&&options.breaks,
      pages=planPages(image,pageHeight,breaks);
    pages.forEach(function(segment,index){
      if(index)pdf.addPage();
      var y=segment.start,srcHeight=segment.end-segment.start,
        targetWidth=Math.min(width,1440),
        targetHeight=Math.max(1,Math.round(targetWidth*srcHeight/width)),
        part=document.createElement("canvas");
      part.width=targetWidth;part.height=targetHeight;
      var c=part.getContext("2d");
      if(!c)throw new Error("Не вдалося підготувати сторінку PDF");
      c.fillStyle="#fff";c.fillRect(0,0,targetWidth,targetHeight);
      c.drawImage(image,0,y,width,srcHeight,0,0,targetWidth,targetHeight);
      pdf.addImage(part.toDataURL("image/jpeg",0.95),"JPEG",margin,margin,contentWidth,
        srcHeight/pxPerMm,undefined,"FAST");
      part.width=0;part.height=0;
    });
    return pdf;
  }
  async function createBlob(dataUrl,options){
    return (await createDocument(dataUrl,options)).output("blob");
  }
  async function download(dataUrl,fileName,button,options){
    if(button&&button.disabled)return false;
    var old=button&&button.textContent;
    if(button){button.disabled=true;button.textContent="⏳ Створюємо PDF…"}
    try{
      var blob=await createBlob(dataUrl,options),url=URL.createObjectURL(blob),
        name=safeFileName(fileName),a=document.createElement("a");
      a.href=url;a.download=name;
      document.body.appendChild(a);a.click();a.remove();
      // Safari needs the object URL to survive the user gesture/download handoff.
      setTimeout(function(){URL.revokeObjectURL(url)},60000);
      return true;
    }finally{if(button){button.disabled=false;button.textContent=old}}
  }
  window.A_CEIL_ReportPdf={createBlob:createBlob,createDocument:createDocument,planPages:planPages,download:download,safeFileName:safeFileName};
})();