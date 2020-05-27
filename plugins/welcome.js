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
        type: "notice",
        subType: "groupIncrease",
        script: "welcome.js",
        handler: "welcome",
        description: "给新成员发送入群欢迎"
    });
    config.registerSuperCommand({
        command: "welcome",
        script: "welcome.js",
        handler: "command",
        argument: "[action]",
        description: "入群欢迎插件入口, 以下是参数说明:\n[action]:\nset [string] - 设置入群时给新成员发送的话语#admin\nremove - 移除当前设置的入群欢迎语#admin\ndisplay - 显示当前设置的入群欢迎语"
    });
    if (config.get("WELCOME") === false) {
        var data = {};
        data["GROUP_WELCOME_STRINGS"] = {};
        config.write("WELCOME", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "WELCOME", "INFO");
    }
}

function welcome(packet) {
    var welcomeString = config.get("WELCOME", "GROUP_WELCOME_STRINGS")[packet.group_id.toString()];
    if (typeof (welcomeString) === "undefined") {
        return false;
    }
    message.prepare(packet, welcomeString, true).send();
}

function command(packet) {
    var options = cqcode.decode(packet.message).pureText.split(" ");
    switch (options[1]) {
        case "set":
            /* 检查权限 */
            if (message.checkPermission(packet) === false) {
                return false;
            }
            var DISABLE_GROUPS = config.get("WELCOME", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index === -1) {
                //处于启用状态
                options.shift();
                options.shift();
                var welcomeString = options.join(" ").replace(new RegExp("\r\n", "gm"), "\n");
                var welcomeStrings = config.get("WELCOME", "GROUP_WELCOME_STRINGS");
                welcomeStrings[packet.group_id.toString()] = welcomeString;
                config.write("WELCOME", welcomeStrings, "GROUP_WELCOME_STRINGS");
                var msg = "[Welcome] 已成功设定入群欢迎语.";
            } else {
                //处于禁用状态
                var msg = "[Welcome] 目前处于禁用状态, 请先启用后再设置入群欢迎语.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "remove":
            /* 检查权限 */
            if (message.checkPermission(packet) === false) {
                return false;
            }
            var welcomeStrings = config.get("WELCOME", "GROUP_WELCOME_STRINGS");
            welcomeStrings[packet.group_id.toString()] = welcomeString;
            break;
        case "display":

            break;
        default:
            log.write("处理失败:未知指令.", "WELCOME", "WARNING");
            var msg = "[Welcome] 未知指令.";
            message.prepare(packet, msg, true).send();
            return false;
    }
}

module.exports = {
    init,
    welcome,
    command
}