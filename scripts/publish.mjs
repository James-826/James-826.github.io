import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

const date = new Date().toISOString().slice(0, 10);

try {
  const status = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  if (status) {
    run("git add -A");
    run(`git commit -m "update: ${date}"`);
  } else {
    console.log("没有需要提交的改动。");
  }
  run("git push origin master");
  console.log("发布完成，GitHub Actions 会自动构建部署。");
} catch (error) {
  console.error(`发布失败：${error.message || error}`);
  process.exit(1);
}
