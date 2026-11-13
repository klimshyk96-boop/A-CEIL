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

  // Build room-aware pages. A fixed-width A4 cut used to create almost-empty
  // spill pages when the last ~2-8% of one room exceeded the printable height.
  // Keep every room independent; scale mild overflows to one A4 page and
  // balance genuinely long rooms across multiple readable pages.
  function whitespaceNear(source,width,ideal,minY,maxY){
    if(!source||maxY-minY<16)return Math.round(ideal);
    var sample=document.createElement("canvas");
    sample.width=Math.max(1,Math.min(320,Math.round(width)));
    sample.height=Math.max(1,Math.min(140,Math.round((maxY-minY)/3)));
    try{
      var ctx=sample.getContext("2d");
      if(!ctx||typeof ctx.getImageData!=="function")return Math.round(ideal);
      ctx.drawImage(source,0,minY,width,maxY-minY,0,0,sample.width,sample.height);
      var rgba=ctx.getImageData(0,0,sample.width,sample.height).data;
      var best=Math.round(ideal),score=Infinity;
      for(var y=1;y<sample.height-1;y++){
        var light=0;
        for(var x=0;x<sample.width;x++){
          var n=(y*sample.width+x)*4;
          if(rgba[n]>=238&&rgba[n+1]>=238&&rgba[n+2]>=238)light++;
        }
        var ratio=light/sample.width;
        if(ratio>=.987){
          var found=minY+(y+.5)*(maxY-minY)/sample.height;
          var distance=Math.abs(found-ideal);
          if(distance<score){best=Math.round(found);score=distance}
        }
      }
      return best;
    }catch(_){return Math.round(ideal)}
    finally{sample.width=0;sample.height=0}
  }
  function pageSlices(width,height,roomStartsPx,source){
    width=Number(width);height=Number(height);
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
      throw new Error("Неправильні розміри зображення звіту");
    var maxHeight=Math.max(1,Math.floor(281*width/194));
    var starts=(Array.isArray(roomStartsPx)?roomStartsPx:[])
      .map(Number).filter(function(y){return Number.isFinite(y)&&y>maxHeight*.10&&y<height-maxHeight*.10})
      .sort(function(a,b){return a-b});
    var boundaries=[0];
    starts.forEach(function(value){
      var y=Math.round(value);
      if(y-boundaries[boundaries.length-1]>maxHeight*.10)boundaries.push(y);
    });
    boundaries.push(height);
    var pages=[];
    for(var index=0;index<boundaries.length-1;index++){
      var from=boundaries[index],to=boundaries[index+1],roomHeight=to-from;
      // Up to 18% shrinkage avoids a page consisting of a few trailing lines.
      // For longer room sections split them into equally occupied sheets.
      var count=Math.max(1,Math.ceil(roomHeight/(maxHeight*1.18)));
      if(pages.length+count>120)throw new Error("Звіт завеликий для PDF");
      var cursor=from;
      for(var remaining=count;remaining>0;remaining--){
        var finish=to;
        if(remaining>1){
          var desired=cursor+(to-cursor)/remaining;
          var tolerance=Math.min(maxHeight*.08,(to-cursor)/remaining*.13);
          finish=whitespaceNear(source,width,desired,
            Math.round(desired-tolerance),Math.round(desired+tolerance));
          finish=Math.max(cursor+1,Math.min(to-(remaining-1),Math.round(finish)));
        }
        var sliceHeight=finish-cursor;
        pages.push({
          y:cursor,height:sliceHeight,
          scale:Math.min(1,maxHeight/sliceHeight)
        });
        cursor=finish;
      }
    }
    return pages;
  }
  async function createBlob(dataUrl,options){
    var results=await Promise.all([library(),imageFrom(dataUrl)]);
    var Pdf=results[0],image=results[1],width=image.naturalWidth,height=image.naturalHeight;
    if(!width||!height)throw new Error("Порожнє зображення звіту");
    var pdf=new Pdf({orientation:"portrait",unit:"mm",format:"a4",compress:true}),
      margin=8,contentWidth=194,pxPerMm=width/contentWidth,
      slices=pageSlices(width,height,options&&options.roomStartsPx,image);
    slices.forEach(function(slice,page){
      if(page>0)pdf.addPage();
      var srcHeight=slice.height,targetWidth=Math.min(width,1440),
        targetHeight=Math.max(1,Math.round(targetWidth*srcHeight/width)),
        part=document.createElement("canvas");
      part.width=targetWidth;part.height=targetHeight;
      var ctx=part.getContext("2d");
      if(!ctx)throw new Error("Не вдалося підготувати сторінку PDF");
      ctx.fillStyle="#fff";ctx.fillRect(0,0,targetWidth,targetHeight);
      ctx.drawImage(image,0,slice.y,width,srcHeight,0,0,targetWidth,targetHeight);
      var drawScale=slice.scale||1,drawWidth=contentWidth*drawScale,
        drawHeight=srcHeight/pxPerMm*drawScale,
        drawX=margin+(contentWidth-drawWidth)/2;
      pdf.addImage(part.toDataURL("image/jpeg",0.92),"JPEG",drawX,margin,drawWidth,drawHeight,undefined,"FAST");
      part.width=0;part.height=0;
    });
    return pdf.output("blob");
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
  window.A_CEIL_ReportPdf={createBlob:createBlob,download:download,pageSlices:pageSlices,safeFileName:safeFileName};
})();