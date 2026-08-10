---
question: "BPE训练的最小单元到底是什么？"
answer: "BPE的最小单元是单个字符（英文26个字母，中文单字），不是'最小的单词'。BPE从字符出发，一步步往上合并出有意义的子词。'最小单词'的说法只在word-based思路里成立，在BPE这条子词路线上起点是字符。"
post: "分词器-tokenizer-与-transformer：从文字到下一个-token-的全链路"
category: "AI 与机器学习"
tags:
  - "分词器"
  - "BPE"
  - "子词"
status: 待复习
created: 2026-08-10
---
