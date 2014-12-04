# ydr-template [![NPM version](https://img.shields.io/npm/v/ydr-template.svg?style=flat)](https://npmjs.org/package/ydr-template)

精炼的模板引擎。主要适配了express。

# 1、使用
```
var ydrTemplate = require('ydr-template');
ydrTemplate.setOptions({
    // 是否保留缓存
    cache: true,
    // 是否压缩
    compress: true
});
app.engine('html', ydrTemplate.__express);
app.set('view engine', 'html');
```

# 2、语法

## 输出
```
定义一个变量：{{var abc = 123;}}
编码输出：{{'<a>123</a>'}} => &lt;a&gt;123&lt;/a&gt;
非编码输出：{{='<a>123</a>'}} => <a>123</a>
反斜杠转义原样输出：\{{123}} => {{123}}
```

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

## 载入
```
必须是相对路径
{{include ./some.html}}
```

## 过滤
```
过滤规则，参数0为前一个结果，省略不写
{{'abc' | yourFilterFunction:arg1,arg2}}
```

# 3、接口

## 添加过滤方法
```
var ydrTemplate = require('ydr-template');

Template.addFilter('upcase', function (value) {
    return value.toUpperCase();
});

Template.addFilter('add', function (value, num) {
    return value * 1 + num;
});
```


## 获取过滤方法
```
var ydrTemplate = require('ydr-template');

ydrTemplate.getFilter('upcase');
```

## 过滤方法出口
```
var ydrTemplate = require('ydr-template');

ydrTemplate.filters;
```

## 模板引擎
```
var ydrTemplate = require('ydr-template');
var tpl = new ydrTemplate('{{user}}');

tpl.render({
    user: 'cloudcome'
});
// => "cloudcome"
```


# 4、版本

## 1.0.3
- 添加测试用例
- 修复部分 BUG

## 1.0.0
- 初始版本
- 支持 include