/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const log = require(`${processPath}/utils/logger.js`);//日志
const config = require(`${processPath}/utils/configApi.js`);//设置
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function send(type, uid, msg) {
    var data = {};
    switch (type) {
        case "group":
            data.message_type = "group";
            data.group_id = uid;
            break;
        case "private":
            data.message_type = "private";
            data.user_id = uid;
            break;
        case "discuss":
            data.message_type = "discuss";
            data.discuss_id = uid;
            break;
        default:
            log.write("消息发送失败:传入的参数类型不受支持.", "MESSAGE API", "WARNING");
            return false;
    }
    data.message = msg;
    var url = `http://${config.get("GLOBAL", "API_HOST")}:${config.get("GLOBAL", "API_HTTP_PORT")}/send_msg?access_token=${config.get("GLOBAL", "ACCESS_TOKEN")}`;
    var res = request("POST", url, {
        json: data
    });

    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "MESSAGE API] [消息发送失败", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [消息发送失败", "WARNING");
        return false;
    }
    if (response.retcode == 0) {
        log.write(`送往<${uid}>: <${msg}>.`, "MESSAGE API] [消息已送达", "INFO");
    } else {
        console.log(res.getBody("utf8"));
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [消息发送失败", "WARNING");
        return false;
    }
}

function prepare(packet, message, at = false) {
    switch (packet.message_type) {
        case "group":
            if (at) {
                message = `${cqcode.at(packet.sender.user_id)}\n${message}`;
            }
            var uid = packet.group_id;
            break;
        case "private":
            var uid = packet.user_id;
            break;
        case "discuss":
            var uid = packet.discuss_id;
            break;
        default:
            log.write("处理失败:传入的参数类型不受支持.", "MESSAGE API", "WARNING");
            return false;
    }
    return {
        send: function() {
            send(packet.message_type, uid, message);
        }
    }
}

module.exports = {
    send,
    prepare
}