var eventproxy = require('eventproxy'),
    superagent = require('superagent'),
    cheerio = require('cheerio'),
    url = require('url'),
    extend = require('node.extend'),
    commoFunc = require('../src/common'),
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
var defaultCatchOpt = {
    rootUrl: 'http://www.papc.cn/html/folder/13113661-1.htm?type=1',
    generateInfoFunc: undefined,
    initUrlFunc: undefined,
    fileName: "result",
    limit: 5,
    siteUrls: [],
    failedUrls: [],
    areadyCatughtUrls: [],
}
var defaultOptions = {
    catchType: "typeB",
    typeBopt: defaultCatchOpt
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
function _getCurOptGroup(which, opt) {
    return opt[which + "opt"];
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
    var self = this;
    var oper = new Promise(function (resolve) {
        var tempEvent = events.getTempEventName(),
            resList = [],
            _monIndex = 0;
        //当所有url都跑完了
        console.log("搞事共" + urls.length);
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
                    console.log("{index}/{count}".format({ index: _monIndex, count: urls.length }))
                    if (err) {                       
                        ep.emit(tempEvent, [_url])
                        var msg = "";
                        if (err.code == "ETIMEDOUT") {
                            // _log("ETIMEDOUT:" + _url);
                            msg = "ETIMEDOUT"
                        }
                        _addBadUrl(_url,loadedCallback,msg);
                        return console.log(err)
                    }

                    console.log("页面获取成功 {url}".format({ url: _url }));
                    var $ = cheerio.load(res.text, { decodeEntities: false });
                    callback(null, _url);
                    resList.push(loadedCallback.call(self, _url, $));
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
    if (!url || !this.option) return;
    if (!this.option.siteUrls) this.option.siteUrls = [];
    if (url instanceof Array) {
        url.forEach(x => this.option.siteUrls.push(x))
    } else {
        this.option.siteUrls.push(url);
    }
}

//添加执行失败的url到url数组
function _addBadUrl(url,where,why) {    
    //如果参数是数组则遍历    
    if (!url || !this.option) return;    
    var urlstrs = url;
    if (!this.option.failedUrls) this.option.failedUrls = [];
    if (url instanceof Array) {
        urlstrs = url.join(',')
        url.forEach(x => this.option.failedUrls.push(x))        
    } else {
        this.option.failedUrls.push(url);
    }

    //记录一下
    _log("failed url: {url} {where} {why}".format({
        url: urlstrs,
        where: where ? "\n on " + where : "",
        why: why ? "\n because " + why : ""
    }))
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
    var _this = this;
    var oper = new Promise(resolve => {

        var catchTypeOpt = _setOption.call(_this, defaultOptions, opt);
        //组织url   
        // var catchTypeOpt = _getCurOptGroup(option)
        var IniUrlfun = catchTypeOpt.initUrlFunc;
        if (!IniUrlfun) {
            return console.log("没有组织url的方法");
        }

        IniUrlfun.call(_this, _this, catchTypeOpt).then(function () {
            var fun = catchTypeOpt.generateInfoFunc;
            if (!fun) {
                return console.log("没有生成数据的方法");
            }
            // CatchBioData(option, fun);
            _getPageByUrl.call(_this, catchTypeOpt.siteUrls, function(_url, $) {
                var _s = this;
                try {
                    return fun.call(_s, _url, $,_s);
                } catch (err) {
                    _s.addBadUrl(_url,"try generate info",err);
                }
            }, catchTypeOpt).then(x => {
                resolve(_complicated(x));
            });
        });
    })

    return oper;
}

module.exports = {
    // start: function (opt) {
    //     return start.call(this, opt);
    // },
    setOption: function (opt, isfirst) {
        return _setOption.call(this, defaultOptions, opt);
    },
    getCatchTypeOpt: function (which) {
        return _getCurOptGroup.call(this, which, this.option);
    },
    // addSiteUrl: function (urls) {
    //     return _addSiteUrl.call(this, urls);
    // },
    getPage: function (urls, callback, option) {
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
    saveToFile: function (datas, opt) {
        return new Promise(resolve => {
            if (datas instanceof Array) {
                datas.forEach(x => {
                    _save(x, opt);
                })
            } else {
                _save(datas, opt);
            }
        })
    },
    createServer: function (which, opt) {
        var option = _setOption.call(this, defaultOptions, opt);
        var catchTypeOpt = _getCurOptGroup(which, option)
        return {
            option: catchTypeOpt,
            start: function (opt) {
                return start.call(this, opt);
            },
            setOption: function (opt) {
                return new Promise(resolve => {
                    _setOption.call(this, defaultOptions, opt);
                })
            },
            getPage: function (urls, callback) {
                return _getPageByUrl.call(this, urls, callback, this.option);
            },
            addSiteUrl: function (urls) {
                return _addSiteUrl.call(this, urls);
            },
            addBadUrl: function (_url, where, why) {                
                return _addBadUrl.call(this, urls,where,why);
            },
            saveToFile: function (datas) {
                return new Promise(resolve => {
                    if (datas instanceof Array) {
                        datas.forEach(x => {
                            _save(x, this.option);
                        })
                    } else {
                        _save(datas, this.option);
                    }
                })
            },
        }
    }
};