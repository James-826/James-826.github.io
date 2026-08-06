const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const STATE_COOKIE = "oauth_state";

function requireEnv(env) {
	for (const name of [
		"ALLOWED_ORIGIN",
		"GITHUB_CLIENT_ID",
		"GITHUB_CLIENT_SECRET",
	]) {
		if (!env[name]) {
			throw new Error(`Missing Worker environment variable: ${name}`);
		}
	}
}

function cookieValue(request, name) {
	for (const item of (request.headers.get("cookie") ?? "").split(";")) {
		const [key, ...value] = item.trim().split("=");
		if (key === name) {
			return decodeURIComponent(value.join("="));
		}
	}
	return "";
}

function stateCookie(value, maxAge = 600) {
	return `${STATE_COOKIE}=${encodeURIComponent(value)}; Path=/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function safeJson(value) {
	return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function authorizationPage(status, content, allowedOrigin) {
	const message = `authorization:github:${status}:${JSON.stringify(content)}`;
	return `<!doctype html>
<html lang="en">
	<head><meta charset="utf-8"><title>GitHub authorization</title></head>
	<body>
		<script>
			const allowedOrigin = ${safeJson(allowedOrigin)};
			const result = ${safeJson(message)};
			const receiveMessage = (event) => {
				if (event.origin !== allowedOrigin || event.data !== "authorizing:github") return;
				window.opener.postMessage(result, allowedOrigin);
				window.removeEventListener("message", receiveMessage);
				window.close();
			};
			window.addEventListener("message", receiveMessage);
			window.opener.postMessage("authorizing:github", allowedOrigin);
		</script>
	</body>
</html>`;
}

function htmlResponse(status, content, allowedOrigin, httpStatus) {
	return new Response(authorizationPage(status, content, allowedOrigin), {
		status: httpStatus,
		headers: {
			"cache-control": "no-store",
			"content-security-policy":
				"default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
			"content-type": "text/html; charset=utf-8",
			"set-cookie": stateCookie("", 0),
		},
	});
}

function startAuthorization(url, env, randomUUID) {
	const state = randomUUID();
	const github = new URL(AUTHORIZE_URL);
	github.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
	github.searchParams.set("redirect_uri", `${url.origin}/callback`);
	github.searchParams.set("scope", "public_repo");
	github.searchParams.set("state", state);

	return new Response(null, {
		status: 302,
		headers: {
			"cache-control": "no-store",
			location: github.href,
			"set-cookie": stateCookie(state),
		},
	});
}

async function finishAuthorization(request, url, env, fetchImpl) {
	const state = url.searchParams.get("state") ?? "";
	if (!state || state !== cookieValue(request, STATE_COOKIE)) {
		return new Response("Invalid OAuth state", { status: 400 });
	}

	if (url.searchParams.has("error")) {
		return htmlResponse(
			"error",
			{
				message:
					url.searchParams.get("error_description") ??
					url.searchParams.get("error"),
			},
			env.ALLOWED_ORIGIN,
			401,
		);
	}

	const code = url.searchParams.get("code");
	if (!code) {
		return new Response("Missing OAuth code", { status: 400 });
	}

	const redirectUri = `${url.origin}/callback`;
	const exchange = await fetchImpl(TOKEN_URL, {
		method: "POST",
		headers: {
			accept: "application/json",
			"content-type": "application/json",
			"user-agent": "james-blog-cms-oauth",
		},
		body: JSON.stringify({
			client_id: env.GITHUB_CLIENT_ID,
			client_secret: env.GITHUB_CLIENT_SECRET,
			code,
			redirect_uri: redirectUri,
		}),
	});
	const result = await exchange.json();

	if (!exchange.ok || !result.access_token) {
		return htmlResponse(
			"error",
			{
				message:
					result.error_description ??
					result.error ??
					"GitHub token exchange failed",
			},
			env.ALLOWED_ORIGIN,
			401,
		);
	}

	return htmlResponse(
		"success",
		{ token: result.access_token, provider: "github" },
		env.ALLOWED_ORIGIN,
		200,
	);
}

export async function handleRequest(request, env, dependencies = {}) {
	requireEnv(env);
	const url = new URL(request.url);
	const fetchImpl = dependencies.fetch ?? globalThis.fetch;
	const randomUUID =
		dependencies.randomUUID ?? crypto.randomUUID.bind(crypto);

	if (url.pathname === "/auth") {
		return startAuthorization(url, env, randomUUID);
	}
	if (url.pathname === "/callback") {
		return finishAuthorization(request, url, env, fetchImpl);
	}
	return new Response("Not found", { status: 404 });
}

export default {
	fetch(request, env) {
		return handleRequest(request, env);
	},
};
