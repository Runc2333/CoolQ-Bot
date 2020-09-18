/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
/* 事件处理程序 */
const superCommandHandler = require(`${processPath}/systemPlugin/superCommand.js`);

function handle(packet, systemToken) {
    switch (packet.message_type) {
        case "group":
            log.write(`<${packet.group_id}> - <${packet.sender.nickname}(${packet.sender.user_id})>: ${packet.message}`, "收到群组消息", "INFO");
            /* 判断是否交给SuperCommandHandler处理 */
            if (/^#/.test(cqcode.decode(packet.message).pureText)) {
                log.write("重定向到superCommand.js处理.", "MAIN THREAD", "INFO");
                superCommandHandler.handle(packet);
                return true;//中断处理
            }
            var messageType = "GROUP_MESSAGE";
            break;
        case "private":
            log.write(`<${packet.sender.nickname}(${packet.sender.user_id})>: ${packet.message}`, "收到私聊消息", "INFO");
            var messageType = "PRIVATE_MESSAGE";
            break;
        case "discuss":
            log.write(`<${packet.discuss_id}> - <${packet.sender.nickname}(${packet.sender.user_id})>: ${packet.message}`, "收到讨论组消息", "INFO");
            var messageType = "DISCUSS_MESSAGE";
            break;
        default:
            log.write("遇到了未定义的事件.", "MessageHandler", "WARNING");
            console.log(packet);
            return false;
    }
    /* 交给注册的插件处理 */
    var skipSignalReceived = false;
    var forceSkipReceived = false;
    var registry = config.getRegistry().MESSAGE_REGISTRY[messageType];
    registry.forEach((v) => {
        if (forceSkipReceived) {
            return false;
        }
        if (skipSignalReceived && v.skipable === true) {
            return false;
        }
        if ((new RegExp(v.regexp)).test(packet.message) && config.isEnable(packet, v.plugin)) {
            if (!v.silent) {
                log.write(`重定向到[${v.alias}]处理`, "MessageHandler", "INFO");
            }
            if (typeof (v.identifier) === "undefined") {
                var skipSignal = require(v.script)[v.handler](packet);
            } else {
                var skipSignal = require(v.script)[v.handler](v.identifier, packet);
            }
            if (skipSignal === true) {
                // log.write(`[${v.alias}]已发出中断信号`, "MessageHandler", "INFO");
                skipSignalReceived = true;
            } else if (skipSignal === "forceskip") {
                // log.write(`[${v.alias}]已发出强制中断信号`, "MessageHandler", "INFO");
                forceSkipReceived = true;
            }
        }
    });
}

module.exports = {
    handle
}