/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const log = require(`${processPath}/utils/logger.js`);//日志
const config = require(`${processPath}/utils/configApi.js`);//设置
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function handle(packet) {
    switch (packet.request_type) {
        case "friend":
            var data = {};
            data.flag = packet.flag;
            var url = `http://${config.get("GLOBAL", "API_HOST")}:${config.get("GLOBAL", "API_HTTP_PORT")}/set_friend_add_request?access_token=${config.get("GLOBAL", "ACCESS_TOKEN")}`;
            var res = request("POST", url, {
                json: data
            });
            try {
                var response = JSON.parse(res.getBody("utf8"));
            } catch (e) {
                console.log(res.getBody("utf8"));
                log.write("无法解析服务器返回的数据.", "RequestHandler] [同意好友请求失败", "WARNING");
                log.write("请检查后端服务器是否工作正常.", "RequestHandler] [同意好友请求失败", "WARNING");
            }
            if (response.retcode == 0) {
                log.write(`目标用户: <${packet.user_id}>`, "RequestHandler] [成功同意好友请求", "INFO");
            } else {
                console.log(res.getBody("utf8"));
                log.write(`Ret:<${response.retcode}>`, "RequestHandler] [同意好友请求失败", "WARNING");
            }
            break;
        case "group":
            switch (packet.sub_type) {
                case "add":
                    var data = {};
                    data.flag = packet.flag;
                    data.sub_type = packet.sub_type;
                    if (/炫舞/.test(packet.comment) === true || data.group_id != "930458423") {
                        data.approve = true;
                    } else {
                        data.approve = false;
                        data.reason = "请正确回答问题.(提示: 炫舞)";
                    }
                    var url = `http://${config.get("GLOBAL", "API_HOST")}:${config.get("GLOBAL", "API_HTTP_PORT")}/set_group_add_request?access_token=${config.get("GLOBAL", "ACCESS_TOKEN")}`;
                    var res = request("POST", url, {
                        json: data
                    });
                    try {
                        var response = JSON.parse(res.getBody("utf8"));
                    } catch (e) {
                        console.log(res.getBody("utf8"));
                        log.write("无法解析服务器返回的数据.", "RequestHandler] [同意入群请求失败", "WARNING");
                        log.write("请检查后端服务器是否工作正常.", "RequestHandler] [同意入群请求失败", "WARNING");
                    }
                    if (response.retcode == 0) {
                        log.write(`目标用户: <${packet.user_id}>`, "RequestHandler] [成功同意入群请求", "INFO");
                    } else {
                        console.log(res.getBody("utf8"));
                        log.write(`Ret:<${response.retcode}>`, "RequestHandler] [同意入群请求失败", "WARNING");
                    }
                    break;
                case "invite":
                    var data = {};
                    data.flag = packet.flag;
                    data.sub_type = packet.sub_type;
                    var url = `http://${config.get("GLOBAL", "API_HOST")}:${config.get("GLOBAL", "API_HTTP_PORT")}/set_group_add_request?access_token=${config.get("GLOBAL", "ACCESS_TOKEN")}`;
                    var res = request("POST", url, {
                        json: data
                    });
                    try {
                        var response = JSON.parse(res.getBody("utf8"));
                    } catch (e) {
                        console.log(res.getBody("utf8"));
                        log.write("无法解析服务器返回的数据.", "RequestHandler] [同意入群邀请失败", "WARNING");
                        log.write("请检查后端服务器是否工作正常.", "RequestHandler] [同意入群邀请失败", "WARNING");
                    }
                    if (response.retcode == 0) {
                        log.write(`目标群: <${packet.group_id}>`, "RequestHandler] [成功同意入群邀请", "INFO");
                    } else {
                        console.log(res.getBody("utf8"));
                        log.write(`Ret:<${response.retcode}>`, "RequestHandler] [同意入群邀请失败", "WARNING");
                    }
                    break;
                default:
                    log.write("遇到了未定义的事件.", "RequestHandler", "WARNING");
                    console.log(packet);
                    break;
            }
            break;
        default:
            log.write("遇到了未定义的事件.", "RequestHandler", "WARNING");
            console.log(packet);
            return false;
    }
}

module.exports = {
    handle
}