---
question: "在自注意力计算中，K和V分别起什么作用？"
answer: "Q是'我在找什么'，K是'我身上是什么标签'，V是'我实际贡献的内容'。Q·K只负责匹配（决定谁和谁相关、相关性多高），真正被搬进新向量的是V的内容。准确说法是'Q·K决定权重，×V才把相关上下文融入查询向量'。"
post: "分词器-tokenizer-与-transformer从文字到下一个-token-的全链路"
category: "AI 与机器学习"
tags:
  - "Transformer"
  - "自注意力"
  - "QKV"
status: 待复习
created: 2026-08-10
---
