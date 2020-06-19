/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const db = require(`${processPath}/utils/database.js`);
const request = require("sync-request");//同步网络请求
const { userinfo } = require("../utils/messageApi");
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const toolbox = require(`${processPath}/utils/toolbox.js`);//常用工具箱

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, discussMessage, privateMessage",
        script: "z_performance_diagnosis.js",
        handler: "messageDiagnosis",
        regex: "/^性能诊断$/",
        description: "返回从收到消息至处理完毕所耗费的时间.",
        notification: false
    });
    config.registerSuperCommand({
        command: "性能诊断",
        script: "z_performance_diagnosis.js",
        handler: "commandDiagnosis",
        requirePermission: true,
        description: "返回从收到指令至处理完毕所耗费的时间."
    });
}

const messageDiagnosis = (packet) => {
    var msg = `本条消息处理时间：${(new Date()).getTime() - packet.time * 1000}ms`;
    message.prepare(packet, msg, true).send();
}

const commandDiagnosis = (packet) => {
    var msg = `本条指令处理时间：${(new Date()).getTime() - packet.time * 1000}ms`;
    message.prepare(packet, msg, true).send();
}

module.exports = {
    init,
    messageDiagnosis,
    commandDiagnosis,
}