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
        command: "设置欢迎语",
        script: "welcome.js",
        handler: "set",
        argument: "[欢迎语]",
        requirePermission: true,
        description: "设置入群时给新成员发送的话语，使用示例：#设置欢迎语 欢迎入群！本群24小时空调开放，来了就别想走了哦~"
    });
    config.registerSuperCommand({
        command: "移除欢迎语",
        script: "welcome.js",
        handler: "remove",
        requirePermission: true,
        description: "移除当前设置的欢迎语，使用示例：#移除欢迎语"
    });
    config.registerSuperCommand({
        command: "显示欢迎语",
        script: "welcome.js",
        handler: "display",
        description: "显示当前设置的欢迎语，使用示例：#显示欢迎语"
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
    message.prepare(packet, welcomeString.replace(/&#91;/g, "[").replace(/&#93;/g, "]"), true).send();
}

function set(packet) {
    /* 检查权限 */
    if (message.checkPermission(packet) === false) {
        return false;
    }
    var welcomeString = cqcode.decode(packet.message).pureText.replace(/^#设置欢迎语 */, "");
    var GROUP_WELCOME_STRINGS = config.get("WELCOME", "GROUP_WELCOME_STRINGS");
    GROUP_WELCOME_STRINGS[packet.group_id.toString()] = welcomeString;
    config.write("WELCOME", GROUP_WELCOME_STRINGS, "GROUP_WELCOME_STRINGS");
    var msg = "[Welcome] 已成功设定入群欢迎语.";
    message.prepare(packet, msg, true).send();
    return true;
}

function remove(packet) {
    /* 检查权限 */
    if (message.checkPermission(packet) === false) {
        return false;
    }
    var GROUP_WELCOME_STRINGS = config.get("WELCOME", "GROUP_WELCOME_STRINGS");
    if (typeof (GROUP_WELCOME_STRINGS[packet.group_id.toString()]) === "undefined") {
        message.prepare(packet, `本群目前未设置任何入群欢迎语.\n使用指令"#设置欢迎语 [欢迎语]"来设置入群欢迎语.`, true).send();
        return false;
    } else {
        delete GROUP_WELCOME_STRINGS[packet.group_id.toString()]
    }
    config.write("WELCOME", GROUP_WELCOME_STRINGS, "GROUP_WELCOME_STRINGS");
    message.prepare(packet, `已经移除入群欢迎语.`, true).send();
    return true;
}

function display(packet) {
    var GROUP_WELCOME_STRINGS = config.get("WELCOME", "GROUP_WELCOME_STRINGS");
    if (typeof (GROUP_WELCOME_STRINGS[packet.group_id.toString()]) === "undefined") {
        message.prepare(packet, `本群目前未设置任何入群欢迎语.\n使用指令"#设置欢迎语 [欢迎语]"来设置入群欢迎语.`, true).send();
        return false;
    }
    message.prepare(packet, `本群目前设置的入群欢迎语如下：\n${GROUP_WELCOME_STRINGS[packet.group_id.toString()]}`, true).send();
    return true;
}

module.exports = {
    init,
    welcome,
    set,
    remove,
    display,
}