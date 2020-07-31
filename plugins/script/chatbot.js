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

function chatbot(packet) {
    var apikey = "xiaosi"
    var regex = eval(`/(^${config.sys("BOT_NAME")}|\\[CQ:at,qq=${config.sys("BOT_QQNUM")}\\])/ig`);
    var spoken = cqcode.decode(packet.message).pureText.replace(regex, "小思");
    if (spoken.length == 0) {
        message.prepare(packet, `你不能给老人机发送一条空白的消息哦~\n老人机目前还无法理解除文字外的信息.`, false).send();
        return false;
    }
    var url = encodeURI(`https://api.ownthink.com/bot?appid=${apikey}&spoken=${spoken}&userid=${packet.sender.user_id}`);
    // async method
    async_request(url, function (_error, _response, body) {
        try {
            var response = JSON.parse(body);
        } catch (e) {
            console.log(response);
            log.write("无法解析服务器返回的数据.", "CHATBOT", "WARNING");
            log.write("请检查后端服务器是否工作正常.", "CHATBOT", "WARNING");
            return false;
        }
        var msg = `${response.data.info.text.replace(/小思/g, "老人机")}`;
        if (packet.message_type === "group") {
            // message.prepare(packet, `${msg}\n\n提示：这是未匹配到任何功能时的默认聊天回复，如若要查看机器人支持的功能，请发送"帮助".`, false).send();
            message.prepare(packet, `${msg}`, false).send();
        } else {
            // message.prepare(packet, `${msg}\n\n提示：这是未匹配到任何功能时的默认聊天回复，如若要查看机器人支持的功能，请发送"帮助".`).send();
            message.prepare(packet, `${msg}`).send();
        }
    });
}

module.exports = {
    init,
    chatbot,
}