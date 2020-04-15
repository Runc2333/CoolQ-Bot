/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口

config.registerSuperCommand({
    command: "enable",
    script: "../systemPlugin/pluginSwitch.js",
    handler: "enable",
    argument: "[plugin]",
    description: "启用指定插件, 以下是参数说明:\n[plugin]: 要启用的插件名称.#admin",
    skip: true
});

config.registerSuperCommand({
    command: "disable",
    script: "../systemPlugin/pluginSwitch.js",
    handler: "disable",
    argument: "[plugin]",
    description: "启用指定插件, 以下是参数说明:\n[plugin]: 要启用的插件名称.#admin",
    skip: true
});

function enable(packet) {
    /* 检查权限 */
    if(config.checkPermission(packet) === false){
        return false;
    }
    var GROUP_PLUGIN_SWITCH = config.get("GLOBAL", "GROUP_PLUGIN_SWITCH");
    var PLUGIN_REGISTRY = config.get("GLOBAL", "PLUGIN_REGISTRY");
    var options = cqcode.decode(packet.message).pureText.split(" ");
    if (typeof (PLUGIN_REGISTRY[options[1]]) === "undefined") {
        var msg = "指定的插件不存在.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (typeof (GROUP_PLUGIN_SWITCH[packet.group_id.toString()]) === "undefined") {
        GROUP_PLUGIN_SWITCH[packet.group_id.toString()] = {};
    }
    if (typeof (GROUP_PLUGIN_SWITCH[packet.group_id.toString()][options[1]]) === "undefined") {
        GROUP_PLUGIN_SWITCH[packet.group_id.toString()][options[1]] = true;
    }
    if (GROUP_PLUGIN_SWITCH[packet.group_id.toString()][options[1]] === true) {
        var msg = "指定的插件已处于启用状态, 无需重复启用.";
    } else {
        var msg = "已启用指定插件.";
        GROUP_PLUGIN_SWITCH[packet.group_id.toString()][options[1]] = true;
    }
    config.write("GLOBAL", GROUP_PLUGIN_SWITCH, "GROUP_PLUGIN_SWITCH");
    message.prepare(packet, msg, true).send();
}

function disable(packet) {
    /* 检查权限 */
    if (config.checkPermission(packet) === false) {
        return false;
    }
    var GROUP_PLUGIN_SWITCH = config.get("GLOBAL", "GROUP_PLUGIN_SWITCH");
    var PLUGIN_REGISTRY = config.get("GLOBAL", "PLUGIN_REGISTRY");
    var options = cqcode.decode(packet.message).pureText.split(" ");
    if (typeof (PLUGIN_REGISTRY[options[1]]) === "undefined") {
        var msg = "指定的插件不存在.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (typeof (GROUP_PLUGIN_SWITCH[packet.group_id.toString()]) === "undefined") {
        GROUP_PLUGIN_SWITCH[packet.group_id.toString()] = {};
    }
    if (GROUP_PLUGIN_SWITCH[packet.group_id.toString()][options[1]] === false) {
        var msg = "指定的插件已处于禁用状态, 无需重复禁用.";
    } else {
        var msg = "已禁用指定插件.";
        GROUP_PLUGIN_SWITCH[packet.group_id.toString()][options[1]] = false;
    }
    config.write("GLOBAL", GROUP_PLUGIN_SWITCH, "GROUP_PLUGIN_SWITCH");
    message.prepare(packet, msg, true).send();
}

module.exports = {
    enable,
    disable
}