/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

var token = null;
function init(t) {
    token = t;
}

function greeting(packet) {
    var msg = `${["我在", "在", "欸", "在呢"][parseInt(Math.random() * 4, 10)]}`;
    message.prepare(packet, msg, true).send();
    return true;
}

module.exports = {
    init,
    greeting,
}