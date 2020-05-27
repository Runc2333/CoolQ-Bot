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

module.exports = {
    deepCompare,
    editDistance,
    similarity
}