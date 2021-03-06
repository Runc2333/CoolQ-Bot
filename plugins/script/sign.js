/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const Database = require("better-sqlite3"); // SQLite3驱动程序
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const db = require(`${processPath}/utils/database.js`);
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, privateMessage, discussMessage",
        script: "sign.js",
        handler: "sign",
        regex: "/(^签到|签到$)/",
        description: "签到吗大兄弟"
    });
}

const signDb = db.getDatabase("sign");

function sign(packet) {
    // message.prepare(packet, `签到成功，你🐎死了。`, true).send();
    return true;
}

module.exports = {
    init,
    sign
}