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
    // //获取机器人名字
    // var BOT_NAME = config.get("GLOBAL", "BOT_NAME");
    // var BOT_QQNUM = config.get("GLOBAL", "BOT_QQNUM");
    // if (packet.message_type === "group") {
    //     var GROUPS_CONFIGURATIONS = config.get("KEYWORD", "GROUPS_CONFIGURATIONS");
    //     var GROUP_CONFIGURATION = GROUPS_CONFIGURATIONS[packet.group_id.toString()];
    //     if (typeof (GROUP_CONFIGURATION) === "undefined") {
    //         return false;
    //     }
    //     for (key in GROUP_CONFIGURATION) {
    //         var regex = eval(key.replace(/\{BOT_NAME\}/g, BOT_NAME).replace(/\{BOT_QQNUM\}/g, BOT_QQNUM));//替换掉正则表达式字符串里的机器人名字 同时转化为正则表达式对象
    //         if (regex.test(packet.message)) {
    //             var msg = GROUP_CONFIGURATION[key].replace(/&#91;/g, "[").replace(/&#93;/g, "]");
    //         }
    //     }
    // }
    // if (typeof (msg) === "undefined") {
    //     return false;
    // }
    // message.prepare(packet, msg, true).send();
}

function add(packet) {
    // /* 检查权限 */
    // if (message.checkPermission(packet) === false) {
    //     return false;
    // }
    // var options = cqcode.decode(packet.message).pureText.replace(/^#添加问答 */, "").split(" ");
    // var regex = options.shift();
    // if (regex === undefined) {
    //     var msg = "[Keyword] 请提供一个问题.";
    //     message.prepare(packet, msg, true).send();
    //     return false;
    // }
    // if (/^\/[^\/]+?\/$/.test(regex) === false) {
    //     regex = `/^${regex.replace("/", "\\/")}$/`
    // }
    // var regexMessage = options.join(" ").replace(new RegExp("\r\n", "gm"), "\n");
    // if (regexMessage == "") {
    //     var msg = "[Keyword] 请提供问题对应的回答.";
    //     message.prepare(packet, msg, true).send();
    //     return false;
    // }
    // var GROUPS_CONFIGURATIONS = config.get("KEYWORD", "GROUPS_CONFIGURATIONS");
    // if (typeof (GROUPS_CONFIGURATIONS[packet.group_id.toString()]) === "undefined") {
    //     GROUPS_CONFIGURATIONS[packet.group_id.toString()] = {};
    // }
    // GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex] = regexMessage;
    // config.write("KEYWORD", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    // var msg = "[Keyword] 已成功注册指定问答.";
    // message.prepare(packet, msg, true).send();
}

function remove(packet) {
    // /* 检查权限 */
    // if (message.checkPermission(packet) === false) {
    //     return false;
    // }
    // var options = cqcode.decode(packet.message).pureText.replace(/^#移除问答 */, "").split(" ");
    // var regex = options.shift();
    // if (/^\/[^\/]+?\/$/.test(regex) === false) {
    //     regex = `/^${regex.replace("/", "\\/")}$/`
    // }
    // var GROUPS_CONFIGURATIONS = config.get("KEYWORD", "GROUPS_CONFIGURATIONS");
    // var GROUP_CONFIGURATION = GROUPS_CONFIGURATIONS[packet.group_id.toString()];
    // if (typeof (GROUP_CONFIGURATION) === "undefined") {
    //     var msg = "[Keyword] 该群组未注册任何问答.";
    //     message.prepare(packet, msg, true).send();
    //     return false;
    // }
    // var pendingDelete = GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex];
    // if (typeof (pendingDelete) === "undefined") {
    //     var msg = "[Keyword] 指定的问答不存在.";
    //     message.prepare(packet, msg, true).send();
    //     return false;
    // }
    // delete GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex];
    // if (Object.keys(GROUPS_CONFIGURATIONS[packet.group_id.toString()]).length === 0) {
    //     delete GROUPS_CONFIGURATIONS[packet.group_id.toString()];
    // }
    // config.write("KEYWORD", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    // var msg = "[Keyword] 已移除指定的问答.";
    // message.prepare(packet, msg, true).send();
}

function display(packet) {
    // var GROUP_CONFIGURATION = config.get("KEYWORD", "GROUPS_CONFIGURATIONS")[packet.group_id.toString()];
    // if (typeof (GROUP_CONFIGURATION) === "undefined") {
    //     var msg = "[Keyword] 该群组未注册任何问答.";
    //     message.prepare(packet, msg, true).send();
    //     return false;
    // }
    // var msg = "以下是目前注册到插件的所有问答:";
    // var globalPlaceholder = new Array((msg.length) * 2 + 2).join("-");
    // msg += `\n${globalPlaceholder}\n\n`;
    // for (regex in GROUP_CONFIGURATION) {
    //     msg += `问题：${regex}\n`;
    //     msg += `回答：${GROUP_CONFIGURATION[regex]}\n\n`;
    // }
    // message.prepare(packet, msg, true).send();
}

module.exports = {
    init,
    listener,
    add,
    remove,
    display
}