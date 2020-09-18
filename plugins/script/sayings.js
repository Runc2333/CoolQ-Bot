/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const fs = require("fs");//文件系统读写
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const toolbox = require(`${processPath}/utils/toolbox.js`);//CQ码编解码器

var token = null;
function init(t) {
    token = t;
}

function sayings(packet) {
    var sayingsByAiren = fs.readdirSync(`${processPath}/images/sayingsByAiren`);
    if (/爱人[曰言].+?次/.test(packet.message)) {
        var times = toolbox.chineseToNumber(packet.message.match(/(?<=爱人[曰言]).+?(?=次)/)[0]);
        if (!times) {
            message.prepare(packet, `你会说话吗？`, true).send();
            return true;
        }
        if (times > 5) {
            message.prepare(packet, `让爱人曰这么多次你咋不上天呢？你能一次曰${times}次吗？`, true).send();
            return true;
        }
    } else if (!(/^爱人[曰言]$/.test(packet.message))) {
        return false;
    } else {
        var times = 1;
    }
    for (i = 0; i < times; i++) {
        var picSeqToSend = Math.floor(Math.random() * sayingsByAiren.length);
        var picToSend = `file:///${processPath}/images/sayingsByAiren/${sayingsByAiren[picSeqToSend]}`;
        message.prepare(packet, `${cqcode.image(picToSend)}`, true).send();
    }
    return true;
}

module.exports = {
    init,
    sayings
}