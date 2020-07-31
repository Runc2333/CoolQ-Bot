/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const async_request = require('request');//异步网络请求
const log = require(`${processPath}/utils/logger.js`);//日志
const config = require(`${processPath}/utils/configApi.js`);//设置
const db = require(`${processPath}/utils/database.js`);//数据库
const toolbox = require(`${processPath}/utils/toolbox.js`);

// const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function cqat(uin) {
    return `[CQ:at,qq=${uin}]`;
}

const BOT_QQNUM = config.sys("BOT_QQNUM");
const API_HOST = config.sys("API_HOST");
const API_HTTP_PORT = config.sys("API_HTTP_PORT");
const ACCESS_TOKEN = config.sys("ACCESS_TOKEN");

const idMap = {
    group: "group_id",
    private: "user_id",
    discuss: "discuss_id",
}

function send(type, uid, msg, escape = false, callback = null) {
    if (typeof (idMap[type]) === "undefined") {
        log.write("消息发送失败:传入的参数类型不受支持.", "MESSAGE API", "WARNING");
        return false;
    }
    var url = `http://${API_HOST}:${API_HTTP_PORT}/send_msg?access_token=${ACCESS_TOKEN}`;
    var postdata = {
        message_type: type,
        message: msg,
        auto_escape: escape === true ? true : false
    };
    postdata[idMap[type]] = uid;
    async_request.post({
        'url': url,
        json: postdata
    }, function (_e, _r, body) {
        if (body.retcode == 0) {
            log.write(`送往<${uid}>: ${msg}`, "MESSAGE API] [消息已送达", "INFO");
            switch (type) {
                case "group":
                    db.saveMessageIntoDatabase({
                        type: type,
                        content: msg,
                        groupId: uid,
                        userId: BOT_QQNUM,
                        messageId: body.data.message_id
                    });
                    break;
                case "discuss":
                    db.saveMessageIntoDatabase({
                        type: type,
                        content: msg,
                        groupId: uid,
                        userId: BOT_QQNUM,
                        messageId: body.data.message_id
                    });
                    break;
                case "private":
                    db.saveMessageIntoDatabase({
                        type: type,
                        content: msg,
                        userId: uid,
                        sender: BOT_QQNUM,
                        messageId: body.data.message_id
                    });
                    break;
                default:
                    log.write("遇到了不支持的消息类型.", "MAIN THREAD", "ERROR");
                    break;
            }
            if (typeof (callback) === "function") {
                callback(body.data.message_id);
            }
        } else {
            if (body.retcode == -34) {
                log.write(`Ret:<${body.retcode}>(帐号在群内被禁言). 已发起退群.`, "MESSAGE API] [消息发送失败", "WARNING");
                getGroupMemberList(uid, (data) => {
                    data.forEach((v) => {
                        if (v.role != "member") {
                            send("private", v.user_id, `老人机即将退出群聊<${uid}>，原因是:\n老人机所属帐号在群内被禁言.\n此消息只起到提示作用，退群动作已经执行且无法撤销.\n若有需要，您可重新邀请老人机加入群聊.`);
                        }
                    });
                    setTimeout(function () {
                        leave(uid);
                    }, 5000);
                });
            } else {
                console.log(body);
                log.write(`Ret:<${body.retcode}>`, "MESSAGE API] [消息发送失败", "WARNING");
                return false;
            }
        }
    });
}

function prepare(packet, message, at = false, escape = false) {
    switch (packet.post_type) {
        case "message":
            switch (packet.message_type) {
                case "group":
                    if (at) {
                        message = `${cqat(packet.sender.user_id)}\n${message}`;
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
                        message = `${cqat(packet.user_id)}\n${message}`;
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
                        message = `${cqat(packet.user_id)}\n${message}`;
                    }
                    var type = "group";
                    var uid = packet.group_id;
                    break;
                default:
                    if (at) {
                        message = `${cqat(packet.user_id)}\n${message}`;
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
        send: function () {
            send(type, uid, message, escape);
        }
    }
}

function revoke(id, packet = null) {
    var data = {};
    data.message_id = id;
    var url = `http://${API_HOST}:${API_HTTP_PORT}/delete_msg?access_token=${ACCESS_TOKEN}`;
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
        return true;
    } else {
        console.log(res.getBody("utf8"));
        if (packet !== null) {
            prepare(packet, `未能撤回消息<${id}>，可能的原因：\n权限不足.`).send();
        }
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [消息撤回失败", "WARNING");
        return false;
    }
}

function kick(gid, uid) {
    var data = {};
    data.group_id = gid;
    data.user_id = uid;
    var url = `http://${API_HOST}:${API_HTTP_PORT}/set_group_kick?access_token=${ACCESS_TOKEN}`;
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

function getGroupMemberInfo(gid, uid) {
    var data = {};
    data.group_id = gid;
    data.user_id = uid;
    data.no_cache = true;
    var url = `http://${API_HOST}:${API_HTTP_PORT}/get_group_member_info?access_token=${ACCESS_TOKEN}`;
    var res = request("POST", url, {
        json: data
    });
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "MESSAGE API] [获取群成员信息失败", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [获取群成员信息失败", "WARNING");
        return false;
    }
    if (response.retcode == 0) {
        log.write(`成功获取群成员信息`, "MESSAGE API", "INFO");
        return response.data;
    } else {
        console.log(res.getBody("utf8"));
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [获取群成员信息失败", "WARNING");
        return false;
    }
}

function getGroupInfo(gid) {
    var data = {};
    data.group_id = gid;
    data.no_cache = true;
    var url = `http://${API_HOST}:${API_HTTP_PORT}/get_group_info?access_token=${ACCESS_TOKEN}`;
    var res = request("POST", url, {
        json: data
    });
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "MESSAGE API] [获取群信息失败", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [获取群信息失败", "WARNING");
        return false;
    }
    if (response.retcode == 0) {
        log.write(`成功获取群信息`, "MESSAGE API", "INFO");
        return response.data;
    } else {
        console.log(res.getBody("utf8"));
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [获取群信息失败", "WARNING");
        return false;
    }
}

function userinfo(uid) {
    var data = {};
    data.user_id = uid;
    var url = `http://${API_HOST}:${API_HTTP_PORT}/get_stranger_info?access_token=${ACCESS_TOKEN}`;
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

function getGroupList(callback) {
    var url = `http://${API_HOST}:${API_HTTP_PORT}/get_group_list?access_token=${ACCESS_TOKEN}`;
    async_request.post({
        'url': url
    }, function (_e, _r, body) {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.log(body);
            log.write("无法解析服务器返回的数据.", "MESSAGE API] [获取群列表失败", "WARNING");
            log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [获取群列表失败", "WARNING");
            return false;
        }
        if (body.retcode == 0) {
            log.write(`成功获取群列表`, "MESSAGE API", "INFO");
            if (typeof (callback) === "function") {
                callback(body.data);
            }
        } else {
            console.log(body);
            log.write(`Ret:<${body.retcode}>`, "MESSAGE API] [获取群列表失败", "WARNING");
            return false;
        }
    });
}

function changeNickname(gid, uid, name, async = true) {
    var data = {};
    data.group_id = gid;
    data.user_id = uid;
    data.card = name;
    data.no_cache = true;
    if (async === false) {
        var url = `http://${API_HOST}:${API_HTTP_PORT}/set_group_card?access_token=${ACCESS_TOKEN}`;
    } else {
        var url = `http://${API_HOST}:${API_HTTP_PORT}/set_group_card_async?access_token=${ACCESS_TOKEN}`;
    }
    var res = request("POST", url, {
        json: data
    });
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "MESSAGE API] [修改群名片失败", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [修改群名片失败", "WARNING");
        return false;
    }
    if (response.retcode == async === false ? 0 : 1) {
        if (async === false) {
            log.write(`目标:<${gid}> <${uid}> => ${name}.`, "MESSAGE API] [已修改群名片", "INFO");
        } else {
            log.write(`目标:<${gid}> <${uid}> => ${name}.`, "MESSAGE API] [修改请求已放入异步队列", "INFO");
        }
        return true;
    } else {
        console.log(res.getBody("utf8"));
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [修改群名片失败", "WARNING");
        return false;
    }
}

function mute(gid, uid, time) {
    var data = {};
    data.group_id = gid;
    data.user_id = uid;
    data.duration = time;
    var url = `http://${API_HOST}:${API_HTTP_PORT}/set_group_ban?access_token=${ACCESS_TOKEN}`;
    var res = request("POST", url, {
        json: data
    });
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "MESSAGE API] [设置禁言失败", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [设置禁言失败", "WARNING");
        return false;
    }
    if (response.retcode == 0) {
        log.write(`目标用户: <${uid}>`, "MESSAGE API] [成功设置禁言", "INFO");
        return response.data;
    } else {
        console.log(res.getBody("utf8"));
        send("group", gid, `对用户<${uid}>的禁言操作失败，可能的原因：\n权限不足.`);
        log.write(`Ret:<${response.retcode}>`, "MESSAGE API] [设置禁言失败", "WARNING");
        return false;
    }
}

function getGroupMemberList(gid, callback) {
    var url = `http://${API_HOST}:${API_HTTP_PORT}/get_group_member_list?access_token=${ACCESS_TOKEN}`;
    var postdata = {
        group_id: gid
    };
    async_request.post({
        'url': url,
        json: postdata
    }, function (e, _r, body) {
        if (e) {
            console.log(e)
            callback([]);
            return false;
        }
        if (body.retcode == 0) {
            // log.write(`成功获取群成员列表`, "MESSAGE API", "INFO");
            if (typeof (callback) === "function") {
                callback(body.data);
            }
        } else {
            console.log(body);
            log.write(`Ret:<${body.retcode}>`, "MESSAGE API] [获取群成员列表失败", "WARNING");
            return false;
        }
    });
}

function getFriendList(callback) {
    var url = `http://${API_HOST}:${API_HTTP_PORT}/get_friend_list?access_token=${ACCESS_TOKEN}`;
    async_request.post({
        'url': url
    }, function (_e, _r, body) {
        try {
            body = JSON.parse(body);
        } catch (e) {
            console.log(body);
            log.write("无法解析服务器返回的数据.", "MESSAGE API] [获取好友列表失败", "WARNING");
            log.write("请检查后端服务器是否工作正常.", "MESSAGE API] [获取好友列表失败", "WARNING");
            return false;
        }
        if (body.retcode == 0) {
            log.write(`成功获取好友列表`, "MESSAGE API", "INFO");
            if (typeof (callback) === "function") {
                callback(body.data);
            }
        } else {
            console.log(body);
            log.write(`Ret:<${body.retcode}>`, "MESSAGE API] [获取好友列表失败", "WARNING");
            return false;
        }
    });
}

function leave(gid) {
    var url = `http://${API_HOST}:${API_HTTP_PORT}/set_group_leave?access_token=${ACCESS_TOKEN}`;
    var postdata = {
        group_id: gid
    };
    async_request.post({
        'url': url,
        json: postdata
    }, function (_e, _r, body) {
        if (body.retcode == 0) {
            log.write(`目标群组: ${gid}.`, "MESSAGE API] [已退出群组", "INFO");
        } else {
            console.log(body);
            log.write(`Ret:<${body.retcode}>`, "MESSAGE API] [退出群组失败", "WARNING");
            return false;
        }
    });
}

function checkPermission(packet) {
    if (!isGroupAdministrator(packet)) {
        var msg = "权限不足.";
        prepare(packet, msg, true).send();
        return false;
    }
    return true;
}

function checkSuperPermission(packet) {
    if (!isGlobalAdministrator(packet.sender.user_id)) {
        var msg = "权限不足.";
        prepare(packet, msg, true).send();
        return false;
    }
    return true;
}

function getPermission(packet) {
    if (isGlobalAdministrator(packet.sender.user_id)) {
        return 2;
    }
    if (isGroupAdministrator(packet)) {
        return 1;
    }
    return 0;
}

function checkSelfPermission(gid, callback) {
    var url = `http://${API_HOST}:${API_HTTP_PORT}/get_group_member_info?access_token=${ACCESS_TOKEN}`;
    var postdata = {
        group_id: gid,
        user_id: BOT_QQNUM,
        no_cache: true
    };
    async_request.post({
        'url': url,
        json: postdata
    }, function (_e, _r, body) {
        if (body.retcode == 0) {
            // log.write(`成功获取机器人权限`, "MESSAGE API", "INFO");
            if (typeof (callback) === "function") {
                callback(body.data.role == "member" ? false : true);
            }
        } else {
            console.log(body);
            log.write(`Ret:<${body.retcode}>`, "MESSAGE API] [获取机器人权限失败", "WARNING");
            return false;
        }
    });
}

function isGlobalAdministrator(uin) {
    var GLOBAL_ADMINISTRATORS = config.sys("GLOBAL_ADMINISTRATORS");//全局管理员
    if (GLOBAL_ADMINISTRATORS.indexOf(uin.toString()) === -1) {
        return false
    }
    return true;
}

function isGroupAdministrator(packet) {
    if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
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
    getGroupList,
    mute,
    leave,
    checkPermission,
    checkSuperPermission,
    checkSelfPermission,
    changeNickname,
    getGroupInfo,
    getGroupMemberInfo,
    isGlobalAdministrator,
    isGroupAdministrator,
    getGroupMemberList,
    getFriendList,
    getPermission,
}