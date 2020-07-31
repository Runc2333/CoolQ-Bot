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

function displayHelpInfo(packet) {
    message.prepare(packet, `请查阅这份使用说明：\nhttp://elderlybot.mobilex5.com/help`, true).send();
    return true;
}

function displayPluginInfo(packet) {
    message.prepare(packet, `推荐使用网页控制台对老人机进行管理.\nhttp://elderlybot.mobilex5.com/auth/link?callback=/user/configureGroup/pluginSwitch?groupId=${packet.group_id}`, true).send();
    return true;
}

module.exports = {
    init,
    displayHelpInfo,
    displayPluginInfo,
}