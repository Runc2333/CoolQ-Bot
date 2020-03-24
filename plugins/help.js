/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function init() {
    config.registerSuperCommand({
        command: "help",
        script: "help.js",
        handler: "displayHelpInfo",
        argument: "",
        description: "显示指令帮助."
    });
}

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

module.exports = {
    init,
    displayHelpInfo
}