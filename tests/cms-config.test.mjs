import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "yaml";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("CMS shell and config match the Astro content model", async () => {
	const [html, yaml] = await Promise.all([
		read("public/admin/index.html"),
		read("public/admin/config.yml"),
	]);
	const config = parse(yaml);
	const posts = config.collections.find(({ name }) => name === "posts");
	const fields = Object.fromEntries(posts.fields.map((field) => [field.name, field]));

	assert.match(html, /decap-cms@3\.15\.1\/dist\/decap-cms\.js/);
	assert.deepEqual({ ...config.backend, base_url: "configured" }, {
		name: "github",
		repo: "James-826/James-826.github.io",
		branch: "master",
		base_url: "configured",
		auth_endpoint: "auth",
	});
	assert.match(config.backend.base_url, /^https:\/\/james-blog-cms-oauth\.[a-z0-9]+\.workers\.dev$/);
	assert.equal(config.locale, "zh_Hans");
	assert.equal(config.media_folder, "public/uploads");
	assert.equal(config.public_folder, "/uploads");
	assert.equal(posts.folder, "src/content/posts");
	assert.equal(posts.create, true);
	assert.equal(posts.slug, "{{slug}}");
	assert.deepEqual(Object.keys(fields), [
		"title",
		"published",
		"updated",
		"description",
		"image",
		"tags",
		"category",
		"status",
		"repo",
		"draft",
		"lang",
		"body",
	]);
	assert.equal(fields.draft.default, true);
	assert.equal(fields.published.format, "YYYY-MM-DD");
});

test("CMS documentation covers setup, publishing, and troubleshooting", async () => {
	const [readme, guide] = await Promise.all([
		read("README.md"),
		read("docs/cms-setup.zh-CN.md"),
	]);

	assert.match(readme, /docs\/cms-setup\.zh-CN\.md/);
	for (const heading of [
		"费用",
		"创建 GitHub OAuth App",
		"部署 Cloudflare Worker",
		"配置 CMS",
		"发布第一篇文章",
		"故障排查",
		"安全检查",
	]) {
		assert.match(guide, new RegExp(`## ${heading}`));
	}
	assert.match(guide, /wrangler@4 secret put GITHUB_CLIENT_SECRET/);
	assert.match(guide, /REPLACE-WITH-YOUR-WORKER/);
	assert.doesNotMatch(guide, /gh[opsu]_[A-Za-z0-9]{20,}/);
});

test("Pages deployment retries a transient backend timeout", async () => {
	const workflow = parse(await read(".github/workflows/deploy.yml"));
	const steps = workflow.jobs.deploy.steps;
	const deployments = steps.filter(
		(step) => step.uses === "actions/deploy-pages@v4",
	);

	assert.equal(deployments.length, 2);
	assert.equal(deployments[0]["continue-on-error"], true);
	assert.equal(deployments[0].with.timeout, "1200000");
	assert.equal(deployments[0].with.error_count, "30");
	assert.equal(deployments[1].if, "steps.deployment.outcome == 'failure'");
	assert.match(
		workflow.jobs.deploy.environment.url,
		/steps\.deployment_retry\.outputs\.page_url/,
	);
});
