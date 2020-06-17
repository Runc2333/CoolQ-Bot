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
        script: "listener.js",
        handler: "listener",
        regex: "/./",
        description: "监听关键词，有匹配的消息时，将消息转发给您",
        notification: false
    });
    config.registerSuperCommand({
        command: "添加监听词",
        script: "listener.js",
        handler: "add",
        argument: "[关键词]",
        requirePermission: false,
        description: "添加一条问答，使用示例：#添加监听词 恋爱"
    });
    config.registerSuperCommand({
        command: "移除监听词",
        script: "listener.js",
        handler: "remove",
        argument: "[关键词]",
        requirePermission: false,
        description: "移除一条问答，使用示例：#移除监听词 恋爱"
    });
    config.registerSuperCommand({
        command: "显示我的监听词",
        script: "listener.js",
        handler: "displayMine",
        requirePermission: false,
        description: "显示您所注册的所有监听词，使用示例：#显示我的监听词"
    });
    config.registerSuperCommand({
        command: "显示本群监听词",
        script: "listener.js",
        handler: "displayAll",
        requirePermission: true,
        description: "显示本群成员注册的所有监听词，使用示例：#显示本群监听词"
    });
    if (config.get("LISTENER") === false) {
        var data = {};
        data["GROUPS_CONFIGURATIONS"] = {};
        config.write("LISTENER", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "LISTENER", "INFO");
    }
}

function listener(packet) {
    if (packet.message_type === "group") {
        var GROUPS_CONFIGURATIONS = config.get("LISTENER", "GROUPS_CONFIGURATIONS");
        var GROUP_CONFIGURATION = GROUPS_CONFIGURATIONS[packet.group_id.toString()];
        if (typeof (GROUP_CONFIGURATION) === "undefined") {
            return false;
        }
        var USER_CONFIGURATION = GROUP_CONFIGURATION[packet.sender.user_id];
        if (typeof (USER_CONFIGURATION) === "undefined") {
            return false;
        }
        for (key in USER_CONFIGURATION) {
            var target = USER_CONFIGURATION[key];//替换掉正则表达式字符串里的机器人名字 同时转化为正则表达式对象
            if (packet.message.indexOf(target) !== -1) {
                let msg = `在群组<${packet.group_id}>触发了关键词<${target}>.\n发送者：<${packet.sender.user_id}>\n原始信息：\n${packet.message}`
                message.send("private", packet.sender.user_id, msg);
            }
        }
    }
}

function add(packet) {
    var keyword = cqcode.decode(packet.message).pureText.replace(/^#添加监听词 */, "")
    if (keyword === undefined) {
        var msg = "[Listener] 请提供一个监听词.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var GROUPS_CONFIGURATIONS = config.get("LISTENER", "GROUPS_CONFIGURATIONS");
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id.toString()]) === "undefined") {
        GROUPS_CONFIGURATIONS[packet.group_id.toString()] = {};
    }
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id.toString()][packet.sender.user_id]) === "undefined"){
        GROUPS_CONFIGURATIONS[packet.group_id.toString()][packet.sender.user_id] = [];
    }
    GROUPS_CONFIGURATIONS[packet.group_id.toString()][packet.sender.user_id].push(keyword);
    config.write("LISTENER", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    var msg = "[Listener] 已成功注册监听词，触发监听词的消息将被转发给您.";
    message.prepare(packet, msg, true).send();
}

function remove(packet) {
    /* 检查权限 */
    if (message.checkPermission(packet) === false) {
        return false;
    }
    var keyword = cqcode.decode(packet.message).pureText.replace(/^#移除监听词 */, "")
    var GROUPS_CONFIGURATIONS = config.get("LISTENER", "GROUPS_CONFIGURATIONS");
    var GROUP_CONFIGURATION = GROUPS_CONFIGURATIONS[packet.group_id.toString()];
    if (typeof (GROUP_CONFIGURATION) === "undefined") {
        var msg = "[Listener] 您未注册任何监听词.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var USER_CONFIGURATION = GROUP_CONFIGURATION[packet.sender.user_id];
    if (typeof (USER_CONFIGURATION) === "undefined") {
        var msg = "[Listener] 您未注册任何监听词.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var pendingDeleteIndex = GROUPS_CONFIGURATIONS[packet.group_id.toString()][packet.sender.user_id].indexOf(keyword);
    if (typeof (pendingDeleteIndex) === -1) {
        var msg = "[Listener] 指定的监听词不存在.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    GROUPS_CONFIGURATIONS[packet.group_id.toString()][packet.sender.user_id].splice(pendingDeleteIndex, 1);
    if (Object.keys(GROUPS_CONFIGURATIONS[packet.group_id.toString()][packet.sender.user_id]).length === 0) {
        delete GROUPS_CONFIGURATIONS[packet.group_id.toString()][packet.sender.user_id];
    }
    if (Object.keys(GROUPS_CONFIGURATIONS[packet.group_id.toString()]).length === 0) {
        delete GROUPS_CONFIGURATIONS[packet.group_id.toString()];
    }
    config.write("LISTENER", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    var msg = "[Listener] 已移除指定的监听词.";
    message.prepare(packet, msg, true).send();
}

function displayMine(packet) {
    var GROUP_CONFIGURATION = config.get("LISTENER", "GROUPS_CONFIGURATIONS")[packet.group_id.toString()];
    if (typeof (GROUP_CONFIGURATION) === "undefined") {
        var msg = "[Listener] 您未注册任何监听词.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var USER_CONFIGURATION = GROUP_CONFIGURATION[packet.sender.user_id];
    if (typeof (USER_CONFIGURATION) === "undefined") {
        var msg = "[Listener] 您未注册任何监听词.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var msg = "以下是您目前注册的所有监听词:";
    var globalPlaceholder = new Array((msg.length) * 2 + 2).join("-");
    msg += `\n${globalPlaceholder}\n\n`;
    for (key in USER_CONFIGURATION) {
        msg += `词语：${USER_CONFIGURATION[key]}\n`;
    }
    message.prepare(packet, msg, true).send();
}

function displayAll(packet) {
    var GROUP_CONFIGURATION = config.get("LISTENER", "GROUPS_CONFIGURATIONS")[packet.group_id.toString()];
    if (typeof (GROUP_CONFIGURATION) === "undefined") {
        var msg = "[Listener] 群组内未注册任何监听词.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var msg = "以下是群组内目前注册的所有监听词:";
    var globalPlaceholder = new Array((msg.length) * 2 + 2).join("-");
    msg += `\n${globalPlaceholder}\n\n`;
    for (key in GROUP_CONFIGURATION) {
        msg += `用户<${key}>所注册的关键词: \n`;
        for (key2 in GROUP_CONFIGURATION[key]) {
            msg += `词语：${GROUP_CONFIGURATION[key][key2]}\n`;
        }
    }
    message.prepare(packet, msg, true).send();
}

module.exports = {
    init,
    listener,
    add,
    remove,
    displayMine,
    displayAll,
}