import JSZip from 'jszip';
const WORD = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const DRAWING = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const xmlSpace = 'http://www.w3.org/XML/1998/namespace';
export async function openTextParts(bytes: Uint8Array, kind: string) {
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter(name => kind === 'docx' ? name === 'word/document.xml' : /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!names.length) throw new Error('文件中没有找到文档正文或幻灯片。');
  const parts = [];
  let count = 0;
  for (const name of names) {
    const xml = await zip.file(name)!.async('string');
    if (xml.length > 8 * 1024 * 1024 || /<!DOCTYPE/i.test(xml)) throw new Error('文档 XML 超出限制或含不支持的声明。');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('文档 XML 已损坏。');
    const nodes = Array.from(doc.getElementsByTagNameNS(kind === 'docx' ? WORD : DRAWING, 't'));
    count += nodes.length;
    if (count > 5000) throw new Error('文字片段数量超出当前编辑上限。');
    parts.push({ name, xml, doc, nodes });
  }
  return { zip, parts };
}
export async function saveTextParts(document: Awaited<ReturnType<typeof openTextParts>>, edits: Map<string, string>) {
  // Reload the original package for each export, preserving every unrelated entry.
  const zip = await JSZip.loadAsync(await document.zip.generateAsync({ type: 'uint8array' }));
  for (const part of document.parts) {
    const doc = new DOMParser().parseFromString(part.xml, 'application/xml');
    const namespace = part.nodes[0]?.namespaceURI;
    const nodes = namespace ? Array.from(doc.getElementsByTagNameNS(namespace, 't')) : [];
    let changed = false;
    nodes.forEach((node, index) => {
      const value = edits.get(part.name + ':' + index);
      if (value === undefined || value === node.textContent) return;
      if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('文字包含不能写入 XML 的控制字符。');
      node.textContent = value; node.setAttributeNS(xmlSpace, 'xml:space', 'preserve'); changed = true;
    });
    if (changed) zip.file(part.name, new XMLSerializer().serializeToString(doc));
  }
  return zip.generateAsync({ type: 'uint8array' });
}
