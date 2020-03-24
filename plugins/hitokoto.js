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
        type: "groupMessage",
        script: "hitokoto.js",
        handler: "hitokoto",
        regex: "/(^一言|一言$|hitokoto)/",
        description: "获取一句话~"
    });
    config.registerPlugin({
        type: "privateMessage",
        script: "hitokoto.js",
        handler: "hitokoto",
        regex: "/(^一言|一言$|hitokoto)/",
        description: "获取一句话~"
    });
    config.registerPlugin({
        type: "discussMessage",
        script: "hitokoto.js",
        handler: "hitokoto",
        regex: "/(^一言|一言$|hitokoto)/",
        description: "获取一句话~"
    });
    if (config.get("HITOKOTO") === false) {
        var data = {};
        data["HITOKOTO_DISABLE_GROUPS"] = [];
        config.write("HITOKOTO", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "HITOKOTO", "INFO");
    }
}

function hitokoto(packet) {
    
}

module.exports = {
    init,
    hitokoto
}