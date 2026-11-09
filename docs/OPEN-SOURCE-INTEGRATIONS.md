# 开源连接器与内容来源

本项目优先通过 RSS、公开 API 或本地导入连接开源项目，不复制第三方站点的全文、音频或付费内容。

## 已接入

- 新闻页：Node RSS/Atom 连接器。保存公开源后，服务端每小时刷新，页面打开时也会刷新；内容进入收件箱，确认后才进入阅读列表。
- GitHub 资源库：通过 GitHub API 读取公开仓库信息、Issues、文件和用户 Stars。
- 英语模块：从新闻 RSS 收件箱/阅读列表筛选英文标题，手动加入精读计划；没有绕过外刊付费墙。
- 科研模块：Crossref 公开书目检索接口已经接入服务器路由，页面可将检索结果加入个人阅读库。在线可用性取决于本机服务器和外网连接。
- 学习内容：金融知识页当前提供 12 节顺序主题与技能页项目提示，属于本地精选素材，不依赖第三方服务，也不会每日自动产生新内容。
- Agent 工作区：支持可选 OpenAI-compatible chat completions 接口。模型由用户自行配置；AI 建议只用于回答或形成候选记录，写入英语、技能或科研日志前需人工确认。

## 推荐的独立服务

| 项目 | 用途 | 许可证 | 接入方式 |
| --- | --- | --- | --- |
| [TrendRadar](https://github.com/sansan0/TrendRadar) | RSS、关键词筛选、新闻简报和推送 | GPL-3.0 | 独立部署后通过 API/Webhook 接入 |
| [Huginn](https://github.com/huginn/huginn) | 定时抓取、事件流和自动化 Agent | MIT | 独立部署后向本项目写入 Webhook |
| [RSSHub](https://github.com/DIYgod/RSSHub) | 为公开网站生成 RSS 路由 | AGPL-3.0 | 使用合法公开实例或独立部署 |
| [zotero-mcp](https://github.com/cookjohn/zotero-mcp) | Zotero 文献库与 MCP 查询 | MIT | 论文模块后续接待读队列 |
| [a-stock-data](https://github.com/simonlin1212/a-stock-data) | A 股行情、公告、财务和宏观数据 | Apache-2.0 | 后续作为 Python 数据服务 |
| [coding-for-economists](https://github.com/aeturrell/coding-for-economists) | 经济学 Python 与数据分析学习材料 | MIT | 作为技能学习资源，不复制教材内容 |
| [IELTS Speaking AI](https://github.com/1599570912/IELTS-Speaking-AI) | 浏览器口语练习、语音识别和本地历史 | MIT | 先以外链/独立自托管使用，接入时不复制题库 |
| [IELTS Practice](https://github.com/sallowayma-git/IELTS-practice) | 阅读、听力练习和错题统计 | GPL-3.0 | 仅个人自托管；仓库明确提示题源、音频和 PDF 有第三方版权风险 |
| [Chinook Database](https://github.com/lerocha/chinook-database) | 虚构交易数据及关系型数据模型，可练习 Excel 汇总和 SQL 查询 | MIT | 页面只链接至上游；数据包含客户、发票、商品和销售额 |

## 内容与许可证边界

- 《经济学人》应使用合法订阅、官方 RSS 或文章链接。页面可以保存标题、链接和用户自己的笔记，不绕过付费墙，不抓取或重新发布全文、PDF、音频和翻译。
- 没有许可证的 GitHub 仓库只作为学习参考，不默认复制代码或打包进本项目。
- GPL/AGPL 项目可以独立运行并通过接口连接；若未来复制或修改其代码，需要遵守对应许可证的源代码和版权声明要求。
- 新闻摘要目前是 RSS 提供的摘要和规则式学习提示，不冒充事实核查或专业投资建议。

## 后续接入顺序

1. 先验证本地 RSS 源稳定性和分类规则。
2. 在有网络环境验证 Crossref 搜索，并接入 Zotero 文献待读队列。
3. 再评估 Huginn/TrendRadar 作为独立 sidecar；不在没有明确需求时把大型服务直接塞进主应用。
