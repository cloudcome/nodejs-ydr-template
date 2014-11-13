# ydr-template [![NPM version](https://img.shields.io/npm/v/ydr-template.svg?style=flat)](https://npmjs.org/package/ydr-template)

精炼的模板引擎，主要适配了express。

# 使用
```
var ydrTemplate = require('ydr-template');
app.engine('html', ydrTemplate.__express);
app.set('view engine', 'html');
```

# 语法

## 判断
```
{{if abc}}
	hehe
{{else if def}}
	xixi
{{else}}
	haha
{{/if}}
```

## 列表
```
{{list items as item}}
	{{item}}
{{/list}}

{{list items as index,item}}
	{{index}} => {{item}}
{{/list}}
```

## 输出
```
定义一个变量：{{var abc = 123;}}
编码输出：{{'<a>123</a>'}} => &lt;a&gt;123&lt;/a&gt;
非编码输出：{{='<a>123</a>'}} => <a>123</a>
```

## 转义
```
反斜杠转义原样输出：\{{123}} => {{123}}
```

## 载入
```
必须是相对路径
{{include ./some.html}}
```

