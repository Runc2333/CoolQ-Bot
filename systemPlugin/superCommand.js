/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志

function handle(packet) {
    var superCommand = cqcode.decode(packet.message).pureText.match(/(?<=^\/).+/i)[0].split(" ")[0];
    var regeistedSuperCommand = config.get("GLOBAL", "SUPER_COMMAND_REGISTRY");
    for (key in regeistedSuperCommand) {
        if (superCommand == key) {
            log.write(`重定向到${regeistedSuperCommand[key].script}处理`, "SuperCommandHandler", "INFO");
            require(`${process.cwd().replace(/\\/g, "/")}/plugins/${regeistedSuperCommand[key].script}`)[regeistedSuperCommand[key].handler](packet);
        }
    }
}

module.exports = {
    handle
}