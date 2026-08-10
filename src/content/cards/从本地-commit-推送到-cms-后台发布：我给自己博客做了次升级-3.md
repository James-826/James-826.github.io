---
question: "OAuth中token与client_secret的存储位置和分工有何不同？"
answer: "token存在浏览器（短有效期，权限小，泄露可控），client_secret存在Cloudflare Workers云端（长期有效，泄露灾难）。密钥负责换token，token用于实际操作。"
post: "从本地-commit-推送到-cms-后台发布：我给自己博客做了次升级"
category: "编程与工具"
tags:
  - "OAuth"
  - "token"
  - "client_secret"
  - "Cloudflare Workers"
status: 待复习
created: 2026-08-10
---
