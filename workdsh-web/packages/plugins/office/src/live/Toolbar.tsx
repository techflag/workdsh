import React, { useState } from "react";
import { Toolbar as NativeToolbar, ToolbarGroup } from "./tiptap-ui/toolbar.js";
import { Button } from "./tiptap-ui/button.js";
import { BoldIcon } from "./tiptap-ui/bold-icon.js";
import { ItalicIcon } from "./tiptap-ui/italic-icon.js";
import { UnderlineIcon } from "./tiptap-ui/underline-icon.js";
import { StrikeIcon } from "./tiptap-ui/strike-icon.js";
import { AlignLeftIcon } from "./tiptap-ui/align-left-icon.js";
import { AlignCenterIcon } from "./tiptap-ui/align-center-icon.js";
import { AlignRightIcon } from "./tiptap-ui/align-right-icon.js";
import { AlignJustifyIcon } from "./tiptap-ui/align-justify-icon.js";
import { ListIcon } from "./tiptap-ui/list-icon.js";
import { ListOrderedIcon } from "./tiptap-ui/list-ordered-icon.js";
import { Undo2Icon } from "./tiptap-ui/undo2-icon.js";
import { Redo2Icon } from "./tiptap-ui/redo2-icon.js";
import { HighlighterIcon } from "./tiptap-ui/highlighter-icon.js";
import type { createDocumentModel } from "./model.js";
type Model = ReturnType<typeof createDocumentModel>;
const fonts = [
  "宋体",
  "黑体",
  "微软雅黑",
  "等线",
  "仿宋",
  "楷体",
  "Arial",
  "Calibri",
  "Times New Roman",
  "Georgia",
];
const sizes = [
  6, 8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72, 96,
];
export function Toolbar({
  model,
  disabled,
  zoom,
  setZoom,
}: {
  model: Model;
  disabled: boolean;
  zoom: number;
  setZoom: (value: number) => void;
}) {
  const { controls } = model.getSnapshot();
  const [searching, setSearching] = useState(false),
    [query, setQuery] = useState(""),
    [replacement, setReplacement] = useState(""),
    [message, setMessage] = useState("");
  const icons: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
    "撤销": Undo2Icon, "重做": Redo2Icon, "加粗": BoldIcon, "斜体": ItalicIcon,
    "下划线": UnderlineIcon, "删除线": StrikeIcon, "左对齐": AlignLeftIcon,
    "居中对齐": AlignCenterIcon, "右对齐": AlignRightIcon, "两端对齐": AlignJustifyIcon,
    "项目符号": ListIcon, "编号列表": ListOrderedIcon,
  };
  const icon = (label: string, text: string) => {
    const Icon = icons[label];
    if (Icon) return <Icon className="tiptap-button-icon" aria-hidden="true" />;
    const paths: Record<string, string> = {
      "减少缩进": "M9 5h12M9 12h12M9 19h12M5 8l-4 4 4 4",
      "增加缩进": "M9 5h12M9 12h12M9 19h12M1 8l4 4-4 4",
      "全选": "M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 7h10v10H7z",
      "清除格式": "M9 4h11M15 4l-4 12M3 17l5-5 6 6-3 3H7zM14 21h7",
      "查找与替换": "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16M16 16l6 6",
    };
    return paths[label] ? <svg className="tiptap-button-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[label]} /></svg> : text;
  };
  const button = (
    label: string,
    text: string,
    run: () => void,
    active?: boolean,
    blocked = false,
  ) => (
    <Button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={blocked}
      onMouseDown={(e) => e.preventDefault()}
      onClick={run}
    >
      {icon(label, text)}
    </Button>
  );
  return (
    <>
      <NativeToolbar
        className="wd-office-ribbon"
        role="toolbar"
        aria-label="文档编辑工具"
      >
        <div className="wd-office-viewtools">
          <Button
            type="button"
            aria-label="查找与替换"
            aria-expanded={searching}
            onClick={() => setSearching(!searching)}
          >
            {icon("查找与替换", "查找")}
          </Button>

          <select
            aria-label="文档缩放"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          >
            {[50, 75, 90, 100, 125, 150, 200].map((n) => (
              <option key={n} value={n}>
                {n}%
              </option>
            ))}
          </select>
        </div>
        <fieldset disabled={disabled}>
          <div className="wd-office-ribbon-row">
            <ToolbarGroup className="wd-office-toolgroup">
              <select aria-label="表格操作" value="" onChange={e=>{model.tableAction(e.target.value as Parameters<Model["tableAction"]>[0]);e.target.value="";}}>
                <option value="" disabled>表格</option>
                {[["insertTable","插入3×3表格"],["addRowBefore","上方插入行"],["addRowAfter","下方插入行"],["deleteRow","删除行"],["addColumnBefore","左侧插入列"],["addColumnAfter","右侧插入列"],["deleteColumn","删除列"],["mergeCells","合并选中单元格"],["splitCell","拆分单元格"],["toggleHeaderRow","切换标题行"],["deleteTable","删除表格"]].map(([value,label])=><option key={value} value={value} disabled={!model.canTableAction(value as Parameters<Model["tableAction"]>[0])}>{label}</option>)}
              </select>
              <label className="wd-office-image-upload">插入图片<input aria-label="插入图片" type="file" accept="image/png,image/jpeg" onChange={async e=>{const file=e.target.files?.[0];e.target.value="";if(file) try{await model.insertImage(file);}catch(error){setSearching(true);setMessage(error instanceof Error ? error.message : "图片插入失败。");}}}/></label>
              <select aria-label="图片对齐" disabled={!model.canAlignImage()} value="" onChange={e=>model.imageAlignment(e.target.value as "left"|"center"|"right")}>
                <option value="" disabled>图片对齐</option><option value="left">靠左</option><option value="center">居中</option><option value="right">靠右</option>
              </select>
            </ToolbarGroup>
            <ToolbarGroup className="wd-office-toolgroup">
              {button(
                "撤销",
                "↶",
                () => model.action("undo"),
                undefined,
                !controls.undo,
              )}
              {button(
                "重做",
                "↷",
                () => model.action("redo"),
                undefined,
                !controls.redo,
              )}
            </ToolbarGroup>
            <ToolbarGroup className="wd-office-toolgroup">
              <select
                aria-label="段落样式"
                value={controls.level}
                onChange={(e) =>
                  model.paragraph(Number(e.target.value) as 0 | 1 | 2 | 3)
                }
              >
                <option value="0">正文</option>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    标题 {n}
                  </option>
                ))}
              </select>
              <select
                aria-label="字体"
                value={controls.fontFamily}
                onChange={(e) => model.textStyle("fontFamily", e.target.value)}
              >
                <option value="">默认字体</option>
                {!fonts.includes(controls.fontFamily) &&
                  controls.fontFamily && <option>{controls.fontFamily}</option>}
                {fonts.map((font) => (
                  <option key={font}>{font}</option>
                ))}
              </select>
              <select
                aria-label="字号"
                value={controls.fontSize}
                onChange={(e) => model.textStyle("fontSize", e.target.value)}
              >
                {!sizes.includes(controls.fontSize) && (
                  <option>{controls.fontSize}</option>
                )}
                {sizes.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </ToolbarGroup>
            <ToolbarGroup className="wd-office-toolgroup">
              {(
                [
                  ["加粗", "B", "bold"],
                  ["斜体", "I", "italic"],
                  ["下划线", "U", "underline"],
                  ["删除线", "S", "strike"],
                ] as const
              ).map(([label, text, action]) => (
                <React.Fragment key={action}>
                  {button(
                    label,
                    text,
                    () => model.format(action),
                    controls[action],
                  )}
                </React.Fragment>
              ))}
              <label className="wd-office-color" title="文字颜色">
                <Button
                  type="button"
                  aria-label="应用文字颜色"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => model.textStyle("color", controls.color)}
                >
                  A
                </Button>
                <input
                  aria-label="文字颜色"
                  type="color"
                  value={controls.color}
                  onChange={(e) => model.textStyle("color", e.target.value)}
                />
              </label>
              <label className="wd-office-color" title="文字高亮">
                <Button
                  type="button"
                  aria-label="应用文字高亮"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    model.textStyle("backgroundColor", controls.backgroundColor)
                  }
                >
                  <HighlighterIcon className="tiptap-button-icon" aria-hidden="true" />
                </Button>
                <input
                  aria-label="文字高亮"
                  type="color"
                  value={controls.backgroundColor}
                  onChange={(e) =>
                    model.textStyle("backgroundColor", e.target.value)
                  }
                />
              </label>
            </ToolbarGroup>
          </div>
          <div className="wd-office-ribbon-row">
            <ToolbarGroup className="wd-office-toolgroup">
              {(
                [
                  ["左对齐", "左", "left"],
                  ["居中对齐", "中", "center"],
                  ["右对齐", "右", "right"],
                  ["两端对齐", "齐", "justify"],
                ] as const
              ).map(([label, text, value]) => (
                <React.Fragment key={value}>
                  {button(
                    label,
                    text,
                    () => model.alignment(value),
                    controls.alignment === value,
                  )}
                </React.Fragment>
              ))}
              <select
                aria-label="行距"
                value={controls.lineHeight}
                onChange={(e) => model.lineHeight(Number(e.target.value))}
              >
                <option value="1">单倍行距</option>
                <option value="1.15">1.15 倍</option>
                <option value="1.5">1.5 倍</option>
                <option value="1.85">默认行距</option>
                <option value="2">双倍行距</option>
                <option value="2.5">2.5 倍</option>
                <option value="3">3 倍</option>
                {![1, 1.15, 1.5, 1.85, 2, 2.5, 3].includes(
                  controls.lineHeight,
                ) && (
                  <option value={controls.lineHeight}>
                    {controls.lineHeight} 倍
                  </option>
                )}
              </select>
            </ToolbarGroup>
            <ToolbarGroup className="wd-office-toolgroup">
              {button(
                "项目符号",
                "• 列表",
                () => model.action("bullet"),
                controls.bullet,
              )}
              {button(
                "编号列表",
                "1. 编号",
                () => model.action("ordered"),
                controls.ordered,
              )}
              {button("减少缩进", "← 缩进", () => model.action("outdent"))}
              {button("增加缩进", "缩进 →", () => model.action("indent"))}
            </ToolbarGroup>

            <ToolbarGroup className="wd-office-toolgroup">
              {button("全选", "全选", () => model.action("selectAll"))}
              {button("清除格式", "清除格式", () => model.action("clear"))}
            </ToolbarGroup>
          </div>
        </fieldset>

        <span className="wd-office-count">{controls.characters} 字符</span>
      </NativeToolbar>
      {searching && (
        <div
          className="wd-office-search"
          role="search"
          aria-label="文档查找替换"
        >
          <input
            aria-label="查找文字"
            placeholder="查找文字"
            value={query}
            maxLength={2000}
            onChange={(e) => {
              setQuery(e.target.value);
              setMessage("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") setMessage(`找到 ${model.find(query)} 处`);
            }}
          />
          <Button
            disabled={!query}
            onClick={() => setMessage(`找到 ${model.find(query)} 处`)}
          >
            下一处
          </Button>
          <input
            aria-label="替换为"
            placeholder="替换为"
            value={replacement}
            maxLength={20000}
            onChange={(e) => setReplacement(e.target.value)}
          />
          <Button
            disabled={disabled || !query}
            onClick={() =>
              setMessage(
                `已替换 ${model.replace(query, replacement, false)} 处`,
              )
            }
          >
            替换
          </Button>
          <Button
            disabled={disabled || !query}
            onClick={() =>
              setMessage(`已替换 ${model.replace(query, replacement, true)} 处`)
            }
          >
            全部替换
          </Button>
          <span role="status">{message}</span>
        </div>
      )}
    </>
  );
}
