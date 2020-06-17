/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
/* 事件处理程序 */
const superCommandHandler = require(`${processPath}/systemPlugin/superCommand.js`);

function handle(packet) {
    //获取机器人名字
    var BOT_NAME = config.get("GLOBAL", "BOT_NAME");
    var BOT_QQNUM = config.get("GLOBAL", "BOT_QQNUM");
    switch (packet.message_type) {
        case "group":
            log.write(`<${packet.group_id}> - <${packet.sender.nickname}>: ${packet.message}.`, "收到群组消息", "INFO");
            /* 判断是否交给SuperCommandHandler处理 */
            if (/^#/.test(cqcode.decode(packet.message).pureText)) {
                log.write("重定向到superCommand.js处理.", "MAIN THREAD", "INFO");
                superCommandHandler.handle(packet);
                return true;//中断处理
            }
            var messageType = "GROUP_MESSAGE";
            break;
        case "private":
            log.write(`<${packet.sender.nickname}>: ${packet.message}.`, "收到私聊消息", "INFO");
            var messageType = "PRIVATE_MESSAGE";
            break;
        case "discuss":
            log.write(`<${packet.discuss_id}> - <${packet.sender.nickname}>: ${packet.message}.`, "收到讨论组消息", "INFO");
            var messageType = "DISCUSS_MESSAGE";
            break;
        default:
            log.write("遇到了未定义的事件.", "MessageHandler", "WARNING");
            console.log(packet);
            return false;
    }
    /* 交给注册的插件处理 */
    var registeredPlugins = config.get("GLOBAL", "MESSAGE_REGISTRY")[messageType];
    var GROUP_PLUGIN_SWITCH = config.get("GLOBAL", "GROUP_PLUGIN_SWITCH");
    for (key in registeredPlugins) {
        if (typeof (GROUP_PLUGIN_SWITCH[packet.group_id]) !== "undefined") {
            if (GROUP_PLUGIN_SWITCH[packet.group_id.toString()][registeredPlugins[key].script] !== false) {
                var regex = eval(registeredPlugins[key].regex.replace(/\{BOT_NAME\}/g, BOT_NAME).replace(/\{BOT_QQNUM\}/g, BOT_QQNUM));//替换掉正则表达式字符串里的机器人名字 同时转化为正则表达式对象
                // console.log(regex);
                if (regex.test(packet.message)) {
                    if (registeredPlugins[key].notification !== false) {
                        log.write(`重定向到${registeredPlugins[key].script}处理`, "MessageHandler", "INFO");
                    }
                    if (require(`${processPath}/plugins/${registeredPlugins[key].script}`)[registeredPlugins[key].handler](packet) === true) {
                        return false;
                    }//把请求转发给注册的插件处理
                }
            }
        } else {
            var regex = eval(registeredPlugins[key].regex.replace(/\{BOT_NAME\}/g, BOT_NAME).replace(/\{BOT_QQNUM\}/g, BOT_QQNUM));//替换掉正则表达式字符串里的机器人名字 同时转化为正则表达式对象
            // console.log(regex);
            if (regex.test(packet.message)) {
                if (registeredPlugins[key].notification !== false) {
                    log.write(`重定向到${registeredPlugins[key].script}处理`, "MessageHandler", "INFO");
                }
                if (require(`${processPath}/plugins/${registeredPlugins[key].script}`)[registeredPlugins[key].handler](packet) === true) {
                    return false;
                }//把请求转发给注册的插件处理
            }
        }
    }
}

module.exports = {
    handle
}