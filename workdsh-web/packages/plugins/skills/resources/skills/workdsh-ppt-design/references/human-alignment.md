# 需求对齐与风格选择

先读取主题、附件、听众、时长/页数和落款。只问会改变内容或交付的缺口，一轮最多三个问题。工具目录有 `ask_user_question` 时使用官方结构化提问；没有时普通文字询问并结束当前回复等待，不能把等待时间当作答案。

## 何时展示四套方案

没有具体视觉风格时，先打开原生 PPT 并提交第一张有用草稿，再调用 `content_preview_styles`。title 使用真实主题，subtitle 使用材料中的汇报类型，footer 仅使用已知日期/单位/汇报人；未知落款为空，不编造。默认 family:"general"；用户只说“红色”时 family:"red"。推荐默认A，可根据受众/材料选A–D，并简要说明原因。不能因为科技/学术场景就跳过用户选择。

以下情况直接制作，不增加选择：已有明确模板；已明确具体风格（如红金政务、石墨青灰）；用户要求快速交付、你决定或不要追问。只给颜色、说好看一点不算具体风格。

## 预览与等待

调用参数：title、可选subtitle/footer、family:"general"或"red"、recommended:"A"–"D"、唯一operationId。返回保存的HTML documentId、四个style及其label/palette/layout/tags；status:requested 仅代表请求右侧展示，不代表浏览器确已显示。它不是整份PPT或导出文件。保存原始PPT documentId，不将预览HTML当作PPT继续写。

然后调用官方 `ask_user_question`，questions:[{id:"ppt-style",question:"选哪套视觉风格？也可以描述其他偏好。",header:"PPT风格",options:[{label:返回style.label,description:标签与版式说明},...]}]。选项label与返回的四套方案保持一致，推荐说明放description；等待真实答案后才能继续。不要仅发出提问后自行默认A。用户可自由输入；回答“红色”就另建family:red预览并再问一次，不静默认定红金。更具体的自定义偏好直接执行；不强迫所有偏好匹配八套固定方案。

当前卡片只展示，不具备提交按钮；真正选择在官方提问界面。如果提问无provider或工具不可用，保留预览，以普通文字列出四个label并等待用户回答，不伪造点击成功、不循环重试。取消即停止制作。

## 选择后继续

用 `content_open` source:"existing" 和原始PPT documentId 恢复右侧PPT；重读最新revision和页面，保留用户编辑。根据返回的选定palette与layout制定一致的字体、密度、图表色、封面结构和章节节奏，应用到真实原生元素，不只改封面标题。先制作封面及两张代表性内容页给用户检查；未要求再确认则继续剩余页，不强行增加审批。新建默认总页数不足3时遵守用户页数。

修改风格时优先局部更新已有PPT，不重新创建丢失用户编辑。材料缺失的数据保留明确待补项。最终逐页检查并通过content_export交付实际PPTX；预览保存、工具成功或样稿完成都不能代表整份交付验收。
