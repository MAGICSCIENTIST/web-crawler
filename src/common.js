function _exStrFunc() {
    String.prototype.format = function (args) {
        var result = this;
        if (arguments.length < 1) {
            return result;
        }

        var data = arguments; //如果模板参数是数组
        if (arguments.length == 1 && typeof (args) == "object") {
            //如果模板参数是对象
            data = args;
        }
        for (var key in data) {
            var value = data[key];
            if (value) {
                //result = result.replace("{" + key + "}", value);
                result = result.replaceAll("{" + key + "}", value);
            }
        }
        return result;
    };
    String.prototype.replaceAll = function (search, replacement) {
        var target = this;
        return target.replace(new RegExp(search, 'g'), replacement);
    };
}



var commoFunc = {
    init: function () {
        _exStrFunc();
    }
}

module.exports = commoFunc ;