# 给洗衣粉的惊喜

燕云十六声主题的静态生日站点。`index.html` 是主站入口；Cloudflare 部署前会运行 `build.js`，只把站点文件复制到 `public/`。

## 本地预览

在项目根目录运行：

```bash
node build.js
python -m http.server 8000 --directory public
```

打开：

```text
http://127.0.0.1:8000/
```

不要直接双击 HTML 来测试托管行为；本地 HTTP 更接近 Cloudflare Pages。

## GitHub

仓库：

```text
https://github.com/Francy666666/yanyun
```

主分支：`main`

## Cloudflare Pages 部署

1. 登录 Cloudflare Dashboard。
2. 进入 **Workers & Pages → Create application → Pages → Connect to Git**。
3. 授权 GitHub，选择 `Francy666666/yanyun`。
4. 项目名可以填 `yanyun` 或 `birthday-surprise`。
5. 生产分支选 `main`。
6. 构建设置：

| 设置 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | `node build.js` |
| Build output directory | `public` |
| Root directory | 留空 |

`build.js` 只复制页面、`assets/`、`图片/` 和两条装X视频到 `public/`，不会把 `node_modules/`、`preview/`、原始视频或旧图带进部署包。

7. 点击 **Save and Deploy**。
8. 部署完成后会得到一个 `https://项目名.pages.dev` 地址。

> 注意：如果你在 Cloudflare 里看到的是 **Worker**（日志里出现 `npx wrangler deploy`、`Worker Name`），那不是 Pages，最终网址会是 `*.workers.dev`。请重新在 **Pages → Connect to Git** 创建项目；或者把当前 Worker 的构建命令改成 `node build.js`，部署命令保留 `npx wrangler deploy`。

以后每次 `git push` 到 `main`，Cloudflare Pages 会自动重新部署。

## 自定义域名

Cloudflare Pages 项目 → **Custom domains** → 添加域名。

- 域名已经在 Cloudflare：按提示自动加 DNS；
- 域名不在 Cloudflare：按提示加 CNAME，指向 `项目名.pages.dev`；
- HTTPS 由 Cloudflare 自动签发。

## 注意事项

- Cloudflare Pages 单个文件上限是 **25 MiB**。当前仓库里最大的运行文件是 `视频/装X-正片.mp4`，约 15.9 MB，没问题。
- `视频/3a16d41fdaf6aca3a55a6241bcbd128d_raw.mp4` 约 30.8 MB，已经通过 `.gitignore` 排除，不会上传。
- 不要给运行用的视频启用 Git LFS；Cloudflare Pages 不会自动拉取 LFS 文件。
- `preview/`、`node_modules/`、`.chrome-*` 都不会部署。
- 中文文件名和带空格的文件名已经通过本地 HTTP 验证；Cloudflare 会按 URL 编码正常访问。
- `index.html` 目前是 `motion.html` 的副本，root 可直接打开主站。以后如果改主站外壳，记得同步这两个文件；也可以改成重定向到 `motion.html`。

## 目录

```text
index.html              主站入口（与 motion.html 相同）
motion.html             主站外壳
合照.html               和师父的合照
问签.html               古寺问签
装X.html                装X时刻
内容配置.js             栏目与场景配置
build.js                生成 public/ 部署目录
wrangler.jsonc          Worker 模式下的静态资源目录（public）
assets/                 样式、脚本、Three.js 打包文件
图片/                   场景图、牌面、卡片
视频/                   装X两条视频
```
