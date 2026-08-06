import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";

const workerUrl = new URL("../cms-oauth-worker/src/index.js", import.meta.url);

async function loadWorker() {
	try {
		await access(workerUrl);
	} catch {
		assert.fail("OAuth Worker module is missing");
	}
	return import(workerUrl);
}

const env = {
	ALLOWED_ORIGIN: "https://james-826.github.io",
	GITHUB_CLIENT_ID: "client-id",
	GITHUB_CLIENT_SECRET: "client-secret",
};

test("auth redirects to GitHub and stores state", async () => {
	const { handleRequest } = await loadWorker();
	const response = await handleRequest(
		new Request("https://oauth.example.workers.dev/auth"),
		env,
		{ randomUUID: () => "state-123", fetch: globalThis.fetch },
	);
	const location = new URL(response.headers.get("location"));

	assert.equal(response.status, 302);
	assert.equal(location.href.includes("github.com/login/oauth/authorize"), true);
	assert.equal(location.searchParams.get("client_id"), "client-id");
	assert.equal(
		location.searchParams.get("redirect_uri"),
		"https://oauth.example.workers.dev/callback",
	);
	assert.equal(location.searchParams.get("scope"), "public_repo");
	assert.equal(location.searchParams.get("state"), "state-123");
	assert.match(
		response.headers.get("set-cookie"),
		/oauth_state=state-123.*HttpOnly; Secure; SameSite=Lax/,
	);
});

test("callback rejects mismatched state without contacting GitHub", async () => {
	const { handleRequest } = await loadWorker();
	let called = false;
	const response = await handleRequest(
		new Request(
			"https://oauth.example.workers.dev/callback?code=abc&state=wrong",
			{ headers: { cookie: "oauth_state=expected" } },
		),
		env,
		{
			randomUUID: crypto.randomUUID,
			fetch: async () => {
				called = true;
			},
		},
	);

	assert.equal(response.status, 400);
	assert.equal(called, false);
});

test("callback exchanges code and returns Decap handshake", async () => {
	const { handleRequest } = await loadWorker();
	let exchange;
	const response = await handleRequest(
		new Request(
			"https://oauth.example.workers.dev/callback?code=abc&state=state-123",
			{ headers: { cookie: "oauth_state=state-123" } },
		),
		env,
		{
			randomUUID: crypto.randomUUID,
			fetch: async (url, init) => {
				exchange = { url, body: JSON.parse(init.body) };
				return Response.json({ access_token: "github-token" });
			},
		},
	);
	const html = await response.text();

	assert.equal(response.status, 200);
	assert.equal(exchange.url, "https://github.com/login/oauth/access_token");
	assert.deepEqual(exchange.body, {
		client_id: "client-id",
		client_secret: "client-secret",
		code: "abc",
		redirect_uri: "https://oauth.example.workers.dev/callback",
	});
	assert.match(html, /authorizing:github/);
	assert.match(html, /authorization:github:success/);
	assert.match(html, /github-token/);
	assert.match(html, /https:\/\/james-826\.github\.io/);
	assert.doesNotMatch(html, /client-secret/);
	assert.match(response.headers.get("set-cookie"), /Max-Age=0/);
});

test("unknown Worker routes return 404", async () => {
	const { handleRequest } = await loadWorker();
	const response = await handleRequest(
		new Request("https://oauth.example.workers.dev/unknown"),
		env,
		{ randomUUID: crypto.randomUUID, fetch: globalThis.fetch },
	);

	assert.equal(response.status, 404);
});
