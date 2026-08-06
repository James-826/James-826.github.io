# 网页 CMS 配置与使用指南

这份指南只需要完整操作一次。配置完成后，日常发文只需打开
[`https://james-826.github.io/admin/`](https://james-826.github.io/admin/)，不再需要在本地创建 Markdown、提交或推送 Git。

发布链路如下：

```text
网页 CMS -> GitHub 仓库 -> GitHub Actions -> GitHub Pages
```

## 费用

这套方案不需要购买域名、服务器或数据库：

- GitHub Pages：个人公开仓库免费。
- GitHub OAuth App：免费。
- Cloudflare Workers：本博客的登录请求量远低于免费额度。
- Decap CMS：开源，由博客静态页面直接加载。

Cloudflare 可能要求验证邮箱，但以下步骤不要求升级付费套餐。

## 开始前检查

确认以下条件：

1. 你能登录拥有 `James-826/James-826.github.io` 写权限的 GitHub 账号。
2. 仓库默认发布分支是 `master`。
3. GitHub 仓库的 `Settings -> Pages -> Source` 已设置为 `GitHub Actions`。
4. 本地终端位于仓库根目录。

先运行项目侧检查：

```sh
pnpm test:cms
pnpm build
```

两个命令都应正常结束。此时 `public/admin/config.yml` 中仍保留
`REPLACE-WITH-YOUR-WORKER` 是正常的；它会在取得 Worker 地址后替换。

## 部署 Cloudflare Worker

### 1. 创建免费账号

打开 [Cloudflare Dashboard](https://dash.cloudflare.com/)，注册或登录免费账号。
本方案使用 Cloudflare 提供的 `workers.dev` 子域，不需要添加自己的域名。

### 2. 登录 Wrangler

在仓库根目录运行：

```sh
pnpm dlx wrangler@4 login
```

浏览器会打开 Cloudflare 授权页。确认授权后回到终端。

### 3. 首次部署并取得地址

```sh
pnpm dlx wrangler@4 deploy --config cms-oauth-worker/wrangler.toml
```

首次使用 Workers 时，Cloudflare 可能会让你选择一个免费的 `workers.dev`
子域。部署成功后终端会显示类似地址：

```text
https://james-blog-cms-oauth.<你的子域>.workers.dev
```

保存这个地址。此时 Worker 尚未配置 GitHub 凭据，访问登录接口会报错是正常的。

## 创建 GitHub OAuth App

### 1. 打开创建页面

登录 GitHub，依次进入：

```text
右上角头像 -> Settings -> Developer settings -> OAuth Apps -> New OAuth App
```

不要选择 GitHub Apps，本项目使用的是 OAuth Apps。

### 2. 填写应用信息

- **Application name**：`James Blog CMS`
- **Homepage URL**：`https://james-826.github.io/admin/`
- **Application description**：可填写 `James 博客文章管理后台`
- **Authorization callback URL**：`https://james-blog-cms-oauth.<你的子域>.workers.dev/callback`

Callback 必须使用上一步的真实 Worker 地址，并以 `/callback` 结尾。不要填写博客的 `/admin/` 地址。

点击 **Register application**。页面会显示 Client ID；再点击
**Generate a new client secret** 生成 Client Secret。Secret 通常只完整显示一次，先不要关闭页面。

### 3. 把凭据存入 Cloudflare

下面的命令会在终端提示你输入值。输入内容不会显示，也不会写入仓库：

```sh
pnpm dlx wrangler@4 secret put GITHUB_CLIENT_ID --config cms-oauth-worker/wrangler.toml
pnpm dlx wrangler@4 secret put GITHUB_CLIENT_SECRET --config cms-oauth-worker/wrangler.toml
```

第一条输入 GitHub 页面上的 Client ID，第二条输入刚生成的 Client Secret。
随后再次部署，确保当前 Worker 代码和配置均为最新版本：

```sh
pnpm dlx wrangler@4 deploy --config cms-oauth-worker/wrangler.toml
```

`GITHUB_CLIENT_SECRET` 只能存在于 Cloudflare Worker Secret 中。不要把它写进
`wrangler.toml`、`config.yml`、`.env`、聊天记录或 Git commit。

## 配置 CMS

打开 [`public/admin/config.yml`](../public/admin/config.yml)，找到：

```yaml
base_url: https://REPLACE-WITH-YOUR-WORKER.workers.dev
```

替换成你的真实 Worker 地址，例如：

```yaml
base_url: https://james-blog-cms-oauth.example.workers.dev
```

这里只填写 origin：不要在末尾添加 `/auth`、`/callback` 或 `/`。
下一行 `auth_endpoint: auth` 保持不变。

运行检查并提交：

```sh
pnpm test:cms
pnpm build
git add public/admin/config.yml
git commit -m "config: connect CMS OAuth Worker"
git push origin master
```

打开仓库的 **Actions** 页面，等待 **Deploy to GitHub Pages** 工作流变成绿色。

### 首次部署验收

1. `wrangler deploy` 输出了真实 `workers.dev` 地址。
2. GitHub OAuth App 的 Callback 与 `https://<Worker 地址>/callback` 完全一致。
3. `public/admin/config.yml` 的 `base_url` 只包含 Worker origin。
4. 打开 `https://<Worker 地址>/unknown` 会看到 `Not found` 和 HTTP 404。
5. GitHub Actions 的 Pages 部署成功。
6. `https://james-826.github.io/admin/` 能显示 CMS 登录页。

## 发布第一篇文章

### 1. 登录

打开 [`https://james-826.github.io/admin/`](https://james-826.github.io/admin/)，点击 GitHub 登录。
浏览器会弹出 GitHub 授权窗口。确认显示的应用名是 `James Blog CMS` 后授权。

OAuth 的 `public_repo` 权限允许 CMS 修改你有写权限的公开仓库。Decap 的配置已固定目标仓库为
`James-826/James-826.github.io`。不要在公共或他人的电脑上保持 CMS 登录状态。

### 2. 新建草稿

1. 进入 **文章** 集合，点击 **新建文章**。
2. 填写标题，并把 URL slug 改成简短的英文或拼音，例如 `astro-cms-setup`。
3. 填写发布时间、摘要、标签、分类和正文。
4. 项目文章可以填写项目状态与 GitHub 仓库地址。
5. 选择封面后，保存路径应以 `/uploads/` 开头。
6. 首次保存时保持 **保存为草稿** 开启。

草稿会提交到仓库，但生产构建不会显示它。你可以在 CMS 中继续修改。

### 3. 正式发布

预览内容并确认无误后，关闭 **保存为草稿**，再次保存。CMS 会直接向 `master`
提交 Markdown 和图片，随后自动触发 GitHub Actions。

打开仓库 **Actions -> Deploy to GitHub Pages** 查看构建进度。部署成功后，文章会出现在博客首页、归档页和对应分类中。

### 编辑和删除

- 编辑：在 **文章** 列表打开文章，修改后保存，每次保存都会形成 Git commit。
- 下线但保留：重新开启 **保存为草稿**，生产站点会隐藏文章。
- 删除：打开文章后选择删除。删除会直接提交到 `master`，操作前确认封面没有被其他文章引用。

CMS 第一版管理 `src/content/posts` 下的顶层 Markdown 文件。现有的
`src/content/posts/post-1/index.md` 是带本地封面的嵌套 page bundle，继续保留，暂时不要用 CMS 编辑或删除它。

## 故障排查

### `redirect_uri_mismatch`

打开 GitHub OAuth App 设置，逐字符比较 Callback 与 Worker 地址：必须是 HTTPS、域名完全一致，并以 `/callback` 结尾。

### 登录返回 401 或 `bad_verification_code`

Client ID 与 Secret 可能不是同一个 OAuth App，或 Secret 已失效。重新生成 Secret，然后运行：

```sh
pnpm dlx wrangler@4 secret put GITHUB_CLIENT_ID --config cms-oauth-worker/wrangler.toml
pnpm dlx wrangler@4 secret put GITHUB_CLIENT_SECRET --config cms-oauth-worker/wrangler.toml
```

### 登录弹窗没有返回 CMS

1. 允许 `james-826.github.io` 打开弹窗。
2. 确认 `wrangler.toml` 中的 `ALLOWED_ORIGIN` 正好是 `https://james-826.github.io`，末尾没有 `/`。
3. 确认 `config.yml` 中的 `base_url` 正好是 Worker origin。
4. 关闭旧弹窗，刷新 `/admin/` 后重新登录。

需要查看 Worker 实时日志时运行：

```sh
pnpm dlx wrangler@4 tail --config cms-oauth-worker/wrangler.toml
```

### 图片显示 404

在 GitHub commit 中确认图片位于 `public/uploads/`，文章 frontmatter 中的 `image`
以 `/uploads/` 开头。图片刚上传时还需要等待 Pages 部署完成。

### frontmatter 校验失败

参考 [`src/content/config.ts`](../src/content/config.ts) 检查：

- `published` 和 `updated` 使用 `YYYY-MM-DD`。
- `draft` 是 `true` 或 `false`，不要加引号。
- `tags` 是 YAML 列表。
- `title` 不能为空。

### GitHub Actions 构建失败

打开失败的 **Deploy to GitHub Pages -> build -> Build** 步骤，查看具体文件和字段。
回到 CMS 修正最后一篇文章并保存，或者在 GitHub 网页上修正最后一次 CMS commit，然后重新运行工作流。
旧的线上版本会保留，不会因为一次构建失败而立即消失。

## 安全检查

在仓库根目录运行：

```sh
git grep -nE 'gh[opsu]_[A-Za-z0-9]{20,}'
rg -n 'client-secret|gh[opsu]_[A-Za-z0-9]{20,}' public dist cms-oauth-worker || true
```

正常情况下不应找到真实 Token 或 Client Secret。测试文件中使用的 `client-secret`
只是固定测试文本，不是真实凭据。

如果真实 Secret 或 Token 曾进入 Git：

1. 立即在 GitHub OAuth App 中撤销 Client Secret 或授权。
2. 生成新 Secret。
3. 用 `wrangler@4 secret put GITHUB_CLIENT_SECRET` 更新 Cloudflare。
4. 检查 Git 历史并处理泄漏记录；仅删除当前文件并不足以撤销已泄漏凭据。

在共享设备使用后，从 CMS 退出登录，并在 GitHub
`Settings -> Applications -> Authorized OAuth Apps` 中检查或撤销授权。
