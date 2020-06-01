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
        script: "hitokoto.js",
        handler: "hitokoto",
        regex: "/(^一言|一言$|hitokoto)/",
        description: "获取一句话~"
    });
}

function hitokoto(packet) {
    var url = "https://v1.hitokoto.cn/";
    var res = request("GET", url);
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "HITOKOTO", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "HITOKOTO", "WARNING");
        return false;
    }
    var msg = `${response.hitokoto} ——${response.from}`;
    message.prepare(packet, msg, true).send();
    return true;
}

module.exports = {
    init,
    hitokoto
}