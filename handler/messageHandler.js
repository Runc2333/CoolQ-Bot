/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志

/* 事件处理程序 */
function handle(packet) {
    console.log(packet);
    //获取机器人名字
    var BOT_NAME = config.get("GLOBAL", "BOT_NAME");
    switch (packet.message_type) {
        case "group":
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

            break;
        case "discuss":

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