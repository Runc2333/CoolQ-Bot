/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

token = null;
function init(t) {
    token = t;
}

function perfunctory(packet) {
    if (packet.user_id == "3249261318") {
        var msg = '喔'.repeat(Math.round(Math.random() * 3) + 1);
        message.prepare(packet, msg, true).send();
        return true;
    }
    if (packet.user_id == "45986494") {
        var msg = '抱'.repeat(Math.round(Math.random() * 3) + 1);
        message.prepare(packet, msg, true).send();
        return true;
    }
    return false;
}

module.exports = {
    init,
    perfunctory,
}