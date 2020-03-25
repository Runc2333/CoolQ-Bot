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
        script: "chatbot.js",
        handler: "chatbot",
        regex: "/{BOT_NAME}\s.+/",
        description: "让机器人来陪你聊聊天~"
    });
    config.registerSuperCommand({
        command: "chatbot",
        script: "chatbot.js",
        handler: "command",
        argument: "[action]",
        description: "聊天机器人插件入口, 以下是参数说明:\n[action]:\nenable|disable - 启用或禁用聊天机器人.#admin\n"
    });
    if (config.get("CHATBOT") === false) {
        var data = {};
        data["TIANXING_API_KEY"] = "Please replace this with your TianXin API Key.";
        data["CHATBOT_DISABLE_GROUPS"] = [];
        config.write("CHATBOT", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "CHATBOT", "INFO");
    }
}

function command(packet) {
    
}

module.exports = {
    init,
    command
}