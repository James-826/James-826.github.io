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

## 快速发布

本机发布只需两步：

```sh
pnpm new-post 文章名
pnpm push
```

`pnpm new-post` 会在 `src/content/posts/` 生成带 frontmatter 的草稿，
写完后运行 `pnpm push`，它会自动提交并推送，GitHub Actions 随后自动部署。

不想用命令行的话，也可以直接打开 GitHub 仓库
`src/content/posts/` 目录，点 `Add file` 新建文章，写完直接提交，
同样会自动部署。

## 网页 CMS

完成一次免费 OAuth 配置后，可以打开
[`https://james-826.github.io/admin/`](https://james-826.github.io/admin/)
直接创建文章、上传封面并发布，不需要本地运行 Git 命令。

首次配置和日常使用步骤见 [网页 CMS 配置与使用指南](docs/cms-setup.zh-CN.md)。

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
