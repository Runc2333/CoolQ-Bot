/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器


config.registerPlugin({
    type: "message",
    subType: "groupMessage, discussMessage, privateMessage",
    script: "../systemPlugin/help.js",
    handler: "displayReadableHelpInfo",
    regex: "/帮助/",
    description: "显示机器人支持的功能~",
    notification: false,
    skip: true
});
config.registerSuperCommand({
    command: "help",
    script: "../systemPlugin/help.js",
    handler: "displayHelpInfo",
    argument: "",
    description: "显示机器人支持的功能.",
    skip: true
});
config.registerSuperCommand({
    command: "commandHelp",
    script: "../systemPlugin/help.js",
    handler: "displayHelpInfo",
    argument: "",
    description: "显示指令帮助.",
    skip: true
});
config.registerSuperCommand({
    command: "plugins",
    script: "../systemPlugin/help.js",
    handler: "displayPluginInfo",
    argument: "",
    description: "显示注册到系统的插件.",
    skip: true
});

function displayHelpInfo(packet) {
    var SUPER_COMMAND_REGISTRY = config.get("GLOBAL", "SUPER_COMMAND_REGISTRY");
    var msg = "以下是目前注册到系统的所有指令:";
    var globalPlaceholder = new Array((msg.length)*2 + 2).join("-");
    msg += `\n${globalPlaceholder}\n\n`;
    for (key in SUPER_COMMAND_REGISTRY) {
        if (SUPER_COMMAND_REGISTRY[key]["argument"] === "") {
            // var placeholder = new Array(key.length + 3).join("-");
            // msg += `/${key}\n${placeholder}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n\n`;
            msg += `/${key}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n\n`;
        } else {
            // var placeholder = new Array((key.length) + (SUPER_COMMAND_REGISTRY[key]["argument"].length) + 4).join("-");
            // msg += `/${key} ${SUPER_COMMAND_REGISTRY[key]["argument"]}\n${placeholder}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n\n`;
            msg += `/${key} ${SUPER_COMMAND_REGISTRY[key]["argument"]}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n\n`;
        }
    }
    msg += `${globalPlaceholder}\n`;
    msg += "在描述末尾标有#admin字样的指令仅管理员可用.\n[paramater]代表必须参数, 请使用实际值替换, 不需要包含方括号.\n<parameter>代表可选参数, 请使用实际值替换, 不需要包含尖括号.";
    message.prepare(packet, msg, true).send();
}

function displayPluginInfo(packet) {
    var msg = "以下是目前注册到系统的所有插件:";
    var globalPlaceholder = new Array((msg.length) * 2 + 2).join("-");
    msg += `\n${globalPlaceholder}\n`;
    var registeredPlugins = config.get("GLOBAL", "PLUGIN_REGISTRY");
    for (key in registeredPlugins) {
        msg += `${key}: ${registeredPlugins[key]}\n`;
    }
    msg += `${globalPlaceholder}\n`;
    msg += "使用“/enable 插件名”来启用指定插件.\n"
    msg += "使用“/disable 插件名”来禁用指定插件.\n"
    message.prepare(packet, msg, true).send();
}

function displayReadableHelpInfo(packet) {
    var msg = "机器人目前支持如下主动触发功能：\n一言 - 获取一句话\n抽签 - 抽取今日运势\n来点色图 - 获取一张色图\nq [模式] [关键词] - QQ炫舞手游爆点查询";
    message.prepare(packet, msg, true).send();
    return true;
}

module.exports = {
    displayHelpInfo,
    displayPluginInfo,
    displayReadableHelpInfo
}