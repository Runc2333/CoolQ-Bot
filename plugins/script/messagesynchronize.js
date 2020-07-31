/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const async_request = require('request');//异步网络请求
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

var token = null;
function init(t) {
    token = t;
}

var sync_cache = {
    "930458423": "1148034361",
    "1148034361": "930458423"
}

function sync(packet) {
    if (typeof (sync_cache[packet.group_id.toString()]) !== "undefined") {
        if (packet.message.indexOf("[CQ:record") === -1) {
            message.send("group", sync_cache[packet.group_id], `${packet.sender.title == "" ? "" : `【${packet.sender.title}】`}${packet.sender.card == "" ? packet.sender.nickname : packet.sender.card}(${packet.user_id}):\n${packet.message}\n此消息来自<${packet.group_id}>`);
        } else {
            message.send("group", sync_cache[packet.group_id], `${packet.sender.title == "" ? "" : `【${packet.sender.title}】`}${packet.sender.card == "" ? packet.sender.nickname : packet.sender.card}(${packet.user_id}):\n[语音]`);
            message.send("group", sync_cache[packet.group_id], packet.message);
        }
        return true;
    } else {
        return false;
    }
}

module.exports = {
    init,
    sync,
}