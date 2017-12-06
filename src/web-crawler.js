var eventproxy = require('eventproxy'),
    superagent = require('superagent'),
    cheerio = require('cheerio'),
    url = require('url'),
    extend = require('node.extend'),
    commoFunc = require('../common/common'),
    fs = require("fs"),
    async = require("async"),
    charset = require('superagent-charset')


charset(superagent);
var ep = new eventproxy();
commoFunc.init();
var events = {
    getDataLoadedEvent: "getDataLoaded",
    getAllAnimalUrlDoneEvent: "getAllBAnimalUrl",
    loadUrlsDoneEvent: "loadUrlsDone",
    getTempEventName: function () {
        return +(new Date()) + [];
    }
}
var defaultOptions = {    
    catchType: "typeB",
    typeBopt: {
        rootUrl: 'http://www.papc.cn/html/folder/13113661-1.htm?type=1',
        generateInfoFunc: undefined,
        initUrlFunc: undefined,
        fileName: "result",
        limit: 5,
        siteUrls: [],
    }
}

//save
function _save(obj, opt) {

    fs.appendFile('{name}.txt'.format({ name: opt.fileName || "result" }), JSON.stringify(obj) + '\n', function (err) {
        if (err) {
            return console.error(err);
        }
        console.log("数据写入成功！");
    });
}

function _log(msg) {
    var now = new Date();
    var fileName = "{Y}-{M}-{D}".format({ Y: now.getFullYear(), M: now.getMonth(), D: now.getDay() });
    fs.appendFile('{name}.txt'.format({ name: fileName }), now + '\n' + msg + '\n', function (err) {
        if (err) {
            return console.error(err);
        }
    });
}

//获取当前type的opt
function _getCurOptGroup(opt) {
    return opt[opt.catchType + "opt"];
}
//url编码
function _encodeUrl(_url) {
    var encodeUrl;
    var _spl = _url.split('=');
    if (_spl.length > 1) {
        encodeUrl = "";
        for (let i = 0; i < _spl.length - 1; i++) {
            encodeUrl += (_spl[i] + "=");
        }
        encodeUrl += encodeURIComponent(_spl[_spl.length - 1]);
    }
    return encodeUrl;
}

//获取url下的内容
//urls, loadedCallback, limit, rawUrl
function _getPageByUrl(urls, loadedCallback, opt) {    
    var oper = new Promise(function (resolve) {
        var tempEvent = events.getTempEventName(),
            resList = [],
            _monIndex=0;
        //当所有url都跑完了
        console.log("搞事共"+urls.length);
        ep.after(tempEvent, urls.length, function () {
            console.log("所有url获取完成, 共" + urls.length);
            resolve(resList);
        })
        // //控制并发, 避免被封ip
        async.mapLimit(urls, opt.limit || 1, function (_url, callback) {
            console.log("开始获取页面 {url}".format({ url: _url }));
            if (!opt.rawUrl) {
                var enurl = _encodeUrl(_url);
            }
            superagent
                .get(enurl || _url)
                .charset()
                .end(function (err, res) {
                    _monIndex++;
                    console.log("{index}/{count}".format({index:_monIndex,count:urls.length}))
                    if (err) {
                        ep.emit(tempEvent, [_url])
                        if (err.code == "ETIMEDOUT") {
                            _log("ETIMEDOUT:" + _url);
                        }
                        return console.log(err)
                    }

                    console.log("页面获取成功 {url}".format({ url: _url }));
                    var $ = cheerio.load(res.text, { decodeEntities: false });
                    callback(null, _url);
                    resList.push(loadedCallback(_url, $));                    
                    ep.emit(tempEvent, [_url])
                })
        })
    });

    return oper;

}

//url组织完成
function _generateUrlsDone() {
    ep.emit(events.loadUrlsDoneEvent);
}


//添加到url数组
function _addSiteUrl(url) {
    //如果参数是数组则遍历
    var groupOpt= _getCurOptGroup(this.option);
    if (!url || !this.option) return;
    if (!groupOpt.siteUrls) groupOpt.siteUrls = [];
    if (url instanceof Array) {
        url.forEach(x => groupOpt.siteUrls.push(x))
    } else {
        groupOpt.siteUrls.push(url);
    }
}

//set option
function _setOption() {
    var length = arguments.length;
    if (!length) {
        return this.option
    }
    if (!this.option) {
        this.option = {};
    }
    for (let index = 0; index < length; index++) {
        extend(this.option, arguments[index]);
    }
    return this.option;
}

//解构
function _complicated(urls) {
    var res = [];
    if (urls instanceof Array) {
        urls.forEach(_url => {
            if (_url instanceof Array) {
                _url.forEach(x => { res.push(x) })
            } else {
                res.push(_url)
            }
        })
    } else {
        res.push(urls)
    }
    return res;
}

///封装↓
function start(opt) {

    var oper = new Promise(resolve => {

        var option = _setOption.call(this, defaultOptions, opt);
        //组织url   
        var catchTypeOpt = _getCurOptGroup(option)
        var fun = catchTypeOpt.initUrlFunc;
        if (!fun) {
            return console.log("没有组织url的方法");
        }

        ep.all(events.loadUrlsDoneEvent, function () {
            var fun = catchTypeOpt.generateInfoFunc;
            if (!fun) {
                return console.log("没有生成数据的方法");
            }
            // CatchBioData(option, fun);
            _getPageByUrl(catchTypeOpt.siteUrls, fun, catchTypeOpt).then(x => {
                resolve();
            });
        })
        fun(catchTypeOpt);
    })

    return oper;
}

module.exports = {
    start: function(opt){
        return start.call(this,opt);
    },
    setOption: function (opt) {
        return _setOption.call(this, defaultOptions, opt);
    },
    getCatchTypeOpt: function () {
        return _getCurOptGroup.call(this, this.option);
    },
    addSiteUrl: function (urls) {
        return _addSiteUrl.call(this, urls);
    },
    getPage: function (urls, callback, option) {
        option = option || _getCurOptGroup(this.option);
        return _getPageByUrl.call(this, urls, callback, option);
    },
    fullUrl: function (root, _url) {
        return url.resolve(root, _url);
    },
    encode: function (str) {
        return _encodeUrl(str)
    },
    urlsDone: _generateUrlsDone,
    complicated: _complicated,
};