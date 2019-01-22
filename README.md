# webpack-dll-learn
Learn how to use webpack DLL
---

[toc]



Webpack DLL 是Webpack的一个插件，他借鉴了windows平台的DLL思想，利用把部分不常改动的代码预编译成“DLL”，来达到加速项目的编译时间的目的。

>https://webpack.js.org/plugins/dll-plugin/ The DllPlugin and DllReferencePlugin provide means to split bundles in a way that can drastically improve build time performance.



---



根据他的官方文档和网上的例子，看上去还是挺简单的，但是这个却花了我2天时间才搞明白，关键的问题在于：

1）用的比较少，例子都太过简单。

2）网上的例子没有把他的原理介绍清楚。



## 一个简单的项目

源代码在这里：https://github.com/puncha/webpack-dll-learn

好，现在就使用一个简单的例子来说明如何使用Webpack DLL的，最终的目标就是在浏览器页面上打印出：`Hello, PunCha`。为了演示如何使用Webpack DLL，所以我只能硬生生的把他拆成2个项目（用2个子文件夹来模拟）。这是大概的项目结构：



 - `dist`：存放webpack生成的文件，先忽略。

 - `packages\app`：存放app应用的代码。

 - `packages\feature`：存放feature的代码（核心功能）。

 - `index.html`：用来演示如何使用。

 - `index-little-loader.html`：使用little-loader来演示使用方法。



## 看看代码

很简单，feature.js 创建了一个API，app.js去使用这个API。



#### feature.js

```javascript

function greeting(to) {
  return `Hello, ${to}`;
}
module.exports = greeting;

```



#### app.js

```javascript

const greeting = require("../../feature/src/feature");
document.getElementById("root").innerHTML = greeting("PunCha");

```


## 使用Webpack DLL



### DllPlugin：用来生成DLL

首先，需要在feature的webpack.config.js里面使用DllPlugin，额外打包出来一个manifest文件（本身会产生feature.dll.js文件）。**这里要注意的是，`output.library`的值和`DllPlugin.name`的值必须相同，而且最好的是加入哈希值，例如`feature-[hash]`。这个名字也不要起的太随意，因为这个名字会被附加到HTML的`window`对象上去。按我的例子，就是`window.feature`。**

```javascript

const path = require("path");
const webpack = require("webpack");
module.exports = (env, argv) => {
  return {
    entry: [path.resolve(__dirname, "src/feature.js")],
    output: {
      path: path.join(__dirname, "../../dist"),
      filename: "dll.feature.js",
      library: "feature"
    },
    plugins: [
      new webpack.DllPlugin({
        path: path.join(__dirname, "../../dist/feature-manifest.json"),
        name: "feature"
      })
    ]
  };
};

```



生成的`feature-manifest.json`长这样。**这里要注意的是，他是以源代码文件的相对路径作为他的键。这个很重要，和后面路径的设置相关**

```json

{
  "name": "feature",
  "content": {
    "./src/feature.js": { "id": 1, "buildMeta": { "providedExports": true } }
  }
}

```



生成的`feature.dll.js`很长，大部分是webpack本身的代码。你只要关心的是最后几行代码，因为这才是你的代码：

```javascript

  此处省略五千字.........



  function(e, t) {
    e.exports = function(e) {
      return `Hello, ${e}`;
    };
  }

```

先剧透一下，这个DLL是不能拿来直接使用的，也就是说，你不要尝试着去`require`或者`import`他。具体原因我后面会介绍的。



好，这样一个DLL就打包出来了，最终，会生成2个文件到dist文件夹下：

 - dist/feature.dll.js

 - dist/feature-manifest.json





### DllReferencePlugin：用来引用DLL

DLL创建出来了，就要使用它。Webpack使用`DllReferencePlugin`来引用。**这里要注意的是，插件里面的`context`很重要！还记得上面，manifest里面记录的是相对路径，我们又把manifest生成到了dist目录，所以路径其实是被破坏了。插件允许你使用`context`来“纠正”这个错误。所以，context+manifest的相对路径，应该能够还原文件的真实路径。这个一定要填对！**：

```javascript

const path = require("path");
const webpack = require("webpack");
module.exports = (env, argv) => {
  return {
    target: "web",
    entry: path.resolve(__dirname, "src/app.js"),
    output: {
      path: path.resolve(__dirname, "../../dist/"),
      filename: "app.js"
    },
    plugins: [
      new webpack.DllReferencePlugin({
        context: path.resolve(__dirname, "../feature"),
        manifest: require(path.resolve(
          __dirname,
          "../../dist/feature-manifest.json"
        ))
      })
    ]
  };
};

```



那么问题来了，我们在webpack中引用了DLL的manifest，那么按理说，应该在代码里面引用DLL.js文件咯？这样才合理嘛！就因为这个错误的理解，让我白白浪费了好几个小时！因为，你代码里面根本不引用DLL.js，原来代码怎么写，还是怎么写，原来引用哪个，现在还引用哪个JS。我们再来看下，原来app.js里面是通过`require()`来使用feature的：`const greeting = require("../../feature/src/feature");`。他原来加载的是feature.js本身，那么现在还是加载他。很颠覆三观吧？是的！这就得说说webpack DLL的原理了。之前说过，webpack DLL是为了加速代码的编译，那么他是怎么做到的呢？

 - webpack先把部分代码编译成DLL。

 - 之后在引用DLL的项目中，假如webpack发现，你用的JS文件和DLL的manifest里面记录的是同一个，那么就直接跳过，不编译了！而且，被引用的文件的内容也不会被打包到bundle里面去。在我们的例子里，就是feature.js的内容不会被打包到app.js中。



生成的app.js长这样，你可以看到，这里面只包含了app本身的代码，feature.js的代码没有被打包进去（假如，你把feature.js的webpack.config.js中的context去掉，或者故意改错，你会发现，feature.js的内容是会被打包进app.js）：

```javascript

  此处省略五千字.........



  function(e, t, n) {
    const r = n(1);
    document.getElementById("root").innerHTML = r("PunCha");
  },
  function(e, t, n) {
    e.exports = n(2)(1);
  },
  function(e, t) {
    e.exports = feature;
  }
]);

```

这里还需要注意一点，上面的最后一句`e.exports = feature`，这里的`feature`，其实就是`window.feature`，所以，在使用这个js之前，你需要先加载dll.feature.js。


### 使用DLL

好，经过webpack打包，会生成app.js到dist目录，所以dist目录里面现在就有3个文件了：

 - dist/feature.dll.js

 - dist/feature-manifest.json

 - dist/app.js



那么怎么使用他们呢？首先，必须在浏览器中使用，（不是因为app.js里面用到了DOM，本身webpack打包出来的东西就是只能给前端使用的），有两种方法使用他们：

 1. 直接用`<script>`标签加载：`index.html`

 1. 使用`little-loader`来异步加载：`index-little-loader.html`



`index.html`，很简单，只要注意先后顺序就行了，DLL先行：

```javascript

  <body>
    <div id="root"></div>
    <script type="text/javascript" src="dist/dll.feature.js"></script>
    <script type="text/javascript" src="dist/app.js"></script>
  </body>

```



`index-little-loader.html`：相对稍微复杂一点，这里使用了第三方库`little-loader`，先异步加载DLL，成功之后，在异步加载app本身。

```javascript

  <body>
    <div id="root"></div>
    <script type="text/javascript" src="https://unpkg.com/little-loader@0.2.0/lib/little-loader.js"></script>
    <script type="text/javascript">
      window._lload("./dist/dll.feature.js", err => {
        if (err) return console.error("Fail to load dll.feature.js");
        window._lload("./dist/app.js", err => {
          if (err) return console.error("Fail to load dll.feature.js");
        });
      });

    </script>
  </body>

```



## 可能碰到的问题

 - 报错：`Minified React error #130`，这个很有可能是DLL项目的导出有问题，检查下是不是同时使用了`module.exports`和`export default`？注意，ES2016的模块导出方式是可以使用的，然后在引用的项目中使用import导入就行了，或者使用`const {default:xxxx} = require('xxxx')也可以。



## 参考

 - [webpack+react+redux+es6开发模式---续](https://www.cnblogs.com/hujunzheng/p/6294954.html)



