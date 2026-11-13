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
test('report UIs expose one-tap PDF downloads for iPhone, desktop and public viewer',()=>{
  const mobile=read('js/reports/172-aceil-plan-report-pwa.js');
  const desktop=read('js/reports/091-aceil-pdf-cloud-report.js');
  const pub=read('js/reports/092-aceil-public-report-page.js');
  const index=read('index.html');
  assert.match(mobile,/data-save>⬇ Завантажити PDF/);
  assert.match(mobile,/A_CEIL_ReportPdf\.download\(dataUrl,fileName,btn\)/);
  assert.doesNotMatch(mobile,/data-save>Зберегти PNG/);
  assert.match(desktop,/id="png">⬇ PDF/);
  assert.match(desktop,/A·CEILPreparePdf\(id,pngBtn\)/);
  assert.match(pub,/id="rprPdfBtn">⬇ Завантажити PDF/);
  assert.match(pub,/A_CEIL_ReportPdf\.download\(data\.image,meta\.name/);
  assert(index.indexOf('237-aceil-image-report-pdf.js')<index.indexOf('092-aceil-public-report-page.js'),
    'PDF runtime available before client report renderer');
  assert.match(mobile,/payload\.pdfBreaks=canvas\.dataset\.aceilPdfBreaks/);
  assert.match(mobile,/breaks:canvas&&canvas\.dataset&&canvas\.dataset\.aceilPdfBreaks/);
  assert.match(desktop,/A_CEIL_ReportPdf\.createDocument\(image,\{breaks:breaks\}\)/);
  assert.match(desktop,/payload\.pdfBreaks=r\.canvas\.dataset\.aceilPdfBreaks/);
  assert.match(pub,/breaks:data\.pdfBreaks/);
  const generator=read('js/reports/037-aceil-report-settings-generator.js');
  assert.match(generator,/pdfRoomStarts\.push\(y\)/,
    'generator must provide precise room starts instead of blind slicing');
  assert.match(generator,/dataset\.aceilPdfBreaks/);
});

test('room boundaries make each room begin on a fresh A4 page, without cutting its heading',async()=>{
  const f=fixture();
  const breaks=[0.4,0.8]; // source image 3600 px, room starts at 1440 and 2880
  const pdf=await f.api.createDocument('data:image/png;base64,aGVsbG8=',{breaks:JSON.stringify(breaks)});
  assert.equal(pdf.pages,3);
  assert.equal(pdf.images.length,3);
  const logicalMm=px=>px*194/1200;
  assert(Math.abs(pdf.images[0].h-logicalMm(1440))<0.05,
    'first page ends precisely before the next room');
  assert(Math.abs(pdf.images[1].h-logicalMm(1440))<0.05,
    'second page contains the whole second room');
  assert(Math.abs(pdf.images[2].h-logicalMm(720))<0.05,
    'last short section has its own page, without a fragment of another room');
  assert(pdf.images.every(x=>x.h<=281),'nothing may extend beyond A4 printable height');
});
test('old public snapshots with no PDF metadata stay downloadable via safe fallback',async()=>{
  const f=fixture(),blob=await f.api.createBlob('data:image/png;base64,aGVsbG8=');
  assert.equal(blob.type,'application/pdf');
  assert(f.pdfs[0].pages>=2);
  assert(f.pdfs[0].images.every(x=>x.h<=281));
});
test('adding a calculation no longer tells users it must be a no-insert version',()=>{
  const archive=read('js/projects/230-aceil-project-archive.js');
  assert.match(archive,/badge\.textContent=alt\?"◫ 2 варіанти · Обрати":"＋ Додати прорахунок"/);
  assert.match(archive,/create\.textContent="＋ Додати прорахунок"/);
  assert.doesNotMatch(archive,/＋ Варіант без вставки|＋ Створити варіант без вставки/);
});
