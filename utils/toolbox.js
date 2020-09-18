function deepCompare(x, y) {
    var i, l, leftChain, rightChain;
    function compare2Objects(x, y) {
        var p;
        // remember that NaN === NaN returns false
        // and isNaN(undefined) returns true
        if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
            return true;
        }
        // Compare primitives and functions.     
        // Check if both arguments link to the same object.
        // Especially useful on the step where we compare prototypes
        if (x === y) {
            return true;
        }
        // Works in case when functions are created in constructor.
        // Comparing dates is a common scenario. Another built-ins?
        // We can even handle functions passed across iframes
        if ((typeof x === 'function' && typeof y === 'function') ||
            (x instanceof Date && y instanceof Date) ||
            (x instanceof RegExp && y instanceof RegExp) ||
            (x instanceof String && y instanceof String) ||
            (x instanceof Number && y instanceof Number)) {
            return x.toString() === y.toString();
        }
        // At last checking prototypes as good as we can
        if (!(x instanceof Object && y instanceof Object)) {
            return false;
        }
        if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
            return false;
        }
        if (x.constructor !== y.constructor) {
            return false;
        }
        if (x.prototype !== y.prototype) {
            return false;
        }
        // Check for infinitive linking loops
        if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
            return false;
        }
        // Quick checking of one object being a subset of another.
        // todo: cache the structure of arguments[0] for performance
        for (p in y) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                return false;
            } else if (typeof y[p] !== typeof x[p]) {
                return false;
            }
        }
        for (p in x) {
            if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
                return false;
            } else if (typeof y[p] !== typeof x[p]) {
                return false;
            }
            switch (typeof (x[p])) {
                case 'object':
                case 'function':
                    leftChain.push(x);
                    rightChain.push(y);
                    if (!compare2Objects(x[p], y[p])) {
                        return false;
                    }
                    leftChain.pop();
                    rightChain.pop();
                    break;
                default:
                    if (x[p] !== y[p]) {
                        return false;
                    }
                    break;
            }
        }
        return true;
    }
    if (arguments.length < 1) {
        return true; //Die silently? Don't know how to handle such case, please help...
        // throw "Need two or more arguments to compare";
    }
    for (i = 1, l = arguments.length; i < l; i++) {
        leftChain = []; //Todo: this can be cached
        rightChain = [];
        if (!compare2Objects(arguments[0], arguments[i])) {
            return false;
        }
    }
    return true;
}

function editDistance(s1, s2) {
    const len1 = s1.length
    const len2 = s2.length
    let matrix = []
    for (let i = 0; i <= len1; i++) {
        // 构造二维数组
        matrix[i] = new Array()
        for (let j = 0; j <= len2; j++) {
            // 初始化
            if (i == 0) {
                matrix[i][j] = j
            } else if (j == 0) {
                matrix[i][j] = i
            } else {
                // 进行最小值分析
                let cost = 0
                if (s1[i - 1] != s2[j - 1]) { // 相同为0，不同置1
                    cost = 1
                }
                const temp = matrix[i - 1][j - 1] + cost
                matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, temp)
            }
        }
    }
    return matrix[len1][len2] //返回右下角的值
}

function similarity(x, y) {
    return 1 - (editDistance(x, y) / Math.max(x.length, y.length));
}

// function escapeRegExp(str) {
//     var escapeCharacter = ["*", ".", "?", "+", "$", "^", "[", "]", "(", ")", "{", "}", "|", "\\", "/"];
//     escapeCharacter.forEach((v) => {
//         str = str.replace(RegExp(`\\${v}`, "g"), `\\${v}`);
//     });
//     str = str.replace(RegExp(`\\\\`, "g"), `\\`);
//     return str;
// }

// array unique function
function unique(arr) {
    return Array.from(new Set(arr))
}

function formatTime(seconds = null) {
    if (seconds === null) {
        var date = new Date();
    } else {
        var date = new Date(parseFloat(seconds + "000"));
    }
    return (
        date.getFullYear()
        + "-" +
        ((date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1))
        + "-" +
        (date.getDate() < 10 ? "0" + date.getDate() : date.getDate())
        + " " +
        (date.getHours() < 10 ? "0" + date.getHours() : date.getHours())
        + ":" +
        (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes())
        + ":" +
        (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds())
    ).toString();
}

function isNum(val) {
    if (val === "" || val == null) {
        return false;
    }
    if (!isNaN(val)) {
        return true;
    } else {
        return false;
    }
}

function randomString(len) {
    len = len || 16;
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';    /****默认去掉了容易混淆的字符oOLl,9gq,Vv,Uu,I1****/
    var maxPos = chars.length;
    var str = "";
    for (i = 0; i < len; i++) {
        str += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return str;
}

function formatDuring(mss) {
    // var days = parseInt(mss / (1000 * 60 * 60 * 24));
    var hours = parseInt((mss % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = parseInt((mss % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.round((mss % (1000 * 60)) / 1000);
    return hours + " 小时 " + minutes + " 分钟 " + seconds + " 秒 ";
}

function chineseToNumber(chnStr) {
    var chnNumChar = {
        零: 0,
        一: 1,
        二: 2,
        两: 2,
        三: 3,
        四: 4,
        五: 5,
        六: 6,
        七: 7,
        八: 8,
        九: 9
    };

    var chnNameValue = {
        十: { value: 10, secUnit: false },
        百: { value: 100, secUnit: false },
        千: { value: 1000, secUnit: false },
        万: { value: 10000, secUnit: true },
        亿: { value: 100000000, secUnit: true }
    }

    if (/[^零一二两三四五六七八九十百千万亿]/.test(chnStr)) {
        return false;
    }

    var rtn = 0;
    var section = 0;
    var number = 0;
    var secUnit = false;
    var str = chnStr.split('');

    for (var i = 0; i < str.length; i++) {
        var num = chnNumChar[str[i]];
        if (typeof num !== 'undefined') {
            number = num;
            if (i === str.length - 1) {
                section += number;
            }
        } else {
            var unit = chnNameValue[str[i]].value;
            secUnit = chnNameValue[str[i]].secUnit;
            if (secUnit) {
                section = (section + number) * unit;
                rtn += section;
                section = 0;
            } else {
                section += (number * unit);
            }
            number = 0;
        }
    }
    return rtn + section;
}


module.exports = {
    deepCompare,
    editDistance,
    similarity,
    // escapeRegExp,
    formatTime,
    unique,
    isNum,
    randomString,
    formatDuring,
    chineseToNumber,
}