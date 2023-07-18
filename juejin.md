# big-react 学习体会

## 前言

利益相关，学习完 big-react，写一篇心得体会，可以返现书钱，所以我来了。

## 为什么要学习 big-react

其实很简单，就是想了解 react 到底是怎么跑的。
比如为什么 hooks 有那些使用上的限制，如果我自己实现一遍，肯定也就明白为啥了。

此外，选择 react 来学习，是因为 react 是一个运行时框架，唯一的编译操作也由 Babel 帮助我们完成。
所以，不用像学习 vue 一样了解编译方面的知识。

## 学习完 11 节 react 长啥样

支持单节点的首次渲染和后续更新的流程，支持函数组件和第一个 hook useState，以及事件系统。
所以，你完全可以使用自己的 React 来实现一个计数器了。

```tsx
import { useState } from "react"
import ReactDOM from "react-dom/client"

function Child() {
  const [num, setNum] = useState(1)
  return num > 3 ? (
    <span>hello big-react</span>
  ) : (
    <div onClick={() => setNum(num + 1)}>{num}</div>
  )
}

function App() {
  return <Child />
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <App />,
)
```

## 学习过程中自己的方式

1. 前两节来说，相对比较独立，难度也不大，自己按照视频按部就班学习，跟着敲代码，然后记笔记即可。
2. 第三到六节，介绍了 react 在首屏渲染的整个过程，包含 render 和 commit 的全部。
   所以，这个过程中引入很多名词，同时也是搭出整个架子的过程。
   （相比较而言，后面就只是在这个架子里面填东西而已）
   较不熟悉的我，在首次学习的时候，基本是蒙的，只是跟着敲代码也需要来回回放。
   因此，我推荐在这部分先跟着写就好，等到在第六节在浏览器中看到我们渲染出的内容后，
   将这几集的内容连着回顾一遍，弄清楚每个概念和写法。
3. 第七节，先是补充支持 FC 的首屏渲染，然后使用 vite 来调试项目，难度不大。
4. 第八节是实现第一个 hook useState，绝对的重点。
   这里也解答了我之前对于 hooks 的许多迷惑，以前是不知道它如何就神奇的就实现了。
5. 第九节是为了项目增加测试，属于单独的章节，这里会根据测试补充 jsx 转换相关的实现。
6. 第十节和十一节就按照此前的搭建的框架，对接对应的阶段即可。
   只是对于事件系统，我们需要自己模拟实现事件冒泡的流程。

## 一点评价

1. 整体来说，学习的体验非常好，关注点分离，不会有太多干扰
2. 学习的不仅仅是 react，还包括了实现一个开源项目的相关知识
   - monorepo 的组织
   - rollup 打包工具及其插件的使用
   - 多种测试方式的使用
3. 交流群里，作者也会经常出现解答问题，根据大家的反馈调整课程
