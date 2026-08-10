---
question: "分词器的'解码'和Transformer的'解码器'有什么区别？"
answer: "分词器的解码（decode()）是把数字id映射回文字字符串，纯给人看的显示，不参与任何计算。Transformer的解码器（Decoder）是架构模块（如GPT的Decoder-only），内含带Mask的自注意力。两者名字撞了但完全不是一回事。"
post: "分词器-tokenizer-与-transformer：从文字到下一个-token-的全链路"
category: "AI 与机器学习"
tags:
  - "分词器"
  - "Transformer"
  - "解码器"
  - "易错点"
status: 待复习
created: 2026-08-10
---
