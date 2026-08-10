---
question: "Agent 内部抽象模型与外部抽象协议有何区别？"
answer: "**内部抽象**（Provider 模式）在 Agent 内定义统一接口，屏蔽底层模型差异；**外部抽象**（CC Switch 模式）在 Agent 外处理协议转换，Agent 保持原有调用方式，由中间层负责不同生态间的语言翻译。"
post: "我每天依赖的ai助手突然失去了能力，而我发现自己其实从来没有理解它"
category: "编程与工具"
tags:
  - "架构设计"
  - "解耦"
  - "Agent"
status: 待复习
created: 2026-08-10
---
