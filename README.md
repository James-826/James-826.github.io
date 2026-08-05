# James 的博客

基于 [Fuwari](https://github.com/saicaca/fuwari) 的个人博客，用于整理项目和每天的学习笔记。

## 本地运行

```sh
pnpm install
pnpm dev
```

打开 `http://localhost:4321` 即可预览。

## 写新文章

在 `src/content/posts/` 下新建一个 `.md` 文件，例如：

```md
---
title: "文章标题"
published: 2026-08-05
description: "文章简介"
tags: ["标签"]
category: "项目"
status: "进行中" # 项目文章可选：已完成 / 进行中 / 已放弃 / 计划中
repo: "https://github.com/James-826/仓库名" # 可选，项目文章填仓库地址
---

正文内容，支持 Markdown。
```

分类建议：`项目`、`学习笔记`、`博客`。

写项目文章时，把 `category` 设为 `项目`，项目页会自动把文章显示成项目卡片。

## 换背景图和头像

背景图：替换 `src/assets/images/banner.png`，或在 `src/config.ts` 中修改
`siteConfig.banner.src`（支持改成 `/public` 下的图片路径）和
`siteConfig.banner.position`（`top` / `center` / `bottom`）。

头像：替换 `src/assets/images/avatar.png`，或在 `src/config.ts` 中修改
`profileConfig.avatar`。

改完图片后运行 `pnpm dev` 预览，确认没问题再推送。

## 部署到 GitHub Pages

1. 把代码推送到仓库 `James-826.github.io`（或把本仓库改名为这个）。
2. 第一次部署时，在仓库 `Settings → Pages` 中把 Source 设为 `GitHub Actions`。
3. 之后每次推送到 `main` 或 `master` 分支，`.github/workflows/deploy.yml`
   都会自动构建并部署。

网站地址：`https://james-826.github.io/`

GitHub Pages 免费，不需要自己买服务器。
