---
title: 快速开始
slug: /quickStart
order: 2
---

本节主要从主应用视角出发，通过 [Garfish API](/api) 的加载方式概览性描述主应用如何接入微前端子应用，

通过 Garfish API 接入子应用整体流程概述为：

1. 添加 `garfish` 依赖包（字节内部研发请使用 `@byted/garfish` 代替 `garfish`）
2. 通过 `Garfish.run`，提供挂载点、basename、子应用列表

## 主应用

### 安装依赖

```bash npm2yarn
npm install garfish --save
```

### 注册子应用并启动 Garfish

```js
// index.js（主应用入口处）
import Garfish from 'garfish';

// 当执行 `Garfish.run` 后，此时 `Garfish` 框架将会启动路由劫持能力
// 当浏览器的地址发生变化时，`Garfish` 框架内部便会立即触发匹配逻辑当应用符合匹配逻辑时将会自动将应用挂载至页面中
// 并依次触发子应用加载、渲染过程中的生命周期
// 跳转至: /react 时，自动挂载 react 应用
// 跳转至: /vue 时，自动挂载 vue 应用
Garfish.run({
  basename: '/',
  domGetter: '#subApp',
  apps: [
    {
      // 每个应用的 name 需要保持唯一
      name: 'react',
      // 可为函数，当函数返回值为 true 时，标识满足激活条件，该应用将会自动挂载至页面中，手动挂在时可不填写该参数
      activeWhen: '/react',
      // 子应用的入口地址，可以为 HTML 地址和 JS 地址
      // 注意：entry 地址不可以与主应用+子应用激活地址相同，否则刷新时将会直接返回子应用内容
      entry: 'http://localhost:3000',
    },
    {
      name: 'vue',
      activeWhen: '/vue',
      entry: 'http://localhost:8080',
    },
  ],
});
```

## 子应用

### 安装依赖

```bash npm2yarn
npm install @garfish/bridge --save
```

### 调整子应用的构建配置

<Tabs>
  <TabItem value="Webpack" label="Webpack" default>

```js
module.exports = {
  output: {
    // 需要配置成 umd 规范
    libraryTarget: 'umd',
    // 修改不规范的代码格式，避免逃逸沙箱
    globalObject: 'window',
    // 请求确保每个子应用该值都不相同，否则可能出现 webpack chunk 互相影响的可能
    // webpack 5 使用 chunkLoadingGlobal 代替，若不填 webpack 5 将会直接使用 package.json name 作为唯一值，请确保应用间的 name 各不相同
    jsonpFunction: 'vue-app-jsonpFunction',
    // 保证子应用的资源路径变为绝对路径，避免子应用的相对资源在变为主应用上的相对资源，因为子应用和主应用在同一个文档流，相对路径是相对于主应用而言的
    publicPath: 'http://localhost:8000',
  },
  devServer: {
    // 保证在开发模式下应用端口不一样
    port: '8000',
    headers: {
      // 保证子应用的资源支持跨域，在上线后需要保证子应用的资源在主应用的环境中加载不会存在跨域问题（**也需要限制范围注意安全问题**）
      'Access-Control-Allow-Origin': '*',
    },
  },
};
```

  </TabItem>
  <TabItem value="vite" label="Vite" default>

```js
// 使用 Vite 应用作为子应用时（未使用 @garfish/es-module 插件）需要注意：
// 1. 需要将子应用沙箱关闭 Garfish.run({ apps: [{ ..., sandbox: false }] })
// 2. 子应用的副作用将会发生逃逸，在子应用卸载后需要将对应全局的副作用清除
export default defineConfig({
  // 提供资源绝对路径，端口可自定义
  base: 'http://localhost:3000/',
  server: {
    port: 3000,
    cors: true,
    // 提供资源绝对路径，端口可自定义
    origin: 'http://localhost:3000',
  },
});
```

  </TabItem>
</Tabs>

### 通过导出子应用生命周期

<Tabs groupId="framework">
  <TabItem value="React" label="React" default>

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { reactBridge } from '@garfish/bridge';
import { BrowserRouter, Switch, Route, Link } from 'react-router-dom';

function App({ basename, dom, appName, props }) {
  return (
    <BrowserRouter basename={basename}>
      <Link to="/">Home</Link>
      <Switch>
        <Route exact path="/">
          <HelloGarfish />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export const provider = reactBridge({
  // required
  React,
  // required
  ReactDOM,
  // 非必填。若指定el选项，请保证 el节点存在于当前 document 对象中
  // 注意: el 节点是针对入口模式为 HTML 模式的。在 JS 入口模式下是不存在 el 概念的，在此模式下可以不用传 el
  el: '#root',
  // 根组件
  rootComponent: App,
  // 返回一个 promise, 可在 mounting 前执行异步操作
  loadRootComponent: ({ basename, dom, appName, props }) => {
    return Promise.resolve(App);
  },
});
```

  </TabItem>
  <TabItem value="Vue" label="Vue">

```jsx
import Vue from 'vue';
import App from './App.vue';
import { vueBridge } from '@garfish/bridge';

function newRouter(basename) {
  const router = new VueRouter({
    mode: 'history',
    base: basename,
    router,
    routes: [{ path: '/', component: HelloGarfish }],
  });
  return router;
}

export const provider = vueBridge({
  // required
  Vue,
  // 根组件
  rootComponent: App,

  // 返回一个 promise, 可在 mounting 前执行异步操作
  loadRootComponent: ({ basename, dom, appName, props }) => {
    return Promise.resolve(App);
  },

  appOptions: ({ basename, dom, appName, props }) => ({
    // 若指定el选项，请保证 el节点存在于当前 document 对象中
    el: '#app',
    router: newRouter(basename),
  }),

  handleInstance: (vueInstance, { basename }) => {
    // received vueInstance, do something
  },
});
```

  </TabItem>
  <TabItem value="Vue3" label="Vue3">

```jsx
import { h, createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import { vueBridge } from '@garfish/bridge';

export const provider = vueBridge({
  // required
  createApp,
  // 根组件
  rootComponent: App,

  // 返回一个 promise, 可在 mounting 前执行异步操作
  loadRootComponent: ({ basename, dom, appName, props }) => {
    return Promise.resolve(App);
  },

  appOptions: ({ basename, dom, appName, props }) => ({
    // 若指定el选项，请保证el节点存在于当前document对象中
    el: '#app',
    render: () => h(App),
  }),

  // received vueInstance, do something
  handleInstance: (vueInstance, { basename }) => {
    const routes = [
      { path: '/index', component: Index },
      { path: '/home', component: Home },
    ];
    const router = createRouter({
      history: createWebHistory(basename),
      base: basename,
      routes,
    });
    vueInstance.use(router);
    vueInstance.provide(stateSymbol, createState());
  },
});
```

  </TabItem>
  <TabItem value="custom" label="custom" default>

```jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, Switch, Route, Link } from 'react-router-dom';

function App({ basename }) {
  return (
    <BrowserRouter basename={basename}>
      <Link to="/">Home</Link>
      <Switch>
        <Route exact path="/">
          <HelloGarfish />
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export const provider = () => ({
  render: ({ dom, basename }) => {
    // 和子应用独立运行时一样，将子应用渲染至对应的容器节点，根据不同的框架使用不同的渲染方式
    ReactDOM.render(
      <React.StrictMode>
        <App basename={basename} />
      </React.StrictMode>,
      // 需要注意的一点是，子应用的入口是否为 HTML 类型（即在主应用的中配置子应用的 entry 地址为子应用的 html 地址），
      // 如果为 HTML 类型，需要在 dom 的基础上选中子应用的渲染节点
      // 如果为 JS 类型，则直接将 dom 作为渲染节点即可
      dom.querySelector('#root'),
    );
  },

  destroy: ({ dom, basename }) => {
    // 使用框架提供的销毁函数销毁整个应用，已达到销毁框架中可能存在得副作用，并触发应用中的一些组件销毁函数
    // 需要注意的时一定要保证对应框架得销毁函数使用正确，否则可能导致子应用未正常卸载影响其他子应用
    ReactDOM.unmountComponentAtNode(
      dom ? dom.querySelector('#root') : document.querySelector('#root'),
    );
  },
});
```

  </TabItem>
</Tabs>

## 总结

使用 Garfish API 搭建一套微前端主子应用的主要成本来自两方面

- 主应用的搭建
  - 注册子应用的基本信息
  - 使用 Garfish 在主应用上调度管理子应用
- 子应用的改造
  - 增加对应的构建配置
  - 使用 `@garfish/bridge` 包提供的函数包装子应用后返回 `provider` 函数并导出
  - 子应用针对不同的框架类型，添加不同 `basename` 的设置方式
    - React 在根组件中获取 `basename` 将其传递至 `BrowserRouter` 的 `basename` 属性中
    - Vue 将 `basename` 传递至 `VueRouter` 的 `basename` 属性中
