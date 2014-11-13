/*!
 * Template.js
 * @author ydr.me
 * @create 2014-10-09 18:35
 * @update 2014年11月13日19:02:24
 */


/**
 * @module lib-template
 * @requires lib-util
 * @requires lib-class
 */
'use strict';

var fs = require('fs');
var path = require('path');
var noop = function () {
    // ignore
};
// 模板原件缓存
var includeMap = {};
// 模板编译后的 MAP 用来缓存数据
var templateMap = {};
var regInclude = /{{\s*?include (.*?)\s*?}}/g;
var regStringWrap = /([\\"])/g;
var regBreakLineMac = /\n/g;
var regBreakLineWin = /\r/g;
var regVar = /^(=)?\s*([^|]+?)(\|.*)?$/;
var regFilter = /^(.*?)(\s*:\s*(.+)\s*)?$/;
var regIf = /^((else\s+)?if)\s+(.*)$/;
var regSpace = /\s+/g;
var regList = /^list\s+\b([^,]*)\b\s+as\s+\b([^,]*)\b(\s*,\s*\b([^,]*))?$/;
var regComments = /<!--[\s\S]*?-->/g;
var escapes = [
    {
        reg: /</g,
        rep: '&#60;'
    },
    {
        reg: />/g,
        rep: '&#62;'
    },
    {
        reg: /"/g,
        rep: '&#34;'
    },
    {
        reg: /'/g,
        rep: '&#39;'
    },
    {
        reg: /&/g,
        rep: '&#38;'
    }
];
var openTag = '{{';
var closeTag = '}}';
var defaults = {
    compress: true
};
var filters = {};

var Template = function (tmplate, options) {
    this._options = _extend({}, defaults, options);
    this._init(tmplate);
};
var TemplateStatic = {
    /**
     * 默认配置
     * @type {Object}
     * @static
     */
    defaults: defaults,


    /**
     * 静态过滤方法
     * @type {Object}
     * @static
     */
    filters: filters,


    /**
     * 添加过滤方法
     * @param {String} name 过滤方法名称
     * @param {Function} callback 方法
     * @param {Boolean} [isOverride=false] 是否强制覆盖，默认 false
     * @static
     */
    addFilter: function (name, callback, isOverride) {
        if (_type(name) !== 'string') {
            throw new Error('filter name must be a string');
        }

        // 未设置覆盖 && 已经覆盖
        if (!isOverride && filters[name]) {
            throw new Error('override a exist filter');
        }

        if (_type(callback) !== 'function') {
            throw new Error('filter callback must be a function');
        }

        filters[name] = callback;
    },


    /**
     * 获取过滤方法
     * @param {String} [name] 获取过滤方法的名称，为空表示获取全部过滤方法
     * @returns {Function|Object} 放回过滤方法或过滤方法的集合
     * @static
     */
    getFilter: function (name) {
        if (!name) {
            return filters;
        }

        if (_type(name) === 'string') {
            return filters[name];
        }
    }
};

_each(TemplateStatic, function (key, val) {
    Template[key] = val;
});

Template.prototype = {
    constructor: Template,


    /**
     * 初始化一个模板引擎
     * @param {String} template 模板字符串
     * @returns {Template}
     * @private
     */
    _init: function (template) {
        var the = this;
        var options = the._options;
        var _var = 'alienTemplateOutput_' + Date.now();
        var fnStr = 'var ' + _var + '="";';
        var output = [];
        var parseTimes = 0;
        // 是否进入忽略状态，true=进入，false=退出
        var inIgnore = false;
        // 是否进入表达式
        var inExp = false;

        the._template = {
            escape: _escape,
            filters: {}
        };
        the._useFilters = {};

        template.split(openTag).forEach(function (value) {
            var array = value.split(closeTag);
            var $0 = array[0];
            var $1 = array[1];
            var parseVar;

            parseTimes++;

            // 1个开始符
            if (array.length === 1) {
                // 多个连续开始符号
                if (!$0 || $0 === '{') {
                    if (inIgnore) {
                        output.push(_var + '+=' + the._lineWrap(openTag) + ';');
                    } else {
                        throw new Error('find one more open tag ' + openTag);
                    }
                }
                // 忽略开始
                else if ($0.slice(-1) === '\\') {
                    output.push(_var + '+=' + the._lineWrap($0.slice(0, -1) + openTag) + ';');
                    inIgnore = true;
                    parseTimes--;
                } else {
                    if ((parseTimes % 2) === 0) {
                        throw new Error('find unclose tag ' + openTag);
                    }

                    inIgnore = false;
                    inExp = true;
                    output.push(_var + '+=' + the._lineWrap($0) + ';');
                }
            }
            // 1个结束符
            else if (array.length === 2) {
                $0 = $0.trim();
                inExp = false;

                // 忽略结束
                if (inIgnore) {
                    output.push(_var + '+=' + the._lineWrap($0 + closeTag + $1) + ';');
                    inIgnore = false;
                    return;
                }

                $1 = the._lineWrap($1);

                // if abc
                if ($0.indexOf('if ') === 0) {
                    output.push(the._parseIfAndElseIf($0) + _var + '+=' + $1 + ';');
                }
                // else if abc
                else if ($0.indexOf('else if ') === 0) {
                    output.push('}' + the._parseIfAndElseIf($0) + _var + '+=' + $1 + ';');
                }
                // else
                else if ($0 === 'else') {
                    output.push('}else{' + _var + '+=' + $1 + ';');
                }
                // /if
                else if ($0 === '/if') {
                    output.push('}' + _var + '+=' + $1 + ';');
                }
                // list list as key,val
                // list list as val
                else if ($0.indexOf('list ') === 0) {
                    output.push(the._parseList($0) + _var + '+=' + $1 + ';');
                }
                // /list
                else if ($0 === '/list') {
                    output.push('}' + _var + '+=' + $1 + ';');
                }
                // var
                else {
                    parseVar = the._parseVar($0);

                    if (parseVar) {
                        output.push(_var + '+=' + the._parseVar($0) + '+' + $1 + ';');
                    }
                }

            }
            // 多个结束符
            else {
                output.push(_var + '+=' + the._lineWrap(value) + ';');
                inExp = false;
                inIgnore = false;
            }
        });

        fnStr += output.join('') + 'return ' + _var;
        the._fn = fnStr;

        return the;
    },


    /**
     * 渲染数据
     * @param {Object} data 数据
     * @returns {String} 返回渲染后的数据
     *
     * @example
     * tp.render(data);
     */
    render: function (data) {
        var the = this;
        var _var = 'alienTemplateData_' + Date.now();
        var vars = [];
        var fn;
        var existFilters = _extend({}, filters, the._template.filters);
        var self = _extend({}, {
            escape: _escape,
            filters: existFilters
        });
        var ret;

        _each(data, function (key) {
            vars.push('var ' + key + '=' + _var + '["' + key + '"];');
        });

        _each(the._useFilters, function (filter) {
            if (!existFilters[filter]) {
                throw new Error('can not found filter ' + filter);
            }
        });

        try {
            fn = new Function(_var, 'try{' + vars.join('') + this._fn + '}catch(err){return err.message;}');
        } catch (err) {
            fn = function () {
                return err;
            };
        }

        try {
            ret = fn.call(self, data);
        } catch (err) {
            ret = err.message;
        }

        return String(ret);
    },


    /**
     * 添加过滤函数，默认无任何过滤函数
     * @param {String} name 过滤函数名称
     * @param {Function} callback 过滤方法
     * @param {Boolean} [isOverride=false] 覆盖实例的过滤方法，默认为false
     *
     * @example
     * tp.addFilter('test', function(val, arg1, arg2){
         *     // code
         *     // 规范定义，第1个参数为上一步的值
         *     // 后续参数自定义个数
         * });
     */
    addFilter: function (name, callback, isOverride) {
        var instanceFilters = this._template.filters;

        if (_type(name) !== 'string') {
            throw new Error('filter name must be a string');
        }

        // 未设置覆盖 && 已经覆盖
        if (!isOverride && instanceFilters[name]) {
            throw new Error('override a exist instance filter');
        }

        if (_type(callback) !== 'function') {
            throw new Error('filter callback must be a function');
        }

        instanceFilters[name] = callback;
    },

    /**
     * 获取过滤函数
     * @param {String} [name] 过滤函数名称，name为空时返回所有过滤方法
     * @returns {Function|Object}
     *
     * @example
     * tp.getFilter();
     * // => return all filters Object
     *
     * tp.getFilter('test');
     * // => return test filter function
     */
    getFilter: function (name) {
        return _type(name) === 'string' ?
            this._template.filters[name] :
            this._template.filters;
    },


    /**
     * 解析变量
     * @param str
     * @returns {string}
     * @private
     */
    _parseVar: function (str) {
        var the = this;
        var matches = str.trim().match(regVar);
        var filters;
        var ret;

        if (!matches) {
            return '';
        }

        ret = (matches[1] !== '=' ? 'this.escape(' : '') +
        matches[2] +
        (matches[1] !== '=' ? ')' : '');

        if (!matches[3]) {
            return ret;
        }

        filters = matches[3].split('|');
        filters.shift();
        filters.forEach(function (filter) {
            var matches = filter.match(regFilter);
            var args;
            var name;

            if (!matches) {
                throw new Error('parse error ' + filter);
            }

            name = matches[1];

            the._useFilters[name] = !0;

            args = ret + (matches[3] ? ',' + matches[3] : '');
            ret = 'this.filters.' + name + '(' + args + ')';
        });

        return ret;
    },


    /**
     * 解析条件判断
     * @param str
     * @returns {string}
     * @private
     */
    _parseIfAndElseIf: function (str) {
        var matches = str.trim().match(regIf);

        if (!matches) {
            throw new Error('parse error ' + str);
        }

        return matches[1] + '(' + matches[3] + '){';
    },


    /**
     * 解析列表
     * @param str
     * @returns {string}
     * @private
     */
    _parseList: function (str) {
        var matches = str.trim().match(regList);
        var parse;


        if (!matches) {
            throw new Error('parse error ' + str);
        }

        parse = {
            list: matches[1] || '',
            key: matches[4] ? matches[2] : '$index',
            val: matches[4] ? matches[4] : matches[2]
        };

        return 'for(var ' + parse.key + ' in ' + parse.list + '){var ' +
            parse.val + '=' + parse.list + '[' + parse.key + '];';
    },


    /**
     * 行包裹，删除多余空白、注释，替换换行符、双引号
     * @param str
     * @returns {string}
     * @private
     */
    _lineWrap: function (str) {
        var optioons = this._options;

        str = str.replace(regStringWrap, '\\$1');
        str = optioons.compress ?
            str.replace(regSpace, ' ').replace(regComments, '')
                .replace(regBreakLineMac, '').replace(regBreakLineWin, '') :
            str.replace(regBreakLineMac, '\\n').replace(regBreakLineWin, '\\r');

        return '"' + str + '"';
    }
};

/**
 * 模板引擎<br>
 * <b>注意点：不能在模板表达式里出现开始或结束符，否则会解析错误</b><br>
 * 1. 编码输出变量<br>
 * {{data.name}}<br>
 * 2. 取消编码输出变量<br>
 * {{=data.name}}<br>
 * 3. 判断语句（<code>if</code>）<br>
 * {{if data.name1}}<br>
 * {{else if data.name2}}<br>
 * {{else}}<br>
 * {{/if}}<br>
 * 4. 循环语句（<code>list</code>）<br>
 * {{list list as key,val}}<br>
 * {{/list}}<br>
 * {{list list as val}}<br>
 * {{/list}}<br>
 * 5. 过滤（<code>|</code>）<br>
 * 第1个参数实际为过滤函数的第2个函数，这个需要过滤函数扩展的时候明白，详细参考下文的addFilter<br>
 * {{data.name|filter1|filter2:"def"|filter3:"def","ghi"}}<br>
 * 6. 反斜杠转义，原样输出<br>
 * \{{}} => {{}}<br>
 *
 * @param {Object} [options] 配置
 * @param {Boolean} [options.compress=true] 是否压缩，默认为 true
 * @constructor
 *
 * @example
 * var tpl = new Template('{{name}}');
 * tpl.render({name: 'yundanran'});
 * // => 'yundanran'
 */
module.exports = Template;

/**
 * 适配 express
 * @param file {String} 模板的绝对路径
 * @param data {Object} 模板的数据
 * @param [data.cache=false] {Boolean} 是否缓存模板
 * @param [data.locals=null] {Object} 动态助手
 * @param [data.settings=null] {Object} app 配置
 * @param fn {Function} 回调
 */
module.exports.__express = function (file, data, callback) {
    var template;
    var tpl;

    if (typeof data === 'function') {
        callback = data;
        data = {};
    }

    callback = callback || noop;

    if (data.cache && templateMap[file]) {
        tpl = templateMap[file];
    } else {
        try {
            template = fs.readFileSync(file, 'utf8');
            template = _preCompile(file, template);
        } catch (err) {
            return callback(err);
        }

        tpl = new Template(template);

        if (data.cache) {
            templateMap[file] = tpl;
        }
    }

    callback(null, tpl.render(data));
};


/*=============================================================================*/
/*=============================[ private ]=====================================*/
/*=============================================================================*/


/**
 * 判断数据类型
 * @param obj
 * @returns {string}
 * @private
 */
function _type(obj) {
    if (typeof obj === 'undefined') {
        return 'undefined';
    }

    return Object.prototype.toString.call(obj).slice(8, -1).toLocaleLowerCase();
}


/**
 * 合并对象，一层
 * @param source
 * @returns {*}
 * @private
 */
function _extend(source/*target*/) {
    var i = 0;
    var j;
    var targets = Array.prototype.slice.call(arguments, 1);

    for (; i < targets.length; i++) {
        for (j in targets[i]) {
            if (targets[i].hasOwnProperty(j) && targets[i][j] !== undefined) {
                source[j] = targets[i][j];
            }
        }
    }

    return source;
}


/**
 * 遍历对象
 * @param obj
 * @param fn
 * @private
 */
function _each(obj, fn) {
    var i;

    for (i in obj) {
        if (obj.hasOwnProperty(i)) {
            if (fn.call(obj, i, obj[i]) === false) {
                break;
            }
        }
    }
}


/**
 * HTML 编码
 * @param str
 * @returns {*}
 * @private
 */
function _escape(str) {
    str = String(str);

    _each(escapes, function (index, obj) {
        str = str.replace(obj.reg, obj.rep);
    });

    return str;
}


/**
 * 编译之前做的事情
 * @param file {String} 当前模板所在的路径
 * @param template {String} 当前模板内容
 * @private
 */
function _preCompile(file, template) {
    var relativeDir = path.dirname(file);

    return template.replace(regInclude, function ($0, $1) {
        var includeName = $1.trim();
        var includeFile = path.join(relativeDir, includeName);

        if (includeMap[includeFile]) {
            return includeMap[includeFile];
        }

        try {
            includeMap[includeFile] = fs.readFileSync(includeFile, 'utf8');
            return includeMap[includeFile];
        } catch (err) {
            return '';
        }
    });
}
