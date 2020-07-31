/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口

function handle(packet) {
    var superCommand = cqcode.decode(packet.message).pureText.replace("#", "");
    var SUPER_COMMAND_REGISTRY = config.getRegistry()["SUPER_COMMAND_REGISTRY"];
    var userPermission = message.getPermission(packet);
    SUPER_COMMAND_REGISTRY.forEach((item) => {
        if ((new RegExp(`^${item.command}`)).test(superCommand) && config.isEnable(packet, item.plugin)) {
            if (userPermission >= item.permission) {
                if (typeof (item.arguments) === "object") {
                    var requiredArgument = [];
                    item.arguments.forEach((argument) => {
                        if (argument.required) {
                            requiredArgument.push(argument);
                        }
                    });
                    var argumentsRaw = packet.message.replace(new RegExp(`^#${item.command}_`), "");
                    if ((new RegExp(`^#${item.command}`)).test(argumentsRaw)) {
                        message.prepare(packet, `指令无法执行，原因：请使用_分割参数`, true).send();
                        return false;
                    }
                    var arguments = argumentsRaw.split("_");
                    arguments.forEach((v, i, a) => {
                        if (!v) {
                            arguments.splice(i, 1);
                        }
                    });
                    if (arguments.length > item.arguments.length) {
                        // arguments.push(arguments.splice(-arguments.length - item.arguments.length));
                        var tmp = arguments.slice(0, item.arguments.length - 1);
                        tmp.push(arguments.slice(item.arguments.length - 1).join("_"));
                        arguments = tmp;
                    } else if (arguments.length < requiredArgument.length) {
                        message.prepare(packet, `指令无法执行，原因：缺少参数 [${requiredArgument[arguments.length].name}].`, true).send();
                        return false;
                    }
                }
                log.write(`重定向到[${item.alias}]处理`, "SuperCommandHandler", "INFO");
                if (typeof (item.identifier) === "undefined") {
                    if (typeof (arguments) === "object") {
                        require(item.script)[item.handler](packet, arguments);
                    } else {
                        require(item.script)[item.handler](packet);
                    }
                } else {
                    if (typeof (arguments) === "object") {
                        require(item.script)[item.handler](item.identifier, packet, arguments);
                    } else {
                        require(item.script)[item.handler](item.identifier, packet);
                    }
                }
                return true;
            } else {
                message.prepare(packet, `指令无法执行，原因：权限不足.`, true).send();
                log.write(`命令匹配[${item.alias}]，但使用者权限不足，已拒绝处理.`, "SuperCommandHandler", "INFO");
                return true;
            }
        }
    });
}

module.exports = {
    handle
}