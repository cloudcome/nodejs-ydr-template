/*!
 * 文件描述
 * @author ydr.me
 * @create 2015-02-11 15:08
 */

'use strict';

var fs = require('fs');
var path = require('path');
var file = path.join(__dirname, './example.html');
var html = fs.readFileSync(file, 'utf8');
var Template = require('./index.js');
var tpl = new Template(html);
var data = {
    string: 'a string',
    boolean: true,
    number: 2,
    list: [{
        key: 'key1',
        val: 'val1'
    },{
        key: 'key2',
        val: 'val2'
    }]
};

console.log(tpl.render(data));
