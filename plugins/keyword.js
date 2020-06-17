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
        description: "匹配关键词，发送指定内容(问答功能)",
        notification: false
    });
    config.registerSuperCommand({
        command: "添加问答",
        script: "keyword.js",
        handler: "add",
        argument: "[问题] [回答]",
        requirePermission: true,
        description: "添加一条问答，使用示例：#添加问答 谁是最帅的人？ 当然是机器人的爸爸啦~\n详细使用说明请参考：https://sharechain.qq.com/6ea24a767fea4895f930497f3d397b41"
    });
    config.registerSuperCommand({
        command: "移除问答",
        script: "keyword.js",
        handler: "remove",
        argument: "[问题]",
        requirePermission: true,
        description: "移除一条问答，使用示例：#移除问答 谁是最帅的人？\n详细使用说明请参考：https://sharechain.qq.com/6ea24a767fea4895f930497f3d397b41"
    });
    config.registerSuperCommand({
        command: "显示所有问答",
        script: "keyword.js",
        handler: "display",
        description: "显示已经添加到插件的所有问答，使用示例：#显示所有问答"
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
                var msg = GROUP_CONFIGURATION[key].replace(/&#91;/g, "[").replace(/&#93;/g, "]");
            }
        }
    }
    if (typeof (msg) === "undefined") {
        return false;
    }
    message.prepare(packet, msg, true).send();
}

function add(packet) {
    /* 检查权限 */
    if (message.checkPermission(packet) === false) {
        return false;
    }
    var options = packet.message.replace(/^#添加问答 */, "").split(" ");
    var regex = options.shift();
    if (regex === undefined) {
        var msg = "[Keyword] 请提供一个问题.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (/^\/[^\/]+?\/$/.test(regex) === false) {
        regex = `/^${regex.replace("/", "\\/")}$/`
    }
    var regexMessage = options.join(" ").replace(new RegExp("\r\n", "gm"), "\n");
    if (regexMessage == "") {
        var msg = "[Keyword] 请提供问题对应的回答.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var GROUPS_CONFIGURATIONS = config.get("KEYWORD", "GROUPS_CONFIGURATIONS");
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id.toString()]) === "undefined") {
        GROUPS_CONFIGURATIONS[packet.group_id.toString()] = {};
    }
    GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex] = regexMessage;
    config.write("KEYWORD", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    var msg = "[Keyword] 已成功注册指定问答.";
    message.prepare(packet, msg, true).send();
}

function remove(packet) {
    /* 检查权限 */
    if (message.checkPermission(packet) === false) {
        return false;
    }
    var options = packet.message.replace(/^#移除问答 */, "").split(" ");
    var regex = options.shift();
    if (/^\/[^\/]+?\/$/.test(regex) === false) {
        regex = `/^${regex.replace("/", "\\/")}$/`
    }
    var GROUPS_CONFIGURATIONS = config.get("KEYWORD", "GROUPS_CONFIGURATIONS");
    var GROUP_CONFIGURATION = GROUPS_CONFIGURATIONS[packet.group_id.toString()];
    if (typeof (GROUP_CONFIGURATION) === "undefined") {
        var msg = "[Keyword] 该群组未注册任何问答.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var pendingDelete = GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex];
    if (typeof (pendingDelete) === "undefined") {
        var msg = "[Keyword] 指定的问答不存在.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    delete GROUPS_CONFIGURATIONS[packet.group_id.toString()][regex];
    if (Object.keys(GROUPS_CONFIGURATIONS[packet.group_id.toString()]).length === 0) {
        delete GROUPS_CONFIGURATIONS[packet.group_id.toString()];
    }
    config.write("KEYWORD", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    var msg = "[Keyword] 已移除指定的问答.";
    message.prepare(packet, msg, true).send();
}

function display(packet) {
    var GROUP_CONFIGURATION = config.get("KEYWORD", "GROUPS_CONFIGURATIONS")[packet.group_id.toString()];
    if (typeof (GROUP_CONFIGURATION) === "undefined") {
        var msg = "[Keyword] 该群组未注册任何问答.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var msg = "以下是目前注册到插件的所有问答:";
    var globalPlaceholder = new Array((msg.length) * 2 + 2).join("-");
    msg += `\n${globalPlaceholder}\n\n`;
    for (regex in GROUP_CONFIGURATION) {
        msg += `问题：${regex}\n`;
        msg += `回答：${GROUP_CONFIGURATION[regex]}\n\n`;
    }
    message.prepare(packet, msg, true).send();
}

module.exports = {
    init,
    keyword,
    add,
    remove,
    display
}