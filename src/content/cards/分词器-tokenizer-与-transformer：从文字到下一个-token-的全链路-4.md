---
question: "解码器模型如何预测下一个 token 并防止作弊？"
answer: "取序列最后一个位置输出的向量，过 Linear + Softmax 在词表上打分，概率最大者为下一个 token，拼回序列循环。生成时对“未来位置”打 Mask 掩码设为负无穷，使权重为 0，确保不能看见后续词。"
post: "分词器-tokenizer-与-transformer：从文字到下一个-token-的全链路"
category: "AI 与机器学习"
tags:
  - "自回归"
  - "Mask"
  - "生成"
status: 待复习
created: 2026-08-10
---
