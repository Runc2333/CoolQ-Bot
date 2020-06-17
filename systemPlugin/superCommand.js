const { enableAlwaysReply } = require("../plugins/z_chatbot");

/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口

function handle(packet) {
    if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
        var userPermission = false;
    } else {
        var userPermission = true;
    }
    var superCommand = cqcode.decode(packet.message).pureText.replace("#", "");
    var regeistedSuperCommand = config.get("GLOBAL", "SUPER_COMMAND_REGISTRY");
    for (key in regeistedSuperCommand) {
        if (regeistedSuperCommand[key].requirePermission === true) {
            if (userPermission === true) {
                var regex = eval(`/^${key}/`)
                if (regex.test(superCommand)) {
                    log.write(`重定向到${regeistedSuperCommand[key].script}处理`, "SuperCommandHandler", "INFO");
                    require(`${process.cwd().replace(/\\/g, "/")}/plugins/${regeistedSuperCommand[key].script}`)[regeistedSuperCommand[key].handler](packet);
                }
            } else {
                log.write(`命令匹配，但使用者权限不足，已拒绝处理.`, "SuperCommandHandler", "INFO");
            }
        } else {
            var regex = eval(`/^${key}/`)
            if (regex.test(superCommand)) {
                log.write(`重定向到${regeistedSuperCommand[key].script}处理`, "SuperCommandHandler", "INFO");
                require(`${process.cwd().replace(/\\/g, "/")}/plugins/${regeistedSuperCommand[key].script}`)[regeistedSuperCommand[key].handler](packet);
            }
        }
    }
}

module.exports = {
    handle
}