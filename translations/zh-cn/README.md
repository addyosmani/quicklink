<p align="center">
  <img src="https://raw.githubusercontent.com/GoogleChromeLabs/quicklink/HEAD/assets/images/logos/banner-white-bg.png" alt="" width="640">
  <br>
  <a href="https://www.npmjs.com/package/quicklink">
    <img src="https://img.shields.io/npm/v/quicklink?style=flat&logo=npm&logoColor=fff" alt="npm">
  </a>
  <a href="https://unpkg.com/quicklink">
    <img src="https://img.shields.io/bundlephobia/minzip/quicklink" alt="gzip size">
  </a>
  <a href="https://github.com/GoogleChromeLabs/quicklink/actions/workflows/ci.yml?query=workflow%3ACI+branch%3Amain">
    <img src="https://img.shields.io/github/actions/workflow/status/GoogleChromeLabs/quicklink/ci.yml?branch=main&label=ci&logo=github" alt="ci">
  </a>
</p>

# quicklink

> 可以在空闲时间预获取页面可视区域（以下简称视区）内的链接，加快后续加载速度。

## 工作原理

Quicklink 通过以下方式加快后续页面的加载速度：

- **检测视区中的链接**（使用 [Intersection Observer](https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API)）。
- **等待浏览器空闲**（使用 [requestIdleCallback](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback)）。
- **确认用户并未处于慢速连接**（使用 `navigator.connection.effectiveType`）或启用省流模式（使用 `navigator.connection.saveData`）。
- **预获取视区内的 URL**（使用 [`<link rel=prefetch>`](https://www.w3.org/TR/resource-hints/#prefetch) 或 XHR）。可根据请求优先级进行控制（若支持 fetch() 可进行切换）。

## 开发原因

该项目旨在为网站提供一套解决方案，预获取处于用户视区中的链接，同时保持极小的体积（**minify/gzip 后 <1KB**）。

## 安装方法

[node](http://nodejs.org) 或 [npm](https://npmjs.com) 用户:

```sh
npm install --save quicklink
```

或者从 [unpkg.com/quicklink](https://unpkg.com/quicklink) 获取 `quicklink`。

## 用法

初始化后，`quicklink` 将自动在闲时预获取视区内的链接 URL。

快速上手：

```html
<!-- 从 dist 目录下引入 quicklink -->
<script src="dist/quicklink.js"></script>
<!-- 初始化（你可以随时进行） -->
<script>
  quicklink();
</script>
```

举个例子，你可以在 `load` 方法触发之后进行初始化：

```html
<script>
  window.addEventListener('load', () => {
    quicklink();
  });
</script>
```

或者导入 ES 模块：

```js
import quicklink from "dist/quicklink.mjs";
quicklink();
```

以上方法适用于多页网站。单页应用可以搭配 router 使用 quicklink：

- 进入新路由地址后，调用 `quicklink()`。
- 针对特定 DOM 元素/组件调用 `quicklink()`。
- 调用 `quicklink({urls：[...]})`，传入自定义 URL 集合进行预获取。

## API

`quicklink` 接受带有以下参数的 option 对象（可选）：

- `el`：指定需要预获取的 DOM 元素视区。
- `urls`：预获取的静态 URL 数组（若此参数非空，则不会检测视区中 `document` 或 DOM 元素的链接）。
- `timeout`：整型数，为 requestIdleCallback 设置超时。浏览器必须在此之前进行预获取（以毫秒为单位）， 默认取 2 秒。
- `timeoutFn`：指定超时处理函数。默认为 requestIdleCallback。也可以替换为 [networkIdleCallback](https://github.com/pastelsky/network-idle-callback)（详见 demo）等自定义函数。
- `priority`：布尔值，指定 fetch 的优先级。默认为 `false`。若配置为 `true` 将会尝试使用 `fetch()` API（而非 rel=prefetch）。
- `origins`: 静态字符串数组，包含允许进行预获取操作的 URL 主机名。默认为同域请求源，可阻止跨域请求。
- `ignores`: RegExp（正则表达式），Function（函数）或者 Array（数组），用于进一步确定某 URL 是否可被预获取。会在匹配请求源之后执行。

待探索：

- 支持资源扩展名检测及使用 [rel=preload](https://w3c.github.io/preload/) 获取高优资源。
- 使用 [Priority Hints](https://github.com/WICG/priority-hints) 进行重要性提示。

## Polyfills

`quicklink`:

- [requestIdleCallback](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestIdleCallback) 的一个非常小的回退。
- 需要支持 `IntersectionObserver` （请参阅 [CanIUse](https://caniuse.com/#feat=intersectionobserver)）。我们推荐使用 Polyfill.io 等服务选择性地实现此功能：

```html
<script src="https://polyfill.io/v2/polyfill.min.js?features=IntersectionObserver"></script>
```

或者，请参见 [Intersection Observer polyfill](https://github.com/GoogleChromeLabs/intersection-observer)。

## 方法

### 为预获取操作自定义超时时间

默认超时时间为 2 秒（通过 `requestIdleCallback`），这里我们重写为 4 秒：

```js
quicklink({
  timeout: 4000,
});
```

### 设置用于检测链接的 DOM 元素

默认值为 `document`。

```js
const elem = document.getElementById('carousel');
quicklink({
  el: elem,
});
```

### 自定义预获取 URL 数组

如果你想指定用于预获取的静态 URL 列表，而不是视区内的链接，你可以使用自定义 URL。

```js
quicklink({
  urls: ['2.html', '3.html', '4.js'],
});
```

### 为预获取设置请求优先级

默认为低优先级（`rel=prefetch` 或 XHR）。对于高优先级（`priority: true`）的操作，尝试使用 `fetch()` 或退阶使用 XHR。

```js
quicklink({ priority: true });
```

### 自定义受允许请求源列表

指定可被预获取的主机名列表，默认情况下仅允许同源主机名。

> **划重点**：你还得加上自己的主机名！

```js
quicklink({
  origins: [
    // 添加我自己的
    'my-website.com',
    'api.my-website.com',
    // 添加第三方的
    'other-website.com',
    'example.com',
    // ...
  ],
});
```

### 允许所有源

允许所有跨域请求。

> **注意**：可能会导致 [CORB](https://chromium.googlesource.com/chromium/src/+/main/services/network/cross_origin_read_blocking_explainer.md) 以及 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) 问题！

```js
quicklink({
  origins: true,
  // 或者
  origins: [],
});
```

### 自定义忽略模式

以下过滤器会在匹配 `origin` 之后执行。Ignores 在避免大型文件下载或 DOM 属性动态响应时十分有用！

```js
// 默认启用同源限制。
//
// 这个示例会忽略所有对以下模式的请求：
//  - 所有 "/api/*" 路径名
//  - 所有 ".zip" 扩展名
//  - 所有带有 noprefetch 扩展名的 <a> 标签
//
quicklink({
  ignores: [
    /\/api\/?/,
    uri => uri.includes('.zip'),
    (uri, elem) => elem.hasAttribute('noprefetch'),
  ],
});
```

也许你还想忽略那些包含 URL fragment 的 URL（比如 `index.html#top`），不对它们进行预获取。那么对于在页面中使用了锚点标题，或者在单页应用设置了 URL fragment 的情况，这个功能可以避免对类似的 URL 进行预获取。

使用 `ignores` 来实现：

```js
quicklink({
  ignores: [
    uri => uri.includes('#'),
    // 或者使用正则表达式： /#(.+)/
    // 或者使用元素匹配: (uri, elem) => !!elem.hash
  ],
});
```

## 浏览器支持

quicklink 提供的预获取是[渐进增强](https://www.smashingmagazine.com/2009/04/progressive-enhancement-what-it-is-and-how-to-use-it/)的，跨浏览器支持如下：

- 不使用 polyfills：Chrome，Firefox，Edge，Opera，Android Browser，Samsung Internet 支持。
- 使用 [Intersection Observer polyfill](https://github.com/GoogleChromeLabs/intersection-observer)（gzipped/minified 后大约 6KB）：Safari，IE9+ 支持。

部分功能支持分层实现：

- 用于检查用户是否处于低速联网状态（通过`navigator.connection.effectiveType`）的 [Network Information API](https://wicg.github.io/netinfo/) 仅适用于 [Chrome 61+ 和 Opera 57+](https://caniuse.com/#feat=netinfo)。

- 如果 `{priority：true}` 和 [fetch()](https://fetch.spec.whatwg.org/) 均不可用，则将使用 XHR。

## 直接使用预获取器

`quicklink` 包含一个预获取器，可以单独导入其他项目中。方法是先将 `quicklink` 作为依赖项安装，然后按如下方式使用：

```html
<script type="module">
  import prefetch from '../src/prefetch.mjs';

  const urls = ['1.html', '2.html'];
  const promises = urls.map(url => prefetch(url));
  Promise.all(promises);
</script>
```

## Demo

这个 [WebPageTest demo](https://www.webpagetest.org/video/view.php?id=181212_4c294265117680f2636676721cc886613fe2eede&data=1) 演示了 quicklink 的预获取功能，它将页面加载性能提高了 4 秒！ [这个 Youtube 视频](https://youtu.be/rQ75YEbJicw) 对使用预获取之前和之后进行了对比。

为了做演示，我们在 Firebase 上部署了一个 [Google Blog](https://blog.google/)，接着部署了另一个在主页添加了 quicklink 的版本，测试从主页导航到一个自动预获取的文章所用时间。结果表明预获取版本加载速度更快。

请注意：这绝不是对这项技术优缺点的详尽测试，只是演示了该方法可能带来的潜在改进。你自己的实现可能不尽相同。

## 相关项目

- 在用 [Gatsby](https://gatsbyjs.org/) 吗？ 现在可以免费下载它了。它使用 `Intersection Observer` 预获取视图中的所有链接，本项目灵感亦来源于此。
- 想要更加数据驱动的方案吗？ 参见 [Guess.js](https://guess-js.github.io/)。它根据用户上网方式，使用数据分析和机器学习来预获取资源。它还有 [Webpack](https://www.npmjs.com/package/guess-webpack) 和 [Gatsby](https://www.gatsbyjs.org/docs/optimize-prefetching-with-guessjs/) 的插件。

## 许可证

本项目已获得 Apache-2.0 许可。
