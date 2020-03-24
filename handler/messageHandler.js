/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
/* 事件处理程序 */
const superCommandHandler = require(`${processPath}/systemPlugin/superCommand.js`);

/* 事件处理程序 */
function handle(packet) {
    // console.log(packet);
    //获取机器人名字
    var BOT_NAME = config.get("GLOBAL", "BOT_NAME");
    switch (packet.message_type) {
        case "group":
            log.write(`<${packet.group_id}> - <${packet.sender.nickname}>: ${packet.message}.`, "收到群组消息", "INFO");
            if (/^\//.test(cqcode.decode(packet.message).pureText)) {
                log.write("重定向到superCommand.js处理.", "MAIN THREAD", "INFO");
                superCommandHandler.handle(packet);
                return true;
            }
            var registeredPlugins = config.get("GLOBAL", "GROUP_MESSAGE_REGISTRY");
            for (key in registeredPlugins) {
                var regex = eval(registeredPlugins[key].regex.replace(/\{BOT_NAME\}/g, BOT_NAME));//替换掉正则表达式字符串里的机器人名字 同时转化为正则表达式对象
                if (regex.test(packet.message)) {
                    log.write(`重定向到${key}处理`, "MessageHandler", "INFO");
                    require(`${processPath}/plugins/${key}`)[registeredPlugins[key].handler](packet);//把请求转发给注册的插件处理
                }
            }
            break;
        case "private":
            log.write(`<${packet.sender.nickname}>: ${packet.message}.`, "收到私聊消息", "INFO");
            var registeredPlugins = config.get("GLOBAL", "PRIVATE_MESSAGE_REGISTRY");
            for (key in registeredPlugins) {
                var regex = eval(registeredPlugins[key].regex.replace(/\{BOT_NAME\}/g, BOT_NAME));//替换掉正则表达式字符串里的机器人名字 同时转化为正则表达式对象
                if (regex.test(packet.message)) {
                    log.write(`重定向到${key}处理`, "MessageHandler", "INFO");
                    require(`${processPath}/plugins/${key}`)[registeredPlugins[key].handler](packet);//把请求转发给注册的插件处理
                }
            }
            break;
        case "discuss":
            log.write(`<${packet.discuss_id}> - <${packet.sender.nickname}>: ${packet.message}.`, "收到讨论组消息", "INFO");
            var registeredPlugins = config.get("GLOBAL", "DISCUSS_MESSAGE_REGISTRY");
            for (key in registeredPlugins) {
                var regex = eval(registeredPlugins[key].regex.replace(/\{BOT_NAME\}/g, BOT_NAME));//替换掉正则表达式字符串里的机器人名字 同时转化为正则表达式对象
                if (regex.test(packet.message)) {
                    log.write(`重定向到${key}处理`, "MessageHandler", "INFO");
                    require(`${processPath}/plugins/${key}`)[registeredPlugins[key].handler](packet);//把请求转发给注册的插件处理
                }
            }
            break;
        default:
            log.write("遇到了未定义的事件.", "MessageHandler", "WARNING");
            console.log(packet);
            break;
    }
}

module.exports = {
    handle
}