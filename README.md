# 数字破译者 / Digit Detective

无依赖的静态网页游戏。使用 Node.js 18+ 在项目目录运行：

```sh
npx serve dist
```

或 `python -m http.server 8000 --directory dist`，然后在浏览器访问显示的地址。网页需要通过 HTTP 加载以启用模块和 Web Worker。所有进度与成绩保存在当前浏览器的本地存储中。

运行核心规则测试：`node --test tests.mjs`。电脑使用独立 Worker 穷举所有 10,000 个可能猜测，以 minimax 和指定平局规则选出下一步；首次猜测利用对称性固定为 0000。
