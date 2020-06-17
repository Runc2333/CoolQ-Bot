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
        script: "divination.js",
        handler: "divination",
        regex: "/(^占卜|占卜$|^抽签|抽签$)/",
        description: "抽一张签"
    });
}

function divination(packet) {
    var divinations = fs.readdirSync(`${processPath}/images/divination`);
    var picSeqToSend = Math.floor(Math.random() * (divinations.length - 0 + 1) + 0)
    var picToSend = `file:///${processPath}/images/divination/${divinations[picSeqToSend]}`;
    message.prepare(packet, `抽签成功！\n${cqcode.image(picToSend)}`, true).send();
    return true;
}

module.exports = {
    init,
    divination
}