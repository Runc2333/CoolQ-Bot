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
    data.auto_escape = false;
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
    switch (packet.post_type) {
        case "message":
            switch (packet.message_type) {
                case "group":
                    if (at) {
                        message = `${cqcode.at(packet.sender.user_id)}\n${message}`;
                    }
                    var type = "group";
                    var uid = packet.group_id;
                    break;
                case "private":
                    var type = "private";
                    var uid = packet.user_id;
                    break;
                case "discuss":
                    var type = "discuss";
                    var uid = packet.discuss_id;
                    break;
                default:
                    log.write("处理失败:传入的参数类型不受支持.", "MESSAGE API", "WARNING");
                    return false;
            }
            break;
        case "notice":
            switch (packet.notice_type) {
                case "friend_add":
                    var type = "private";
                    var uid = packet.user_id;
                    break;
                default:
                    if (at) {
                        message = `${cqcode.at(packet.user_id)}\n${message}`;
                    }
                    var type = "group";
                    var uid = packet.group_id;
                    break;
            }
            break;
        case "request":
            switch (packet.request_type) {
                case "friend":
                    var type = "private";
                    var uid = packet.user_id;
                    break;
                case "group":
                    if (at) {
                        message = `${cqcode.at(packet.user_id)}\n${message}`;
                    }
                    var type = "group";
                    var uid = packet.group_id;
                    break;
                default:
                    if (at) {
                        message = `${cqcode.at(packet.user_id)}\n${message}`;
                    }
                    var type = "group";
                    var uid = packet.group_id;
                    break
            }
            break;
        default:
            log.write("处理失败:传入的参数类型不受支持.", "MESSAGE API", "WARNING");
            return false;
    }
    return {
        send: function() {
            send(type, uid, message);
        }
    }
}

function revoke(id) {
    var data = {};
    data.message_id = id;
    var url = `http://${config.get("GLOBAL", "API_HOST")}:${config.get("GLOBAL", "API_HTTP_PORT")}/delete_msg?access_token=${config.get("GLOBAL", "ACCESS_TOKEN")}`;
    var res = request("POST", url, {
        json: data
    });
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "MESSAGE API] [消息撤回失败", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [消息撤回失败", "WARNING");
        return false;
    }
    if (response.retcode == 0) {
        log.write(`消息ID: <${id}>.`, "MESSAGE API] [已撤回消息", "INFO");
    } else {
        console.log(res.getBody("utf8"));
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [消息撤回失败", "WARNING");
        return false;
    }
}

function kick(gid, uid) {
    var data = {};
    data.group_id = gid;
    data.user_id = uid;
    var url = `http://${config.get("GLOBAL", "API_HOST")}:${config.get("GLOBAL", "API_HTTP_PORT")}/set_group_kick?access_token=${config.get("GLOBAL", "ACCESS_TOKEN")}`;
    var res = request("POST", url, {
        json: data
    });
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "MESSAGE API] [移除成员失败", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [移除成员失败", "WARNING");
        return false;
    }
    if (response.retcode == 0) {
        log.write(`群: <${gid}>. 成员: <${uid}>`, "MESSAGE API] [已移除成员", "INFO");
    } else {
        console.log(res.getBody("utf8"));
        send("group", gid, `未能移除群成员<${userinfo(uid).nickname}>.\n可能的原因: 权限不足.`);
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [移除成员失败", "WARNING");
        return false;
    }
}

function userinfo(uid) {
    var data = {};
    data.user_id = uid;
    var url = `http://${config.get("GLOBAL", "API_HOST")}:${config.get("GLOBAL", "API_HTTP_PORT")}/get_stranger_info?access_token=${config.get("GLOBAL", "ACCESS_TOKEN")}`;
    var res = request("POST", url, {
        json: data
    });
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "MESSAGE API] [获取陌生人信息失败", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [获取陌生人信息失败", "WARNING");
        return false;
    }
    if (response.retcode == 0) {
        log.write(`目标用户: <${uid}>`, "MESSAGE API] [成功获取陌生人信息", "INFO");
        return response.data;
    } else {
        console.log(res.getBody("utf8"));
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [获取陌生人信息失败", "WARNING");
        return false;
    }
}

function checkPermission(packet) {
    if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
        var msg = "权限不足.";
        prepare(packet, msg, true).send();
        return false;
    }
    return true;
}

module.exports = {
    send,
    prepare,
    revoke,
    kick,
    userinfo,
    checkPermission
}