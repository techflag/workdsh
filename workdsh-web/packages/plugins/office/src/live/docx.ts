import JSZip from "jszip";
import ExcelJS from "exceljs";
import type { OfficeSnapshot, OfficeBlockInput, OfficeChart } from "workdsh-contracts/office";
const xml = (text: string) =>
  text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
/** Export one immutable committed native snapshot; portable browser/Host OOXML generator. */
export async function documentDocx(snapshot: OfficeSnapshot): Promise<Blob> {
  const zip = new JSZip();
  const numbers: { abstract: string; num: string }[] = [];
  const listStack: { type: string; start: number; numId: number }[] = [];
  const images: {id:string;extension:string;data:string}[]=[];
  const charts:{id:string;chart:OfficeChart}[]=[];
  const seriesColour=(chart:OfficeChart,index:number)=>chart.series[index]?.color?.slice(1) ?? ["2563EB","F97316","16A34A","9333EA","DC2626","0891B2"][index%6]!;
  const cache=(values:(string|number)[],numeric=false)=>`<c:${numeric?"num":"str"}Cache>${numeric?'<c:formatCode>General</c:formatCode>':""}<c:ptCount val="${values.length}"/>${values.map((value,index)=>`<c:pt idx="${index}"><c:v>${xml(String(value))}</c:v></c:pt>`).join("")}</c:${numeric?"num":"str"}Cache>`;
  const titleXml=(title:string)=>`<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="zh-CN"/><a:t>${xml(title)}</a:t></a:r></a:p></c:rich></c:tx><c:layout/><c:overlay val="0"/></c:title>`;
  function chartXml(chart:OfficeChart,index:number){
    const rowEnd=chart.categories.length+1,axis1=120000+index*2,axis2=axis1+1;
    const series=chart.series.map((item,si)=>`<c:ser><c:idx val="${si}"/><c:order val="${si}"/><c:tx><c:strRef><c:f>Sheet1!$${String.fromCharCode(66+si)}$1</c:f>${cache([item.name])}</c:strRef></c:tx><c:spPr><a:solidFill><a:srgbClr val="${seriesColour(chart,si)}"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr><c:cat><c:strRef><c:f>Sheet1!$A$2:$A$${rowEnd}</c:f>${cache(chart.categories)}</c:strRef></c:cat><c:val><c:numRef><c:f>Sheet1!$${String.fromCharCode(66+si)}$2:$${String.fromCharCode(66+si)}$${rowEnd}</c:f>${cache(item.values,true)}</c:numRef></c:val>${chart.chartType==="line"?'<c:marker><c:symbol val="circle"/><c:size val="5"/></c:marker>':""}</c:ser>`).join("");
    const axes=`<c:catAx><c:axId val="${axis1}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>${chart.xAxisTitle?titleXml(chart.xAxisTitle):""}<c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${axis2}"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/></c:catAx><c:valAx><c:axId val="${axis2}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/>${chart.yAxisTitle?titleXml(chart.yAxisTitle):""}<c:majorGridlines/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="${axis1}"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>`;
    const body=chart.chartType==="pie"?`<c:pieChart><c:varyColors val="1"/>${series}<c:firstSliceAng val="0"/></c:pieChart>`:chart.chartType==="doughnut"?`<c:doughnutChart><c:varyColors val="1"/>${series}<c:firstSliceAng val="0"/><c:holeSize val="55"/></c:doughnutChart>`:chart.chartType==="bar"?`<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:gapWidth val="90"/><c:axId val="${axis1}"/><c:axId val="${axis2}"/></c:barChart>`:chart.chartType==="line"?`<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:marker val="1"/><c:smooth val="0"/><c:axId val="${axis1}"/><c:axId val="${axis2}"/></c:lineChart>`:`<c:areaChart><c:grouping val="standard"/><c:varyColors val="0"/>${series}<c:axId val="${axis1}"/><c:axId val="${axis2}"/></c:areaChart>`;
    const legend=chart.legend==="none"?"":`<c:legend><c:legendPos val="${({top:"t",right:"r",bottom:"b",left:"l"} as const)[chart.legend ?? "bottom"]}"/><c:layout/><c:overlay val="0"/></c:legend>`;
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:date1904 val="0"/><c:lang val="zh-CN"/><c:roundedCorners val="0"/><c:chart>${chart.title?titleXml(chart.title):""}<c:autoTitleDeleted val="${chart.title?0:1}"/><c:plotArea><c:layout/>${body}${["pie","doughnut"].includes(chart.chartType)?"":axes}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:plotArea>${legend}<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/><c:showDLblsOverMax val="0"/></c:chart><c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>`;
  }
  function paragraphXml(block:OfficeBlockInput):string {
      const paragraph: string[] = [];
      if (block.type === "heading")
        paragraph.push(`<w:pStyle w:val="Heading${block.level}"/>`);
      const style = block.style;
      if (style?.alignment)
        paragraph.push(
          `<w:jc w:val="${style.alignment === "justify" ? "both" : style.alignment}"/>`,
        );
      if (style?.lineHeight)
        paragraph.push(
          `<w:spacing w:line="${Math.round(style.lineHeight * 240)}" w:lineRule="auto"/>`,
        );
      const list = block.list;
      if (!list) listStack.length = 0;
      else {
        listStack.length = Math.min(listStack.length, list.depth + 1);
        const previous = listStack[list.depth],
          start = list.start ?? 1;
        if (
          !previous ||
          previous.type !== list.type ||
          previous.start !== start
        ) {
          listStack.length = list.depth;
          const numId = numbers.length + 1;
          const levels = Array.from(
            { length: 6 },
            (_, level) =>
              `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${list.type === "bullet" ? "bullet" : "decimal"}"/><w:lvlText w:val="${list.type === "bullet" ? ["•", "◦", "▪"][level % 3] : `%${level + 1}.`}"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="${720 * (level + 1)}"/></w:tabs><w:ind w:left="${720 * (level + 1)}" w:hanging="360"/></w:pPr></w:lvl>`,
          ).join("");
          numbers.push({
            abstract: `<w:abstractNum w:abstractNumId="${numId}"><w:multiLevelType w:val="multilevel"/>${levels}</w:abstractNum>`,
            num: `<w:num w:numId="${numId}"><w:abstractNumId w:val="${numId}"/><w:lvlOverride w:ilvl="${list.depth}"><w:startOverride w:val="${start}"/></w:lvlOverride></w:num>`,
          });
          listStack.push({ type: list.type, start, numId });
        }
        if (!list.continuation)
          paragraph.push(
            `<w:numPr><w:ilvl w:val="${list.depth}"/><w:numId w:val="${listStack[list.depth].numId}"/></w:numPr>`,
          );
      }
      const left =
        (list ? 720 * (list.depth + 1) : 0) + (style?.indent ?? 0) * 360;
      if (left)
        paragraph.push(
          `<w:ind w:left="${left}"${list && !list.continuation ? ' w:hanging="360"' : ""}/>`,
        );
      const runs = block.runs
        .map((run) => {
          const marks = run.marks
            .map(
              (mark) =>
                ({
                  bold: "<w:b/>",
                  italic: "<w:i/>",
                  underline: '<w:u w:val="single"/>',
                  strike: "<w:strike/>",
                })[mark],
            )
            .join("");
          const style = run.style;
          const props =
            marks +
            (style?.fontFamily
              ? `<w:rFonts w:ascii="${xml(style.fontFamily)}" w:hAnsi="${xml(style.fontFamily)}" w:eastAsia="${xml(style.fontFamily)}"/>`
              : "") +
            (style?.fontSize
              ? `<w:sz w:val="${Math.round(style.fontSize * 2)}"/><w:szCs w:val="${Math.round(style.fontSize * 2)}"/>`
              : "") +
            (style?.color ? `<w:color w:val="${style.color.slice(1)}"/>` : "") +
            (style?.backgroundColor
              ? `<w:shd w:val="clear" w:fill="${style.backgroundColor.slice(1)}"/>`
              : "");
          const text = run.text
            .split(/\r\n|\r|\n/)
            .map((t) => `<w:t xml:space="preserve">${xml(t)}</w:t>`)
            .join("<w:br/>");
          return `<w:r><w:rPr>${props}</w:rPr>${text}</w:r>`;
        })
        .join("");
      return `<w:p>${paragraph.length ? `<w:pPr>${paragraph.join("")}</w:pPr>` : ""}${runs}</w:p>`;
    }
  function blockXml(block:OfficeBlockInput):string {
    if(!block) throw new Error("文档结构不完整，无法下载。");
    if(block.type==="image") {
      const image=block.image!, id=`image${images.length+1}`, extension=image.src.startsWith("data:image/png;") ? "png" : "jpeg";
      images.push({id,extension,data:image.src.split(",")[1]!});
      const cx=Math.round(image.width*9525),cy=Math.round(image.height*9525),n=images.length;
      return `<w:p><w:pPr><w:jc w:val="${image.alignment ?? "left"}"/></w:pPr><w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${n}" name="${id}" descr="${xml(image.alt ?? "")}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="${id}" descr="${xml(image.alt ?? "")}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    }
    if(block.type==="chart") {
      const chart=block.chart!,id=`chart${charts.length+1}`,n=images.length+charts.length+1,cx=Math.round(chart.width*9525),cy=Math.round(chart.height*9525);charts.push({id,chart});
      return `<w:p><w:pPr><w:jc w:val="${chart.alignment ?? "left"}"/></w:pPr><w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${n}" name="${xml(chart.title ?? id)}"/><wp:cNvGraphicFramePr/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart r:id="${id}"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    }
    if(block.type!=="table") return paragraphXml(block);
    listStack.length=0;
    const rows=block.table!.rows, grid:({cell:typeof rows[number]["cells"][number];origin:boolean}|undefined)[][]=rows.map(()=>[]);
    rows.forEach((row,y)=>{let x=0;row.cells.forEach(cell=>{while(grid[y]![x]) x++;for(let dy=0;dy<cell.rowspan;dy++)for(let dx=0;dx<cell.colspan;dx++)grid[y+dy]![x+dx]={cell,origin:dy===0};x+=cell.colspan;});});
    const width=grid[0]!.length, widths=Array.from({length:width},(_,x)=>{
      for(const row of grid){let col=0;while(col<row.length){const slot=row[col]!;if(x>=col && x<col+slot.cell.colspan && slot.cell.colwidth?.[x-col])return slot.cell.colwidth[x-col]!*15;col+=slot.cell.colspan;}}
      return Math.floor(9746/width);
    });
    return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/><w:tblBorders>${["top","left","bottom","right","insideH","insideV"].map(side=>`<w:${side} w:val="single" w:sz="4" w:color="C7CED8"/>`).join("")}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>${grid.map(row=>{
      const cells:string[]=[];for(let x=0;x<width;){const {cell,origin}=row[x]!;const props=`<w:tcW w:w="${widths.slice(x,x+cell.colspan).reduce((a,b)=>a+b,0)}" w:type="dxa"/>${cell.colspan>1 ? `<w:gridSpan w:val="${cell.colspan}"/>` : ""}${cell.rowspan>1 ? `<w:vMerge${origin ? ' w:val="restart"' : ""}/>` : ""}${cell.header ? '<w:shd w:fill="F0F3F8"/>' : ""}`;
      listStack.length=0;
      cells.push(`<w:tc><w:tcPr>${props}</w:tcPr>${origin ? cell.paragraphs.map(paragraphXml).join("") : "<w:p/>"}</w:tc>`);x+=cell.colspan;}
      return `<w:tr>${row.every(slot=>slot?.cell.header) ? '<w:trPr><w:tblHeader/></w:trPr>' : ""}${cells.join("")}</w:tr>`;
    }).join("")}</w:tbl>`;
  }
  const body = snapshot.state.blockIds.map(id=>blockXml(snapshot.state.blocks[id]!)).join("");
  for(const image of images) zip.file(`word/media/${image.id}.${image.extension}`,image.data,{base64:true});
  for(let index=0;index<charts.length;index++){
    const {id,chart}=charts[index]!,workbook=new ExcelJS.Workbook(),sheet=workbook.addWorksheet("Sheet1");
    sheet.addRow(["分类",...chart.series.map(series=>series.name)]);
    chart.categories.forEach((category,row)=>sheet.addRow([category,...chart.series.map(series=>series.values[row])]));
    zip.file(`word/charts/${id}.xml`,chartXml(chart,index));
    zip.file(`word/charts/_rels/${id}.xml.rels`,`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/Microsoft_Excel_Worksheet${index+1}.xlsx"/></Relationships>`);
    zip.file(`word/embeddings/Microsoft_Excel_Worksheet${index+1}.xlsx`,await workbook.xlsx.writeBuffer());
  }
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Default Extension="xlsx" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>${charts.map(({id})=>`<Override PartName="/word/charts/${id}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join("")}${numbers.length ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' : ""}</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${images.map(image=>`<Relationship Id="${image.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${image.id}.${image.extension}"/>`).join("")}${charts.map(({id})=>`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="charts/${id}.xml"/>`).join("")}${numbers.length ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>' : ""}</Relationships>`,
  );
  if (numbers.length)
    zip.file(
      "word/numbering.xml",
      `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${numbers.map((n) => n.abstract).join("")}${numbers.map((n) => n.num).join("")}</w:numbering>`,
    );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr></w:body></w:document>`,
  );
  zip.file(
    "word/styles.xml",
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="等线"/><w:sz w:val="24"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${[1, 2, 3, 4, 5, 6].map((level) => `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="160"/><w:outlineLvl w:val="${level - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${[40, 32, 28, 26, 24, 24][level - 1]}"/></w:rPr></w:style>`).join("")}</w:styles>`,
  );
  // Fixed metadata makes a frozen semantic revision produce the same bytes on retries.
  zip.forEach((_path, entry) => {entry.date = new Date(1980, 0, 1, 0, 0, 0);});
  return zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    compression: "DEFLATE",
  });
}
export async function downloadDocument(snapshot: OfficeSnapshot) {
  const blob = await documentDocx(snapshot),
    url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${
    snapshot.title
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .replace(/[. ]+$/g, "")
      .slice(0, 120) || "文档"
  }.docx`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
