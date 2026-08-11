---
question: "word-based、character-based、subword三种分词方式各自的核心缺陷是什么？"
answer: "word-based：词表太大（英语50万+）、生词打成[UNK]丢失信息、不同词间无语义关系；character-based：词表极小但单字符无语义、序列超长算力翻倍；subword（BPE/WordPiece）：折中方案，常用词整体保留，生僻长词拆成有意义碎片，词表约3万。"
post: "分词器-tokenizer-与-transformer从文字到下一个-token-的全链路"
category: "AI 与机器学习"
tags:
  - "分词器"
  - "分词方式"
  - "对比"
status: 待复习
created: 2026-08-10
---
