
var crawler = require("../src/web-crawler");
console.time("done");

crawler.setOption({
    Animalopt: {
        rootUrl: 'http://www.papc.cn/html/folder/13113661-1.htm?type=1',
        generateInfoFunc: generateAnimalInfo,
        initUrlFunc: initUrls,
        fileName: "AnimalResult" + +(new Date()),
    }, plantopt: {
        rootUrl: 'http://www.papc.cn/html/category/13113856-1.htm',
        generateInfoFunc: generatePlantInfo,
        initUrlFunc: initUrls,
        fileName: "plantResult" + +(new Date()),
    }, testopt: {
        rootUrl: 'http://www.papc.cn/html/papc/plant/915709-1.htm',
        generateInfoFunc: generateAnimalInfo,
        initUrlFunc: function(){
            var server = this;
            return new Promise(reslove=>{
                server.addSiteUrl(server.option.rootUrl);
                reslove()
            })
        },
        fileName: "testResult" + +(new Date()),
    }
})

var loadAnimal = crawler.createServer("Animal")
    .start()
    // .then(res => {
    //     // return server.saveToFile(res);
    // });

var loadPlant = crawler.createServer("plant")
    .start()
    // .then(res => {
    //     // return server.saveToFile(res);
    // });

Promise.all([loadAnimal, loadPlant]).then(x => {
    console.timeEnd("done");
})

//组织url
function initUrls() {
    var server = this;
    return server
        .getPage([server.option.rootUrl], loadRootCallback)
        .then(function (urls) {
            //遍历读取目页面 获取目下 物种的url                
            return server.getPage(crawler.complicated(urls), loadTypeCallback)
        })
        .then(hasPageUrls => {
            //有分頁的重新取
            var urls = crawler.complicated(hasPageUrls.filter(x => { return ((x instanceof Array) && x.length > 0) }))
            return server.getPage(urls, (_url, $) => {
                var finalurls = [];
                _getBioListAhref($).forEach(href => {
                    var _u = crawler.fullUrl(_url, href);
                    server.addSiteUrl(crawler.encode(_u) || _u);
                })
            })
        })
    // .then(x => {
    //   
    // })
}

//root 获取到页面后
function loadRootCallback(_url, $) {
    //取出root下所有 目url,    
    var urls = []
    _getBioListAhref($).forEach(href => {
        var _u = crawler.fullUrl(_url, href);
        urls.push(_u);
    })
    return urls
}

//root 获取到目页面后
function loadTypeCallback(_url, $) {
    var server = this;
    var animalGroupUrls = [];
    //有分页说明是有很多页面                    
    if ($("#CBLast").length > 0) {
        var pageCount = $('#CBLast').prevAll('a').length - 1;
        for (let i = 1; i < pageCount; i++) {
            animalGroupUrls.push(crawler.encode(_url) + "&pos={pos}".format({ pos: 16 * i }))
        }
    }
    //取出root下所有目的url,放到animalGroupUrls里
    _getBioListAhref($).forEach(href => {
        // $element.attr('href') 本来的样子是 /topic/542acd7d5d28233425538b04
        // 我们用 url.resolve 来自动推断出完整 url，变成             
        var _u = crawler.fullUrl(_url, href);
        server.addSiteUrl(crawler.encode(_u) || _u);
    });

    return animalGroupUrls;
}

//组织数据实体的方法类
//生成动物的
function generateAnimalInfo(_url, $,server) {
    var res = {
        iComeFrom:_url,
        name : $("#AnimalIDsubject").text(),
        urls:[],
    }

    $(".non table tr").each((index, ele) => {
        var ele = $(ele);
        var fieldname = $(ele.find("td")[0]).text().replace(":", "");
        var _o = $(ele.find("span[id]")[0]);
        var field = _o.attr('id');
        var value = _o.text();
        res[field] = value;
    })

    //图片
    $("#AnimalIDpicture img").each((index, ele) => {
        var imgurl = crawler.fullUrl(_url, $(ele).attr('src'));
        res.urls.push(imgurl);
    })

    this.saveToFile(res);
    return res
}

function generatePlantInfo(_url, $,server) {
    var res = {
        iComeFrom:_url,
        urls:[],
    }

    $("table.non tr").each((index, ele) => {
        var ele = $(ele);
        var fieldname = $(ele.find("td")[0]).text().replace(":", "");
        var _o = $(ele.find("span[id]")[0]);
        var field = _o.attr('id');
        var value = _o.text();
        res[field] = value;
    })

    //图片
    $("#AnimalIDpicture img").each((index, ele) => {
        var imgurl = crawler.fullUrl(_url, $(ele).attr('src'));
        res.urls.push(imgurl);
    })

    this.saveToFile(res);
    return res
}

function _getBioListAhref($) {
    var res = [];
    $(".reserveList .list li a").each(function (inex, ele) {
        var $ele = $(ele);
        res.push($ele.attr('href'));
    })
    return res;
}    