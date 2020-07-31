/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const lodash = require("lodash");
const pinyin = require("pinyin");// 汉字转拼音
const async_request = require('request');//异步网络请求
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const toolbox = require(`${processPath}/utils/toolbox.js`);

const BOT_QQNUM = config.sys("BOT_QQNUM");

var token = null;
function init(t) {
    token = t;
}

function generate(packet) {
    if (packet.message_type !== "private") {
        message.prepare(packet, `请私聊使用本指令.`).send();
    }
    var tokenToSend = toolbox.randomString(128);
    var expire = Math.round((new Date()).getTime() / 1000 + 3600);
    config.write({
        token: token,
        table: "global-token",
        data: {
            elderlyBotNum: BOT_QQNUM,
            userId: packet.user_id,
            userNickname: packet.sender.nickname,
            token: tokenToSend,
            expire: expire,
            used: false
        },
        callback: (r) => {
            if (r.code === 0) {
                message.prepare(packet, `#START ELDERLY BOT TOKEN#\n${tokenToSend}\n#END EDLERLY BOT TOKEN#`).send();
                message.prepare(packet, `请粘贴此Token至网页控制面板，地址:\nhttp://elderlybot.mobilex5.com\n令牌有效期为60分钟，且仅可使用一次。`).send();
            } else {
                message.prepare(packet, `令牌生成失败: ${r.msg}`).send();
            }
        }
    });
    return true;
}

module.exports = {
    init,
    generate,
}