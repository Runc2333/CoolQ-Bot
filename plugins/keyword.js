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
        subType: "groupMessage, discussMessage",
        script: "keyword.js",
        handler: "keyword",
        regex: "/./",
        description: "匹配关键词",
        notification: false
    });
    config.registerSuperCommand({
        command: "keyword",
        script: "keyword.js",
        handler: "command",
        argument: "[action]",
        description: "Keyword插件入口, 以下是参数说明:\n[action]:\nregister [regexp] [message] - 注册一个正则表达式及匹配时发送的内容.#admin\nremove [regexp] - 移除指定的正则表达式匹配规则.#admin\ndisplay - 显示当前所有注册到插件的匹配."
    });
    if (config.get("KEYWORD") === false) {
        var data = {};
        data["GROUPS_CONFIGURATIONS"] = {};
        config.write("KEYWORD", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "KEYWORD", "INFO");
    }
}

function keyword(packet) {
    //获取机器人名字
    var BOT_NAME = config.get("GLOBAL", "BOT_NAME");
    var BOT_QQNUM = config.get("GLOBAL", "BOT_QQNUM");
    if (packet.message_type === "group") {
        var GROUPS_CONFIGURATIONS = config.get("KEYWORD", "GROUPS_CONFIGURATIONS");
        var GROUP_CONFIGURATION = GROUPS_CONFIGURATIONS[packet.group_id.toString()];
        if (typeof (GROUP_CONFIGURATION) === "undefined") {
            return false;
        }
        for (key in GROUP_CONFIGURATION) {
            var regex = eval(key.replace(/\{BOT_NAME\}/g, BOT_NAME).replace(/\{BOT_QQNUM\}/g, BOT_QQNUM));//替换掉正则表达式字符串里的机器人名字 同时转化为正则表达式对象
            if (regex.test(packet.message)) {
                var msg = GROUP_CONFIGURATION[key];
            }
        }
    }
    if (typeof (msg) === "undefined") {
        return false;
    }
    message.prepare(packet, msg, true).send();
}

function command(packet) {
    var options = cqcode.decode(packet.message).pureText.split(" ");
    switch (options[1]) {
        case "register":
            /* 检查权限 */
            if (message.checkPermission(packet) === false) {
                return false;
            }
            options.shift();
            options.shift();
            var regex = options.shift();
            if (regex === undefined) {
                var msg = "[Keyword] 请提供一个正则表达式匹配规则.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            if (/^\/[^\/]+?\/$/.test(regex) === false) {
                var msg = "[Keyword] 提供的参数(2)不是一个正则表达式.\n请提供一个正确的正则表达式.\n参考: https://deerchao.cn/tutorials/regex/regex.htm";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var regexMessage = options.join(" ").replace(new RegExp("\r\n", "gm"), "\n");
            if (regexMessage == "") {
                var msg = "[Keyword] 请提供匹配时要发送的文字.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var GROUPS_CONFIGURATIONS = config.get("KEYWORD", "GROUPS_CONFIGURATIONS");
            if (typeof (GROUPS_CONFIGURATIONS[packet.group_id.toString()]) === "undefined") {
                GROUPS_CONFIGURATIONS[packet.group_id.toString()] = {};
            }
            GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex] = regexMessage;
            config.write("KEYWORD", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
            var msg = "[Keyword] 已成功注册.";
            message.prepare(packet, msg, true).send();
            break;
        case "remove":
            /* 检查权限 */
            if (message.checkPermission(packet) === false) {
                return false;
            }
            var GROUPS_CONFIGURATIONS = config.get("KEYWORD", "GROUPS_CONFIGURATIONS");
            var GROUP_CONFIGURATION = GROUPS_CONFIGURATIONS[packet.group_id.toString()];
            if (typeof (GROUP_CONFIGURATION) === "undefined") {
                var msg = "[Keyword] 该群组未注册任何正则表达式匹配规则.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var regex = options[2];
            var pendingDelete = GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex];
            if (typeof (pendingDelete) === "undefined") {
                var msg = "[Keyword] 指定的正则表达式匹配规则不存在.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            delete GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex];
            if (Object.keys(GROUPS_CONFIGURATIONS[packet.group_id.toString()]).length === 0) {
                delete GROUPS_CONFIGURATIONS[packet.group_id.toString()];
            }
            config.write("KEYWORD", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
            var msg = "[Keyword] 已移除指定的正则表达式匹配规则.";
            message.prepare(packet, msg, true).send();
            break;
        case "display":
            var GROUP_CONFIGURATION = config.get("KEYWORD", "GROUPS_CONFIGURATIONS")[packet.group_id.toString()];
            if (typeof (GROUP_CONFIGURATION) === "undefined") {
                var msg = "[Keyword] 该群组未注册任何正则表达式匹配规则.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var msg = "以下是目前注册到插件的所有正则表达式匹配:";
            var globalPlaceholder = new Array((msg.length) * 2 + 2).join("-");
            msg += `\n${globalPlaceholder}\n\n`;
            for (regex in GROUP_CONFIGURATION) {
                msg += `${regex}\n`;
                msg += `${GROUP_CONFIGURATION[regex]}\n\n`;
            } 
            message.prepare(packet, msg, true).send();
            break;
        default:
            log.write("处理失败:未知指令.", "KEYWORD", "WARNING");
            var msg = "[Keyword] 未知指令.";
            message.prepare(packet, msg, true).send();
            return false;
    }
}

module.exports = {
    init,
    keyword,
    command
}