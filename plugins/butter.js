/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const fs = require("fs");//文件系统读写
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, privateMessage, discussMessage",
        script: "butter.js",
        handler: "butter",
        regex: "/(^来点色图$)/",
        description: "看涩图吗大兄弟"
    });
}

function butter(packet) {
    var butters = fs.readdirSync(`${processPath}/images/butter`);
    var butterSeqToSend = Math.floor(Math.random() * (butters.length - 0 + 1) + 0)
    var picToSend = `file:///${processPath}/images/butter/${butters[butterSeqToSend]}`;
    message.prepare(packet, `${cqcode.image(picToSend)}`, true).send();
}

module.exports = {
    init,
    butter
}