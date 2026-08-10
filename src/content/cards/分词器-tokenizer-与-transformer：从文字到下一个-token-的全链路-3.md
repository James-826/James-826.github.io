---
question: "自注意力中 Q/K/V 的角色及除以 √d 的原因？"
answer: "Q 负责查询，K 负责匹配标签，V 负责贡献内容。Q·K 计算相关性分数，加权 V 融合上下文。除以 √d 是为了防止点积方差随维度增长导致 Softmax 饱和和梯度消失，确保数值稳定可学习。"
post: "分词器-tokenizer-与-transformer：从文字到下一个-token-的全链路"
category: "AI 与机器学习"
tags:
  - "自注意力"
  - "QKV"
  - "梯度消失"
status: 待复习
created: 2026-08-10
---
