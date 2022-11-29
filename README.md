# Babel学习
Babel是一个JS编译器，主要用于将ES6+版本的代码转换为向后兼容的JS语法，以便能在当前和旧版浏览器或其他环境中运行。

作用：
1. 语法转换，将ES6+语法转为ES5。例如：let、const、箭头函数等语法转
2. 通过Polyfill在目标环境中添加缺失的特性，例如Promise、class等特性
3. 源码转换
   

初始化项目
`npm init -y`

安装babel
`npm install --save-dev @babel/core @babel/cli`

配置package.json
```json
  "scripts": {
    "compiler": "babel src --out-dir lib"
  }
```

## 基础工具
`@babel/core`被拆分成三个模块：`@babel/parser`、`@babel/traverse`、`@babel/generator`
`babel`工作原理：`code => AST(@babel/parser) => new AST(@babel/traverse) => new code(@babel/generator)`
即先使用`@babel/parser`将`code`转为`AST`，然后使用配置的插件`@babel/traverse`将`AST`转为`new AST`，最后使用`@babel/generator`根据`new AST`生成`new code`
`@babel/parser`接受源码，进行词法分析、语法分析，生成AST
`@babel/traverse`，接受AST，对其进行遍历，根据preset、plugin进行逻辑处理，替换、删除、添加节点等。
`@babel/generator`接受最终生成的AST，并将其转为代码字符串，同时创建source map
### 例子

```javascript
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const code = `
const fn = (n) => {
  console.log(n*n);
}
`;

const ast = parse(code); //将原code转为AST

// 遍历节点，重新构建ast
traverse(ast, {
  enter(path) {
    if (path.node.name === 'n') {
      path.node.name = 'x';
    }
  },
});

const newCode = generate(ast).code;

console.log(newCode); // const fn = x => {
                      //   console.log(x * x);
                      // };


```

## plugins
babel构建在插件之上，语法转换和polyfill都需要使用插件。
### 语法插件
这类插件只允许babel解析特定类型的语法，可以在AST转换时使用，以支持解析新语法，例如：

```js
import * as babel from "@babel/core";
const code = babel.transformFromAstSync(ast, {
    plugins: ["@babel/plugin-proposal-optional-chaining"],  //转换可选链语法
    babelrc: false
}).code;
```

### 转换插件
这类插件可以转译你的代码。如`@babel/plugin-transform-runtime`
转换类插件会启用相应的语法插件，因此不需要同时指定这两种插件。


## 插件使用
根目录新建`.babelrc`，配置如下：
```json
{
  "plugins": ["@babel/plugin-transform-arrow-functions"]
}
```
`src/index.js`:
```javascript
const fn = (n) => {
  console.log(n*n);
}
```

此时重新编译`npm run compiler`即可将`src/index.js`的箭头函数编译为普通函数。
编译结果：
```JavaScript
"use strict";
var fn = function fn(n) {
  console.log(n * n);
};
```

如果需要其他plugin，一个一个配置会很繁琐，因此可以使用预设preset

## presets
通过使用或创建一个preset即可使用一组插件
- @babel/preset-env
- @babel/preset-flow
- @babel/preset-react
- @babel/preset-typescript

### presets和plugins的执行顺序
如果两个转换插件都将处理“程序（Program）”的某个代码片段，则将根据转换插件或 preset 的排列顺序依次执行。

- 插件在 Presets 前运行;
- 插件顺序从前往后排列;
- Preset 顺序是颠倒的（从后往前）。

例如下面的配置，在处理某个代码片段时，执行顺序为：`@babel/plugin-proposal-class-properties` -> `@babel/plugin-syntax-dynamic-import` -> `@babel/preset-react` -> `@babel/preset-env`
```json
{
    "plugins": [
      "@babel/plugin-proposal-class-properties", "@babel/plugin-syntax-dynamic-import"
    ],
    "presets": [
      "@babel/preset-env",
      "@babel/preset-react"
    ]
}
```

### @babel/preset-env
用于对当前使用的**目标浏览器**中缺失的功能进行代码转换和加载`polyfill`，在不进行任何配置的情况下，`@babel/preset-env`所包含的插件将支持所有最新的JS特性(ES2015+，不包含 stage 阶段)，将其转换成ES5代码。

例如，如果你的代码中使用了可选链(目前，仍在 stage 阶段)，那么只配置`@babel/preset-env`，转换时会抛出错误，需要另外安装相应的插件。

默认情况下，如果你没有在 Babel 配置文件中(如 .babelrc)设置 targets 或 ignoreBrowserslistConfig，@babel/preset-env 会使用 [`browserslist`](https://github.com/browserslist/browserslist) 配置源。

`browserlist`可以在根目录下新建`.browserlistsrc`，

```
> 0.25%
not dead
```
或在`package.json`中添加:
```json
{
  "private": true,
  "dependencies": {
    "autoprefixer": "^6.5.4"
  },
  "browserslist": [
    "> 0.25%",
    "not dead"
  ]
}
```

`@babel/preset-env`可以将高版本的语法转换为低版本的，但是新的内置函数、实例方法（如includes、promise等）无法转换。

例如修改`src/index.js`：
```javascript
const p = new Promise((resolve,reject)=>resolve(100));
const fn = (n) => {
  console.log(n*n);
}
```

配置`.babelrc`，配置如下：
```json
{
  "presets": [
    [
      "@babel/preset-env",
    ]
  ]
}

```
`npm run compiler`查看`lib/index.js`为:
```javascript
"use strict";
var p = new Promise(function (resolve, reject) {
  return resolve(100);
});
var fn = function fn(n) {
  console.log(n * n);
};
```
可以看到箭头函数被成功编译为普通函数，但是promise没变，这时就需要polyfill。


## polyfill
官方给出了两种polyfill方案：
- `@babel-polyfill`: 会污染全局，适合在业务项目中使用。（从Babel 7.4.0 开始，`@babel/polyfill`已被弃用，推荐直接使用core-js）
- `@babel-runtime`: 不污染全局，适合在组件或类库项目中使用

以`src/index.js`为例，几种polyfill对比（参考：[babel polyfill常见配置对比](https://juejin.cn/post/6975556168752037919)）：

### @babel/preset-env + core-js@3
安装`core-js@3`:`npm install --save core-js@3`
配置：

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "corejs": 3,  
        "useBuiltIns": "usage"
      }
    ]
  ]
}
```
配置项：
- useBuiltIns：该参数项的取值可以是"usage" 、 "entry" 或 false。如果该项不进行设置，则取默认值false
  - 在我们没有配置该参数项或是取值为false的时候，polyfill会全部引入到最终的代码里
  - 取值为"entry"，需要在代码里手动import "@babel/polyfill"才会引入
  - 取值为"usage"，会自动进行polyfill的引入
- corejs：该参数项的取值可以是2或3，只有useBuiltIns设置为'usage'或'entry'时，才会生效。
  - 没有设置的时候取默认值为2，取默认值或2的时候，Babel转码的时候使用的是core-js@2版本(需要安装)，一些新API只有core-js@3里才有，如数组的flat方法。
  - 设置为3时需要安装并引入core-js@3

`npm run compiler`编译结果：
```javascript
"use strict";

require("core-js/modules/es.object.to-string.js");
require("core-js/modules/es.promise.js");
var p = new Promise(function (resolve, reject) {
  return resolve(100);
});
var fn = function fn(n) {
  console.log(n * n);
};
```

### @babel/preset-env + @babel/runtime-corejs3 + @babel/plugin-transform-runtime
安装：`npm install --save-dev @babel/plugin-transform-runtime` `npm install --save @babel/runtime-corejs3`

`@babel/runtime` 和 `@babel/plugin-transform-runtime` 的关系：`plugin-transform-runtime` 用于编译时转译代码，真正的polyfill在代码运行时从`babel/runtime`里引入，所以`plugin-transform-runtime` 需要安装在开发环境，而`babel/runtime`安装在生产环境。
`@babel/runtime` 和 `@babel/runtime-corejs3`：

`@babel/runtime`包含：helpers、regenerator-runtime。只能处理语法。
`@babel/runtime-corejs3`包含：helpers、regenerator-runtime、core-js@3。引入core-js@3处理api。

配置：
```json
{
    "plugins": [
    [
      "@babel/plugin-transform-runtime",  //避免污染全局，通常在开发工具库时使用
      {
        "corejs": 3, //runtime 设置 false 不转译api。
        "helpers": true, //减少重复代码
        "regenerator": false //是否将polyfill设置为全局
      }
    ]
  ],
  "presets":  [ "@babel/preset-env" ]
}
```

`npm run compiler`编译结果，可以看到polyfill没有污染全局：
```javascript
"use strict";

var _interopRequireDefault = require("@babel/runtime-corejs3/helpers/interopRequireDefault");
var _promise = _interopRequireDefault(require("@babel/runtime-corejs3/core-js-stable/promise"));
var p = new _promise.default(function (resolve, reject) {
  return resolve(100);
});
var fn = function fn(n) {
  console.log(n * n);
};
```


### @babel/preset-env + core-js@3 + @babel/plugin-transform-runtime + @babel/runtime-corejs3
由于plugins比presets先执行，因此如果需要在presets中使用corejs，需要配置plugins的corejs选项为false，否则会执行plugins中的corejs，导致presets中的useBuildIns按需加载没有执行。
配置`plugin-transform-runtime`不使用`corejs`，`preset-env`使用`corejs@3`按需引入：

```json
{
    "plugins": [
        [
            "@babel/plugin-transform-runtime",
            {
                "corejs": false,
                "helpers": true,
                "regenerator": false
            }
        ]
    ],
    "presets": [
        [
            "@babel/preset-env",
            {
                "corejs": 3,
                "useBuiltIns": "usage"
            }
        ]
    ]
}
```



## 参考文章

[Babel 入门教程](https://www.ruanyifeng.com/blog/2016/01/babel.html)
[什么是babel](https://babel.docschina.org/docs/en/)
[不容错过的Babel7知识](https://juejin.cn/post/6844904008679686152)
[babel,babel-core是什么关系？分不清他们的职责？](https://www.zhihu.com/question/277409645)
[Babel polyfill 常见配置对比](https://juejin.cn/post/6975556168752037919)
[深入浅出 Babel 上篇：架构和原理 + 实战](https://juejin.cn/post/6844903956905197576)
[[前端与编译原理——用JS写一个JS解释器](https://segmentfault.com/a/1190000017241258)](https://segmentfault.com/a/1190000017241258)