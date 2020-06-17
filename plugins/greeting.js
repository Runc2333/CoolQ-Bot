/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, privateMessage, discussMessage",
        script: "greeting.js",
        handler: "greeting",
        regex: "/^{BOT_NAME}$/",
        description: "赋予机器人打招呼的能力"
    });
    config.registerSuperCommand({
        command: "显示所有问候语",
        script: "greeting.js",
        handler: "display",
        description: "显示当前已添加到插件的所有问候语，使用示例：#显示所有问候语"
    });
    config.registerSuperCommand({
        command: "添加问候语",
        script: "greeting.js",
        handler: "add",
        argument: "[问候语]",
        requirePermission: true,
        description: "添加一句问候语，使用示例：#添加问候语 你好"
    });
    config.registerSuperCommand({
        command: "移除问候语",
        script: "greeting.js",
        handler: "remove",
        argument: "[问候语]",
        requirePermission: true,
        description: "删除一句问候语，使用示例：#移除问候语 你好"
    });
    if (config.get("GREETING") === false) {
        var data = {};
        data["GREETING_STRING"] = {
            "default": ["我在", "在", "欸", "在呢"]
        };
        config.write("GREETING", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "GREETING", "INFO");
    }
}

function greeting(packet) {
    var GREETING_STRING = config.get("GREETING", "GREETING_STRING");
    var greeting = GREETING_STRING.default;
    if (packet.message_type == "group") {
        if (typeof (GREETING_STRING[packet.group_id.toString()]) !== "undefined") {
            greeting = GREETING_STRING.default.concat(GREETING_STRING[packet.group_id.toString()]);
        }
    }
    var msg = `${greeting[parseInt(Math.random() * greeting.length, 10)]}`;
    message.prepare(packet, msg, true).send();
    return true;
}

function add(packet) {
    /* 检查权限 */
    if (message.checkPermission(packet) === false) {
        return false;
    }
    var STRING_TO_ADD = cqcode.decode(packet.message).pureText.replace(/^#添加问候语 */, "");
    var GREETING_STRING = config.get("GREETING", "GREETING_STRING");
    if (typeof (GREETING_STRING[packet.group_id.toString()]) === "undefined") {
        GREETING_STRING[packet.group_id.toString()] = [];
    }
    var index = GREETING_STRING[packet.group_id.toString()].indexOf(STRING_TO_ADD.toString());
    if (index === -1) {
        GREETING_STRING[packet.group_id.toString()].push(STRING_TO_ADD.toString());
        config.write("GREETING", GREETING_STRING, "GREETING_STRING");
        var msg = "[Greeting] 已添加问候语.";
    } else {
        var msg = "[Greeting] 要添加的问候语已存在.";
    }
    message.prepare(packet, msg, true).send();
    return true;
}

function remove(packet) {
    /* 检查权限 */
    if (message.checkPermission(packet) === false) {
        return false;
    }
    var STRING_TO_REMOVE = cqcode.decode(packet.message).pureText.replace(/^#移除问候语 */, "");
    var GREETING_STRING = config.get("GREETING", "GREETING_STRING");
    if (typeof (GREETING_STRING[packet.group_id.toString()]) === "undefined") {
        GREETING_STRING[packet.group_id.toString()] = [];
    }
    var index = GREETING_STRING[packet.group_id.toString()].indexOf(STRING_TO_REMOVE.toString());
    if (index !== -1) {
        GREETING_STRING[packet.group_id.toString()].splice(index, 1);
        config.write("GREETING", GREETING_STRING, "GREETING_STRING");
        var msg = "[Greeting] 已移除问候语.";
    } else {
        var msg = "[Greeting] 要移除的问候语不存在.\n如若您正在尝试移除的是一条默认问候语，则也会返回这个错误.";
    }
    message.prepare(packet, msg, true).send();
}

function display(packet) {
    var GREETING_STRING = config.get("GREETING", "GREETING_STRING");
    var greeting = GREETING_STRING.default;
    if (typeof (GREETING_STRING[packet.group_id.toString()]) !== "undefined") {
        greeting = GREETING_STRING.default.concat(GREETING_STRING[packet.group_id.toString()]);
    }
    var msg = `[Greeting] 以下是目前注册到Greeting插件的所有问候语:\n${greeting.toString()}`;
    message.prepare(packet, msg, true).send();
    return true;
}

module.exports = {
    init,
    greeting,
    add,
    remove,
    display
}