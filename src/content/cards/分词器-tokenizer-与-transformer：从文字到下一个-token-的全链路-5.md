---
question: "原始分数z为什么这么大？不除以√d会导致什么后果？"
answer: "Q和K都是d维向量（如d=64），点积z是64个数相加，标准差≈√d=8，z常落在±24量级。不除以√d，Softmax饱和（某项趋近1、其他趋近0），梯度pᵢ(1−pᵢ)趋近0导致梯度消失，模型学不动。除以√d把方差拉回1，梯度正常回传。"
post: "分词器-tokenizer-与-transformer：从文字到下一个-token-的全链路"
category: "AI 与机器学习"
tags:
  - "Transformer"
  - "自注意力"
  - "缩放"
  - "梯度消失"
status: 待复习
created: 2026-08-10
---
