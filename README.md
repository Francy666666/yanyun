# 给洗衣粉的惊喜

静态网站，主入口为 index.html，motion.html 是同一套主站外壳。所有原有 HTML 名称和打开地址保留。

## 页面归类

| 分类 | 入口 |
| --- | --- |
| 主站 | index.html / motion.html，栏目配置在 内容配置.js |
| 主站栏目 | 合照.html、问签.html、装X.html、第四页.html（许愿天使） |
| 回忆旅程 | 古风长廊.html → 新世界.html |
| 独立实验 | 碧波.html、红绡入梦.html、回忆长廊.html、粒子人像.html、人像粒子.html、烟花测试.html |

## 文件分工

| 目录 | 内容 |
| --- | --- |
| assets/css/ | 页面样式 |
| assets/js/pages/ | 各页面脚本；new-world、corridor、birthday 对应三个主要场景 |
| assets/js/shared/ | 转场、字幕、音乐、渲染质量、可见状态 |
| assets/data/ | 长廊、合照粒子、问签数据 |
| assets/images/ | 运行用蛋糕、蜡烛、石板等素材 |
| assets/vendor/three/ | Three.js 本地库及许可证 |
| 图片/、视频/、音乐/、新动画合集/ | 按媒体种类保留的原有素材 |
| scripts/checks/ | 本次使用的检查脚本 |
| archive/backups/ | 修改前备份与旧版本 |
| archive/originals/ | 未被网页引用的原图 |
| archive/screenshots/ | 历次检查截图 |
| archive/tools/ | 历史辅助脚本 |
| archive/reference/ | 原 preview 参考资料 |
| archive/asset-moves.json | 本次运行资源路径迁移表 |
| public/ | 可重新生成的本地构建输出 |
| node_modules/ | 开发依赖 |

HTML 入口留在根目录以保留旧链接；具体代码按用途分类。archive 不参与构建。完整修改前场景在 archive/backups/before-organization/，仅供恢复代码，不作为当前网页入口。

## 修改与本地预览

修改栏目、文案和合照素材：内容配置.js。修改场景效果：查看 使用说明.md。

运行 npm run check 检查引用和语法；运行 npm run build 生成 public；然后运行 python -m http.server 8000 --directory public 并访问 http://127.0.0.1:8000/ 。保存后 Ctrl+F5 强制刷新。

构建包含全部根目录 HTML、运行素材和音乐，不依赖文件是否已被 Git 跟踪；备份、工具、原始大视频和开发依赖不进入输出。本地构建不会上传或部署。仓库仍为 Francy666666/yanyun，wrangler.jsonc 仍指向 public。

## 新世界性能

流光缓存的六个方向分帧更新，每帧最多计算一个方向，同一轮固定时间与配色。桌面最多 18 组涟漪，触屏最多 12 组，保留水面反射和鼠标环视。隐藏长廊和新世界暂停绘制，音乐状态独立保留。实际流畅度仍受显卡、窗口尺寸和浏览器影响。
