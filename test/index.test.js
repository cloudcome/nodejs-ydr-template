/*!
 * 测试文件
 * @author ydr.me
 * @create 2014-11-14 09:51
 */

'use strict';

var path = require('path');
var should = require("should");
var Template = require('../index.js');
var data = {
    user: '<b>云淡然</b>',
    age: 99,
    love: ['html', 'css', 'js'],
    from: 'Hangzhou'
};


Template.addFilter('upcase', function (value) {
    return value.toUpperCase();
});


Template.addFilter('add', function (value, num) {
    return value * 1 + num;
});


// 输出
describe('echo', function () {
    var template1 = '{{user}}';
    var template2 = '{{=user}}';
    var template3 = '\\{{=user}}';

    it(template1, function () {
        var tpl = new Template(template1);
        tpl.render(data).should.be.equal('&#38;#60;b&#38;#62;云淡然&#38;#60;/b&#38;#62;');
    });

    it(template2, function () {
        var tpl = new Template(template2);
        tpl.render(data).should.be.equal('<b>云淡然</b>');
    });

    it(template3, function () {
        var tpl = new Template(template3);
        tpl.render(data).should.be.equal('{{=user}}');
    });
});


// 判断
describe('if else', function () {
    var template1 = '{{if age===1}}1{{else if age === 2}}2{{else}}{{age}}{{/if}}';

    it(template1, function () {
        var tpl = new Template(template1);
        tpl.render(data).should.be.equal('99');
    });
});


// 列表
describe('list', function () {
    var template1 = '{{list love as index,item}}' +
        '{{index}} => {{item}}' +
        '{{/list}}';
    var template2 = '{{list love as index,item}}' +
        '{{item}}' +
        '{{/list}}';

    it(template1, function () {
        var tpl = new Template(template1);
        tpl.render(data).should.be.equal('0 => html1 => css2 => js');
    });

    it(template2, function () {
        var tpl = new Template(template2);
        tpl.render(data).should.be.equal('htmlcssjs');
    });
});


// 载入
describe('include', function () {
    var template1 = '{{include ./component.html}}{{age}}';

    it(template1, function (done) {
        Template.__express(path.join(__dirname, './index.html'), data, function (err, html) {
            should.not.exist(err);

            html.should.be.equal('<b>云淡然</b>99');
            done();
        });
    });
});


// 过滤
describe('filter', function () {
    var template1 = '{{from|upcase}}';
    var template2 = '{{age|add:10}}';

    it(template1, function () {
        var tpl = new Template(template1);

        tpl.render(data).should.be.equal('HANGZHOU');
    });

    it(template2, function () {
        var tpl = new Template(template2);

        tpl.render(data).should.be.equal('109');
    });
});
