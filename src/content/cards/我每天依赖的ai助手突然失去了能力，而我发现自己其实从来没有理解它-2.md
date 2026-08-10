---
question: "Agent 内部抽象模型与 CC Switch 抽象协议的设计思路有何本质区别？"
answer: "Agent 内部抽象模型是通过定义统一的 Provider 基类，让核心逻辑不依赖具体模型实现。而 CC Switch 是在 Agent 外部抽象协议，它不关心 Agent 为何调用，只负责将不同生态间的协议进行转换，让上层应用无感切换模型。"
post: "我每天依赖的ai助手突然失去了能力，而我发现自己其实从来没有理解它"
category: "编程与工具"
tags:
  - "抽象层"
  - "解耦"
  - "设计模式"
status: 待复习
created: 2026-08-10
---
