var server = require("./server/server");
server.start({
    catchType: "bioDeep",
    bioDeepopt: {
        rootUrl: 'http://www.papc.cn/html/folder/13113661-1.htm?type=1',
        generateInfoFunc: generateAnimalInfo,
        initUrlFunc: function (opt) {
            server
                .getPage([opt.rootUrl], loadRootCallback)
                .then(function (urls) {
                    //遍历读取目页面 获取目下 物种的url                
                    return server.getPage(server.complicated(urls), loadTypeCallback)
                })
                .then(hasPageUrls => {
                    //有分頁的重新取
                    var urls = server.complicated(hasPageUrls.filter(x => { return ((x instanceof Array) && x.length > 0) }))
                    return server.getPage(urls, (_url, $) => {
                        _getBioListAhref($).forEach(href => {
                            var _u = server.fullUrl(_url, href);
                            server.addSiteUrl(server.encode(_u) || _u);
                        })
                    })
                })
                .then(x => {
                    server.urlsDone();
                })
        },
        fileName: "result" + +(new Date()),
    }
});

//root 获取到页面后
function loadRootCallback(_url, $) {
    //取出root下所有 目url,
    var urls = []
    _getBioListAhref($).forEach(href => {
        var _u = server.fullUrl(_url, href);
        urls.push(_u);
    })
    return urls
}

//root 获取到目页面后
function loadTypeCallback(_url, $) {
    var animalGroupUrls = [];
    //有分页说明是有很多页面                    
    if ($("#CBLast").length > 0) {
        var pageCount = $('#CBLast').prevAll('a').length - 1;
        for (let i = 1; i < pageCount; i++) {
            animalGroupUrls.push(server.encode(_url) + "&pos={pos}".format({ pos: 16 * i }))
        }
    }
    //取出root下所有目的url,放到animalGroupUrls里
    _getBioListAhref($).forEach(href => {
        // $element.attr('href') 本来的样子是 /topic/542acd7d5d28233425538b04
        // 我们用 url.resolve 来自动推断出完整 url，变成             
        var _u = server.fullUrl(_url, href);
        server.addSiteUrl(server.encode(_u) || _u);
    });

    return animalGroupUrls;
}

//组织数据实体的方法类
//生成动物的
function generateAnimalInfo(_url,$) {
    var res =  {
        name: $("#AnimalIDsubject").text(),
        latinName:$("#AnimalIDlatin").text(),
        protectLevel: $("#AnimalIDalevel").text(),
        urls:[],
    }

    $("table tr").each((index,ele)=>{
        var ele = $(ele);
        var fieldname = ele.find("td")[0].text();
        var _o = ele.find("span[id]")[0];
        var field = _o.attr('id');
        var value = _o.text();
        res[field] = value;
        res
    })

    //图片
    $("#AnimalIDpicture img").each((index,ele)=>{
        var imgurl = server.fullUrl( _url,$(ele).attr('src'));
        res.urls.push(imgurl);
    })
    
    
    return res
}

function _getBioListAhref($) {
    var res= [];
    $(".reserveList .list li a").each(function (inex, ele) {
        var $ele = $(ele);
        res.push($ele.attr('href'));
    })
    return res;
}

// 通过物种名录向下钻取数据
//root->取出目的urls -> 取出目下所有动物的urls(final results) -> 放入siteUrls
function initDeepUrls($) {
    //打开root, 
    // console.log("开始获取根页面 {url}".format({ url: opt.rootUrl }));    
    // superagent.get(opt.rootUrl).end(function (err, res) {
    // if (err) {
    //     return console.log(err)
    // }
    // console.log("根页面获取成功 {url}".format({ url: opt.rootUrl }));
    // var $ = cheerio.load(res.text);
    var animalGroupUrls = [];
    //取出root下所有目的url,放到animalGroupUrls里
    $(".reserveList .list li a").each(function (inex, ele) {
        var $ele = $(ele);
        // $element.attr('href') 本来的样子是 /topic/542acd7d5d28233425538b04
        // 我们用 url.resolve 来自动推断出完整 url，变成             
        var _url = url.resolve(opt.rootUrl, $ele.attr('href'));
        animalGroupUrls.push(_url);
    })

    //遍历animalGroupUrls打开目的页面
    ep.after(events.getAllAnimalUrlDoneEvent, animalGroupUrls.length, function (res) {
        console.log("所有物种url获取完成")
        // opt.siteUrls.push(...res.map(x => { return x[1] }).filter(x => { return x != undefined }));
        opt.siteUrls = opt.siteUrls.filter(x => { return x != undefined });
        ep.emit(events.loadUrlsDoneEvent);
    })

    // //控制并发, 避免被封ip
    async.mapLimit(animalGroupUrls, 1, function (_url, callback) {
        console.log("开始获取目页面 {url}".format({ url: _url }));
        var enurl = _encodeUrl(_url);
        superagent.get(enurl || _url).end(function (err, res) {
            if (err) {
                ep.emit(events.getAllAnimalUrlDoneEvent, [_url])
                return console.log(err)
            }

            console.log("目页面获取成功 {url}".format({ url: _url }));
            var $ = cheerio.load(res.text);
            //有分页说明是有很多页面
            if ($("#CBLast").length > 0) {
                animalGroupUrls.push(enurl + "&pos=16")
            }
            var animalGroupUrls = [];
            //取出root下所有目的url,放到animalGroupUrls里
            $(".reserveList .list li a").each(function (inex, ele) {
                var $ele = $(ele);
                // $element.attr('href') 本来的样子是 /topic/542acd7d5d28233425538b04
                // 我们用 url.resolve 来自动推断出完整 url，变成             
                var _u = url.resolve(_url, $ele.attr('href'));
                opt.siteUrls.push(_encodeUrl(_u) || _u);
            })
            console.log("url目前数量为{count}".format({ count: opt.siteUrls.length }));
            callback(null, _url);
            ep.emit(events.getAllAnimalUrlDoneEvent, [_url])
        })
    })
    // })

}