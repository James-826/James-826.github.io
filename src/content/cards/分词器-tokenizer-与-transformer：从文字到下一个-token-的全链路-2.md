---
question: "分词器映射出的 ids 是否直接包含词义？"
answer: "不包含。词表只是 id 与子词字符串的“门牌号字典”，真正的含义存在于 Embedding 矩阵中。模型吃的是对应行的高维向量，而非字符串或 id 本身，ids 仅作为查表索引。"
post: "分词器-tokenizer-与-transformer：从文字到下一个-token-的全链路"
category: "AI 与机器学习"
tags:
  - "Embedding"
  - "向量"
  - "词表"
status: 待复习
created: 2026-08-10
---
