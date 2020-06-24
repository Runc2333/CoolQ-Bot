/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, privateMessage, discussMessage",
        script: "outOfThinAir.js",
        handler: "outOfThinAir",
        regex: "/无中生有$/",
        description: "无中生有 暗度陈仓 凭空想象 凭空捏造 胡言胡语 无可救药 逝者安息 一路走好"
    });
}

function outOfThinAir(packet) {
    var OOTAS = "暗度陈仓, 凭空想象, 凭空捏造, 胡言胡语, 无可救药, 逝者安息, 一路走好".split(", ");
    for (key in OOTAS) {
        var msg = OOTAS[key];
        message.prepare(packet, msg, false).send();
    }
    return true;
}

module.exports = {
    init,
    outOfThinAir
}