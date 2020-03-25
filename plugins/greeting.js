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
        description: "赋予机器人打招呼的能力~"
    });
    config.registerSuperCommand({
        command: "greeting",
        script: "greeting.js",
        handler: "command",
        argument: "[action]",
        description: "Greeting插件入口, 以下是参数说明:\n[action]:\nenable|disable - 启用或禁用Greeting插件.#admin\nadd|remove [string] - 添加或删除一句问候语.#admin\ndisplay - 显示当前注册到插件的问候语."
    });
    if (config.get("GREETING") === false) {
        var data = {};
        data["GREETING_STRING"] = ["我在", "在", "欸", "在呢", "什么事？", "一直都在"];
        data["DISABLE_GROUPS"] = [];
        config.write("GREETING", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "GREETING", "INFO");
    }
}

function greeting(packet) {
    if (packet.message_type === "group") {
        var DISABLE_GROUPS = config.get("GREETING", "DISABLE_GROUPS");
        var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());
        if (index !== -1) {
            return false;
        }
    }
    var greeting = config.get("GREETING", "GREETING_STRING");
    var msg = `${greeting[parseInt(Math.random() * greeting.length, 10)]}`;
    message.prepare(packet, msg, true).send();
}

function command(packet) {
    var options = cqcode.decode(packet.message).pureText.split(" ");
    switch (options[1]) {
        case "enable":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[Greeting] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var DISABLE_GROUPS = config.get("GREETING", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index !== -1) {
                //处于禁用状态
                DISABLE_GROUPS.splice(index, 1);
                config.write("GREETING", DISABLE_GROUPS, "DISABLE_GROUPS");
                var msg = "[Greeting] 已启用.";
            } else {
                //处于启用状态
                var msg = "[Greeting] 已经是启用状态了, 无需重复启用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "disable":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[Greeting] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var DISABLE_GROUPS = config.get("GREETING", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index === -1) {
                //处于启用状态
                DISABLE_GROUPS.push(packet.group_id.toString());
                config.write("GREETING", DISABLE_GROUPS, "DISABLE_GROUPS");
                var msg = "[Greeting] 已禁用.";
            } else {
                //处于禁用状态
                var msg = "[Greeting] 已经是禁用状态了, 无需重复禁用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "add":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[Greeting] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var GREETING_STRING = config.get("GREETING", "GREETING_STRING");
            var index = GREETING_STRING.indexOf(options[2].toString());
            if (index === -1) {
                GREETING_STRING.push(options[2].toString());
                config.write("GREETING", GREETING_STRING, "GREETING_STRING");
                var msg = "[Greeting] 已添加问候语.";
            } else {
                var msg = "[Greeting] 要添加的问候语已存在.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "remove":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[Greeting] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var GREETING_STRING = config.get("GREETING", "GREETING_STRING");
            var index = GREETING_STRING.indexOf(options[2].toString());
            if (index !== -1) {
                GREETING_STRING.splice(index, 1);
                config.write("GREETING", GREETING_STRING, "GREETING_STRING");
                var msg = "[Greeting] 已移除问候语.";
            } else {
                var msg = "[Greeting] 要移除的问候语不存在.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "display":
            var GREETING_STRING = config.get("GREETING", "GREETING_STRING");
            var msg = `[Greeting] 以下是目前注册到Greeting插件的所有问候语:\n\n${GREETING_STRING.toString()}`;
            message.prepare(packet, msg, true).send();
            break;
        default:
            log.write("处理失败:未知指令.", "GREETING", "WARNING");
            var msg = "[Greeting] 未知指令.";
            message.prepare(packet, msg, true).send();
            return false;
    }
}

module.exports = {
    init,
    greeting,
    command
}