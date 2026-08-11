---
question: "CC Switch 的核心作用是什么？它和简单的配置管理器有何本质区别？"
answer: "CC Switch 是一个协议转换层，充当 Agent 和模型之间的“翻译官”。它不只修改配置，而是负责将 Agent 的请求（如 Responses API）转换成上游模型能理解的格式（如 Chat Completions API），并在返回时再次转换，使 Agent 无感地切换模型。"
post: "我每天依赖的ai助手突然失去了能力而我发现自己其实从来没有理解它"
category: "编程与工具"
tags:
  - "CC Switch"
  - "协议转换"
  - "中间件"
status: 待复习
created: 2026-08-10
---
