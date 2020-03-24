/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);
const cqcode = require(`${processPath}/utils/CQCodeEncoder.js`);

function init() {
    config.registerPlugin({
        type: "groupMessage",
        script: "greeting.js",
        handler: "greeting",
        regex: "/^{BOT_NAME}$/",
        description: "赋予机器人打招呼的能力~"
    });
    config.registerPlugin({
        type: "privateMessage",
        script: "greeting.js",
        handler: "greeting",
        regex: "/^{BOT_NAME}$/",
        description: "赋予机器人打招呼的能力~"
    });
    config.registerPlugin({
        type: "discussMessage",
        script: "greeting.js",
        handler: "greeting",
        regex: "/^{BOT_NAME}$/",
        description: "赋予机器人打招呼的能力~"
    });
    if (config.get("GREETING") === false) {
        var data = {};
        data["GREETING_STRING"] = ["我在", "在", "欸", "在呢", "什么事？", "一直都在"];
        config.write("GREETING", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "GREETING", "INFO");
    }
}

function greeting(packet) {
    var greeting = config.get("GREETING", "GREETING_STRING");
    var msg = `${greeting[parseInt(Math.random() * greeting.length, 10)]}`;
    switch (packet.message_type) {
        case "group":
            var msg = `${cqcode.at(packet.sender.user_id)} ${msg}`;
            var uid = packet.group_id;
            break;
        case "private":
            var uid = packet.user_id;
            break;
        case "discuss":
            var uid = packet.discuss_id;
            break;
        default:
            log.write("处理失败:传入的参数类型不受支持.", "GREETING", "WARNING");
            return false;
    }
    message.send(packet.message_type, uid, msg);
}

module.exports = {
    init,
    greeting
}