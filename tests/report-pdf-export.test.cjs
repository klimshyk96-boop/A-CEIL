'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test');
const dir=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(dir,p),'utf8');
const moduleText=read('js/reports/237-aceil-image-report-pdf.js');
function fixture(){
  const docs=[],files=[],urls=[],pdfs=[];
  class PDF{
    constructor(){this.images=[];this.pages=1;pdfs.push(this)}
    addPage(){this.pages++}
    addImage(image,kind,x,y,w,h){this.images.push({kind,x,y,w,h,data:image})}
    output(format){assert.equal(format,'blob');return new Blob(['%PDF-1.4 synthetic'],{type:'application/pdf'})}
  }
  class Img{
    constructor(){this.naturalWidth=1200;this.naturalHeight=3600}
    set src(val){this.value=val;queueMicrotask(()=>this.onload&&this.onload())}
  }
  const doc={
    scripts:[],head:{appendChild(){}},
    createElement(tag){
      if(tag==='canvas')return {width:0,height:0,getContext(){return {fillStyle:'',
        fillRect(){},drawImage(){}}},toDataURL(type){assert.equal(type,'image/jpeg');return 'data:image/jpeg;base64,AA=='}};
      const a={href:'',download:'',click(){files.push({name:this.download,href:this.href})},remove(){}};return a;
    },
    body:{appendChild(){}}
  };
  const c={window:{jspdf:{jsPDF:PDF}},document:doc,Image:Img,
    Blob,URL:{createObjectURL(obj){urls.push(obj);return 'blob:pdf'+urls.length},revokeObjectURL(){}},
    location:{origin:'https://a-ceil.pp.ua'},setTimeout(){return 1},
    clearTimeout(){},Promise,console,queueMicrotask};
  c.window.window=c.window;vm.createContext(c);vm.runInContext(moduleText,c);
  return {api:c.window.A_CEIL_ReportPdf,files,pdfs,urls};
}
test('approved PNG image yields downloadable multi-page A4 PDF, never a PNG link',async()=>{
  const f=fixture();
  const blob=await f.api.createBlob('data:image/png;base64,aGVsbG8=');
  assert.equal(blob.type,'application/pdf');
  const pdf=f.pdfs[0];assert(pdf.pages>=2,'tall report must paginate');
  assert.equal(pdf.images.length,pdf.pages,'each page must contain exactly one image slice');
  assert(pdf.images.every(i=>i.kind==='JPEG'&&i.w===194&&i.h>0&&i.h<=281));
  const button={textContent:'⬇ Завантажити PDF',disabled:false};
  const ok=await f.api.download('data:image/png;base64,aGVsbG8=','Соборна 11.11.png',button);
  assert.equal(ok,true);assert.equal(button.disabled,false);
  assert.equal(f.files.length,1);
  assert.equal(f.files[0].name,'Соборна 11.11.pdf');
  assert.match(f.files[0].href,/^blob:pdf/);
  assert.equal(f.urls.at(-1).type,'application/pdf');
});

test('each new room begins on its own A4 sheet; legacy image still paginates',async()=>{
  const f=fixture(),url='data:image/png;base64,aGVsbG8=';
  assert.deepEqual(Array.from(f.api.pageSlices(1200,3600,[1100,2200]),p=>[p.y,p.height]),
    [[0,1100],[1100,1100],[2200,1400]]);
  assert.deepEqual(Array.from(f.api.pageSlices(1200,3600,[],null),p=>p.y),
    [0,1738,3476], 'legacy reports keep safe fixed-height fallback without pixel access');
  await f.api.createBlob(url,{roomStartsPx:[1100,2200]});
  assert.equal(f.pdfs[0].pages,3);
  assert.equal(f.pdfs[0].images.length,3);
  assert(f.pdfs[0].images.every(p=>p.h>0&&p.h<=281));
});

test('report UIs expose one-tap PDF downloads for iPhone, desktop and public viewer',()=>{
  const mobile=read('js/reports/172-aceil-plan-report-pwa.js');
  const desktop=read('js/reports/091-aceil-pdf-cloud-report.js');
  const pub=read('js/reports/092-aceil-public-report-page.js');
  const index=read('index.html');
  assert.match(mobile,/data-save>⬇ Завантажити PDF/);
  assert.match(mobile,/A_CEIL_ReportPdf\.download\(dataUrl,fileName,btn,\{roomStartsPx:canvas\.__aceilPdfRoomStartsPx\}\)/);
  assert.doesNotMatch(mobile,/data-save>Зберегти PNG/);
  assert.match(desktop,/id="png">⬇ PDF/);
  assert.match(desktop,/A·CEILPreparePdf\(id,pngBtn\)/);
  assert.match(pub,/id="rprPdfBtn">⬇ Завантажити PDF/);
  assert.match(pub,/A_CEIL_ReportPdf\.download\(data\.image,meta\.name/);
  assert.match(pub,/roomStartsPx:data\.pdfRoomStartsPx/);
  assert.match(desktop,/pageSlices\(c\.width,c\.height,c\.__aceilPdfRoomStartsPx,c\)/);
  assert.match(read('js/reports/037-aceil-report-settings-generator.js'),/markPdfRoomStarts\(finalOut,roomStarts\)/);
  assert(index.indexOf('237-aceil-image-report-pdf.js')<index.indexOf('092-aceil-public-report-page.js'),
    'PDF runtime available before client report renderer');
});
