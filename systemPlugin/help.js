/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

config.registerPlugin({
    type: "message",
    subType: "privateMessage",
    script: "../systemPlugin/help.js",
    handler: "saySorry",
    regex: "/^#指令帮助$/",
    skip: true
});
config.registerPlugin({
    type: "message",
    subType: "groupMessage, discussMessage, privateMessage",
    script: "../systemPlugin/help.js",
    handler: "displayReadableHelpInfo",
    regex: "/(帮助|教程|说明|菜单|机器人菜单|机器人说明|机器人帮助|机器人教程)/",
    description: "显示机器人支持的功能~",
    notification: false,
    skip: true
});
config.registerSuperCommand({
    command: "指令帮助",
    script: "../systemPlugin/help.js",
    handler: "displayHelpInfo",
    argument: "",
    description: "显示指令帮助.",
    skip: true
});
config.registerSuperCommand({
    command: "插件",
    script: "../systemPlugin/help.js",
    handler: "displayPluginInfo",
    argument: "",
    description: "显示注册到系统的插件.",
    skip: true
});

function saySorry(packet) {
    msg = "抱歉，老人机目前在私聊状态下没有任何可配置项目.\n您可将我拉入一个群聊来体验我的全部功能.";
    message.prepare(packet, msg, true).send();
    return true;
}

function displayHelpInfo(packet) {
    if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
        var userPermission = false;
    } else {
        var userPermission = true;
    }
    var SUPER_COMMAND_REGISTRY = config.get("GLOBAL", "SUPER_COMMAND_REGISTRY");
    var msg = "以下是您当前可用的指令:";
    var globalPlaceholder = new Array((msg.length)*2 + 2).join("-");
    msg += `\n${globalPlaceholder}\n\n`;
    for (key in SUPER_COMMAND_REGISTRY) {
        if (SUPER_COMMAND_REGISTRY[key]["requirePermission"] === true) {
            if (userPermission) {
                if (SUPER_COMMAND_REGISTRY[key]["requireSuperPermission"] === true) {
                    if (message.isGlobalAdministrator(packet.sender.user_id) === true) {
                        if (SUPER_COMMAND_REGISTRY[key]["argument"] === "") {
                            msg += `#${key}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n本条指令仅全局超管可用\n\n`;
                        } else {
                            msg += `#${key} ${SUPER_COMMAND_REGISTRY[key]["argument"]}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n本条指令仅全局超管可用\n\n`;
                        }
                    }
                } else {
                    if (SUPER_COMMAND_REGISTRY[key]["argument"] === "") {
                        msg += `#${key}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n本条指令仅群组创建者/管理员可用\n\n`;
                    } else {
                        msg += `#${key} ${SUPER_COMMAND_REGISTRY[key]["argument"]}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n本条指令仅群组创建者/管理员可用\n\n`;
                    }
                }
            }
        } else {
            if (SUPER_COMMAND_REGISTRY[key]["argument"] === "") {
                msg += `#${key}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n\n`;
            } else {
                msg += `#${key} ${SUPER_COMMAND_REGISTRY[key]["argument"]}\n${SUPER_COMMAND_REGISTRY[key]["description"]}\n\n`;
            }
        }
    }
    msg += `${globalPlaceholder}\n`;
    msg += "[paramater]代表必须参数，请使用实际值替换，不需要包含方括号.\n<parameter>代表可选参数，请使用实际值替换，不需要包含尖括号.";
    message.prepare(packet, msg, true).send();
}

function displayPluginInfo(packet) {
    var msg = "以下是目前注册到系统的所有插件:";
    var globalPlaceholder = new Array((msg.length) * 2 + 2).join("-");
    msg += `\n${globalPlaceholder}\n`;
    var registeredPlugins = config.get("GLOBAL", "PLUGIN_REGISTRY");
    for (key in registeredPlugins) {
        msg += `${key.replace(/\.js$/, "")}: ${registeredPlugins[key]}\n`;
    }
    msg += `${globalPlaceholder}\n`;
    msg += "使用“#启用插件 插件名”来启用指定插件.\n"
    msg += "使用“#禁用插件 插件名”来禁用指定插件.\n"
    message.prepare(packet, msg, true).send();
}

function displayReadableHelpInfo(packet) {
    var msg = "机器人目前支持如下主动触发功能：\n\n指令：一言\n功能说明：获取一句话\n指令：抽签\n功能说明：抽取今日运势\n指令：来点色图\n功能说明：获取一张色图\nQQ炫舞手游爆点查询\n功能说明：https://sharechain.qq.com/c9d87dca6f6024c1264db7f8ca44e246\n\n若要获取指令帮助，请发送“#指令帮助”";
    message.prepare(packet, msg, true).send();
    return true;
}

module.exports = {
    saySorry,
    displayHelpInfo,
    displayPluginInfo,
    displayReadableHelpInfo
}