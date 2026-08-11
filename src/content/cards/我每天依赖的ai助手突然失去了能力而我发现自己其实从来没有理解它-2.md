---
question: "在 Agent 开发中，实现模型解耦的两种主要方式是什么？它们的核心区别在哪里？"
answer: "两种方式分别是 Agent 内部抽象模型（Provider 模式）和 Agent 外部抽象协议（CC Switch 模式）。前者在 Agent 内部定义统一接口，屏蔽不同模型的实现差异；后者在 Agent 外部通过协议转换，让不同生态的模型能连接，Agent 无需关心底层协议。"
post: "我每天依赖的ai助手突然失去了能力而我发现自己其实从来没有理解它"
category: "编程与工具"
tags:
  - "Agent"
  - "解耦"
  - "设计模式"
status: 待复习
created: 2026-08-10
---
