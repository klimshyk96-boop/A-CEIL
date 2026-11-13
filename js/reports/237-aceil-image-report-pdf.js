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

  // Room starts are exact pixel boundaries recorded by the report renderer.
  // Published reports created before this change have no such metadata, so
  // scan for a near-empty horizontal band before slicing them.
  function whitespaceCut(source,width,from,limit,maxHeight){
    var start=Math.max(from+Math.round(maxHeight*.70),limit-Math.round(maxHeight*.25));
    if(!source||limit-start<24)return limit;
    var sample=document.createElement("canvas");
    sample.width=Math.max(1,Math.min(280,Math.round(width)));
    sample.height=Math.max(1,Math.min(220,Math.round((limit-start)/3)));
    try{
      var ctx=sample.getContext("2d");if(!ctx||!ctx.getImageData)return limit;
      ctx.drawImage(source,0,start,width,limit-start,0,0,sample.width,sample.height);
      var pixels=ctx.getImageData(0,0,sample.width,sample.height).data;
      var last=-1,run=0;
      for(var y=0;y<sample.height;y++){
        var blank=0;
        for(var x=0;x<sample.width;x++){
          var i=(y*sample.width+x)*4;
          if(pixels[i]>=238&&pixels[i+1]>=238&&pixels[i+2]>=238)blank++;
        }
        if(blank/sample.width>=.975){run++;if(run>=3)last=y}
        else run=0;
      }
      if(last<0)return limit;
      var chosen=start+Math.floor((last+1)*(limit-start)/sample.height);
      return chosen>from+32&&chosen<limit-8?chosen:limit;
    }catch(_){return limit}
    finally{sample.width=0;sample.height=0}
  }
  function pageSlices(width,height,roomStartsPx,source){
    width=Number(width);height=Number(height);
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
      throw new Error("Неправильні розміри зображення звіту");
    var maxHeight=Math.max(1,Math.floor(281*width/194));
    var starts=(Array.isArray(roomStartsPx)?roomStartsPx:[])
      .map(Number).filter(function(v){return Number.isFinite(v)&&v>0&&v<height})
      .sort(function(a,b){return a-b});
    var pages=[],y=0;
    while(y<height){
      if(pages.length>=120)throw new Error("Звіт завеликий для PDF");
      var limit=Math.min(height,y+maxHeight),next=limit;
      // Even short rooms begin on a fresh A4 sheet.
      for(var i=0;i<starts.length;i++){
        if(starts[i]>y+24&&starts[i]<=limit){next=Math.round(starts[i]);break}
      }
      if(next===limit&&limit<height)next=whitespaceCut(source,width,y,limit,maxHeight);
      if(next<=y||next>limit)next=limit;
      pages.push({y:y,height:next-y});
      y=next;
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
      pdf.addImage(part.toDataURL("image/jpeg",0.92),"JPEG",margin,margin,contentWidth,srcHeight/pxPerMm,undefined,"FAST");
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