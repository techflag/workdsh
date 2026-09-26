import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const req=createRequire(path.resolve('.artifacts/pptx-react-trial/package.json'));
const JSZip=req('jszip');const {XMLParser,XMLBuilder}=req('fast-xml-parser');
const ExcelJS=createRequire(path.resolve('packages/plugins/office/package.json'))('exceljs');
const parser=new XMLParser({ignoreAttributes:false,parseTagValue:false,parseAttributeValue:false});const builder=new XMLBuilder({ignoreAttributes:false});
const array=v=>v===undefined?[]:Array.isArray(v)?v:[v];
export async function completeWorkbooks(input){
 const z=await JSZip.loadAsync(input);let added=0;
 for(const name of Object.keys(z.files).filter(n=>/^ppt\/charts\/chart\d+\.xml$/.test(n))){
  const doc=parser.parse(await z.file(name).async('string'));const space=doc['c:chartSpace'];if(!space||space['c:externalData'])continue;
  const plot=space['c:chart']?.['c:plotArea'];if(!plot)continue;
  const kinds=['c:pieChart','c:barChart','c:lineChart','c:doughnutChart','c:areaChart'];
  const kind=kinds.find(k=>plot[k]);if(!kind)throw Error('Unsupported new chart workbook type: '+name);
  const series=array(plot[kind]['c:ser']);if(!series.length)throw Error('Missing series');
  const wb=new ExcelJS.Workbook();const sheet=wb.addWorksheet('ChartData');sheet.getCell('A1').value='Category';
  for(let i=0;i<series.length;i++){
   const ser=series[i],cat=ser['c:cat']?.['c:strLit'],val=ser['c:val']?.['c:numLit'];
   if(!cat||!val)throw Error('Requires literal new chart data: '+name);
   const cats=array(cat['c:pt']),vals=array(val['c:pt']);if(cats.length!==vals.length||cats.length>5000)throw Error('Invalid chart data');
   const col=sheet.getColumn(i+2).letter;const title=ser['c:tx']?.['c:v']??'Series '+(i+1);sheet.getCell(1,i+2).value=String(title);
   for(let j=0;j<cats.length;j++){const x=Number(vals[j]['c:v']);if(!Number.isFinite(x))throw Error('Non-numeric value');sheet.getCell(j+2,1).value=String(cats[j]['c:v']);sheet.getCell(j+2,i+2).value=x;}
   ser['c:tx']={'c:strRef':{'c:f':`ChartData!$${col}$1`,'c:strCache':{'c:ptCount':{'@_val':'1'},'c:pt':{'@_idx':'0','c:v':String(title)}}}};
   ser['c:cat']={'c:strRef':{'c:f':`ChartData!$A$2:$A$${cats.length+1}`,'c:strCache':cat}};
   ser['c:val']={'c:numRef':{'c:f':`ChartData!$${col}$2:$${col}$${cats.length+1}`,'c:numCache':val}};
  }
  let index=++added;let wbname=`WorkDSH_Chart${index}.xlsx`;while(z.file('ppt/embeddings/'+wbname))wbname=`WorkDSH_Chart${++index}.xlsx`;
  const relpath='ppt/charts/_rels/'+path.basename(name)+'.rels';const rel=z.file(relpath)?parser.parse(await z.file(relpath).async('string')):{Relationships:{'@_xmlns':'http://schemas.openxmlformats.org/package/2006/relationships'}};
  const relations=array(rel.Relationships.Relationship);let rid='rIdWorkbook';while(relations.some(r=>r['@_Id']===rid))rid+='X';
  relations.push({'@_Id':rid,'@_Type':'http://schemas.openxmlformats.org/officeDocument/2006/relationships/package','@_Target':'../embeddings/'+wbname});rel.Relationships.Relationship=relations;
  space['c:externalData']={'@_r:id':rid,'c:autoUpdate':{'@_val':'0'}};
  z.file(name,builder.build(doc));z.file(relpath,builder.build(rel));z.file('ppt/embeddings/'+wbname,await wb.xlsx.writeBuffer());
 }
 if(!added)return {bytes:input,added:0};
 const ct=parser.parse(await z.file('[Content_Types].xml').async('string'));const defs=array(ct.Types.Default);if(!defs.some(d=>d['@_Extension']==='xlsx'))defs.push({'@_Extension':'xlsx','@_ContentType':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});ct.Types.Default=defs;z.file('[Content_Types].xml',builder.build(ct));
 return {bytes:await z.generateAsync({type:'nodebuffer',compression:'DEFLATE'}),added};
}
if(process.argv[2]){const r=await completeWorkbooks(await readFile(process.argv[2]));await writeFile(process.argv[3],r.bytes);console.log({added:r.added});}
