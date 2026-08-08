---
title: 从本地 commit 推送到 CMS 后台发布：我给自己博客做了次升级
published: 2026-08-09
updated: 2026-08-09
description: ""
image: ""
tags:
  - Decap CMS
category: 学习笔记
repo: ""
draft: false
lang: zh_CN
---


## 一、0 成本上线：把博客放到 GitHub Pages

刚开始写博客，我从 Astro 找到一套模板，创建仓库推到 GitHub，把仓库名改成 `<你的用户名>.github.io`，GitHub 就会自动把它作为**静态网站**托管到 Pages（免费服务器）——0 成本上线。

> 💡 每个项目都能这样吗？
> **静态项目可以**（构建出来的是一堆 HTML 文件，托管就行）；**动态项目不行**（比如带登录、购物车这种要服务器实时计算的，需要真服务器）。我的博客是静态的，所以能白嫖。

## 二、旧方式：本地写文章，手动 push

内容得在本地写，还要符合 Astro 的 frontmatter 格式（title、分类、标签、日期），Astro 自动读取并**渲染**成网页（渲染 = 把内容转换成浏览器能展示的 HTML，构建 build 也是这个意思）。

然后手动 `git commit` + `git push`，GitHub Actions 自动构建部署，文章上线。

**痛点**：每次发文章都要开终端敲命令、格式一个都不能错，麻烦。

## 三、新方式：Decap CMS 网页后台

接上 **Decap CMS**（开源内容后台），部署后打开 `/admin` 就能在浏览器里编辑文章、点"发布"。

点发布 = Decap 把内容自动写成 md 文件，**提交到仓库**（相当于替你 commit + push）。后面的 Actions 自动构建、上线照旧——你只是把"push"这一步交给了后台。

## 四、后台凭什么能提交？OAuth + Worker + 两个凭证

OAuth 是**开放授权协议**（微信扫码登录、Google 登录也是它）：GitHub 确认"是你本人"（授权页点一下），授权关系记在 GitHub，发给你**令牌 token**。

但换 token 还需要一个**应用密钥 client_secret**——绝不能放浏览器（任何人按 F12 都能看到），所以存在 **Cloudflare Workers**（跑在云端的极小服务，代码不公开）。

**我学到的两个凭证的分工：**

| | token | client_secret |
|---|---|---|
| 存在哪 | 浏览器（Decap 用它干活） | Worker 云端 |
| 有效期 | 短（几小时） | 长期 |
| 泄露后果 | 可控 | 灾难 |
| 类比 | 酒店房卡（丢了换一张） | 身份证 / 万能卡（丢了全完） |

**我的思考**：我一开始以为"token 太重要所以存云端"，后来才明白——存云端的是密钥，**token 恰恰就在浏览器里**，因为它短命、可撤销、权限小，丢了不慌。**根源（密钥）藏云端，够用的（token）给浏览器**，这就是分层设计。

发布流程：Decap 拿临时凭证调 Worker 接口 → Worker 在自己服务器内部用密钥去 GitHub 换 token（**密钥从头到尾不出现在浏览器**）→ HTTPS 加密返回 token → Decap 拿 token 调 GitHub API 提交。

> 🤔 **commit 是谁做的？** 是 Decap（浏览器里的后台）——它拿 token 调 GitHub API 写文件。Worker 只负责"身份交换"（换令牌），不写仓库。

## 五、我的其他"原来如此"

- **"部署 = 运行到服务器"是错的**：静态站是构建好的 HTML 文件"晾"在 Pages 上，**没有程序在跑**。构建（Node.js 在临时机器上把文章变成 HTML）和托管（文件柜发文件）是两回事。
- **服务器怎么验证 token 是对的？** 两种方式：GitHub 这种 OAuth token 是**查表**（服务器存着 token ↔ 授权关系的登记簿，收到就查，像酒店前台查登记簿）；**JWT** 是**验签**（token 自带信息 + 签名，服务器用算法验签，篡改会失败，像盖了章的通行证）。
- **Node.js 不是语言**：JavaScript 才是语言，Node.js 是让 JS 能在电脑上跑的"运行时环境"（厨师 vs 菜谱）。npm 是它自带的包管理器，≈ Python 的 uv / pip。

## 六、npm 是啥？顺便说清"构建 - 部署"

npm 是 Node.js 的**包管理器**，和 Python 的 uv / pip 是同类工具：负责下载项目依赖、运行脚本。

| 工具 | 属于 | 干什么 |
|------|------|--------|
| npm | Node.js（Astro 用它） | 下载依赖、跑 `npm run build` |
| uv / pip | Python | 下载依赖、跑脚本 |
| cargo | Rust | 下载依赖、构建 |

三个关键概念：

- **构建（build）**：`npm run build` 把文章 + 模板翻译成 HTML 文件（一次性动作）
- **部署（deploy）**：把构建好的 HTML 文件**上传到 GitHub Pages 托管**——不是"运行"！静态站没有程序在跑，文件晾在 Pages 上，读者访问时直接发文件
- **GitHub Actions**：云端自动流水线——每次 push 自动帮你完成"构建 + 部署"，你只管写内容

## 七、小结

从"本地写 + 敲 3 行 git"到"浏览器后台点发布"，我做的一件事是**把 push 交给更顺手的工具**。而真正让我惊喜的是：为了搞懂"后台凭什么能提交"，我被迫搞懂了 OAuth、token、密钥分层、静态站原理——**装个后台，顺便把 Web 基础补了**。
