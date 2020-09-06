/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const log = require(`${processPath}/utils/logger.js`);//日志
const config = require(`${processPath}/utils/configApi.js`);//设置
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const noticeHandler = require(`${processPath}/handler/noticeHandler.js`);

function handle(packet) {
    switch (packet.request_type) {
        case "friend":
            var data = {};
            data.flag = packet.flag;
            var url = `http://${config.sys("API_HOST")}:${config.sys("API_HTTP_PORT")}/set_friend_add_request?access_token=${config.sys("ACCESS_TOKEN")}`;
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
                    if (packet.group_id == "930458423" || packet.group_id == "1148034361") {
                        var data = {};
                        data.flag = packet.flag;
                        data.sub_type = packet.sub_type;
                        if (/(炫舞|爆气|曝气|排位|邀请人)/.test(packet.comment) === true) {
                            data.approve = true;
                        } else {
                            data.approve = false;
                            data.reason = "请正确回答问题.(提示: 炫舞)";
                        }
                        var url = `http://${config.sys("API_HOST")}:${config.sys("API_HTTP_PORT")}/set_group_add_request?access_token=${config.sys("ACCESS_TOKEN")}`;
                        var res = request("POST", url, {
                            json: data
                        });
                        try {
                            var response = JSON.parse(res.getBody("utf8"));
                        } catch (e) {
                            console.log(res.getBody("utf8"));
                            log.write("无法解析服务器返回的数据.", "RequestHandler] [处理入群请求失败", "WARNING");
                            log.write("请检查后端服务器是否工作正常.", "RequestHandler] [处理入群请求失败", "WARNING");
                        }
                        if (response.retcode == 0) {
                            if (data.approve === true) {
                                log.write(`目标用户: <${packet.user_id}>`, "RequestHandler] [成功同意入群请求", "INFO");
                                noticeHandler.handle({
                                    post_type: 'notice',
                                    notice_type: 'group_increase',
                                    sub_type: 'approve',
                                    group_id: packet.group_id,
                                    operator_id: packet.self_id,
                                    user_id: packet.user_id,
                                }); // 触发一下通知事件
                            } else {
                                var userinfo = message.userinfo(packet.user_id);
                                message.prepare(packet, `已自动拒绝用户<${userinfo.nickname}(${packet.user_id})>的加群请求.\n提供的验证信息:\n${packet.comment}`, false).send();
                                log.write(`目标用户: <${packet.user_id}>`, "RequestHandler] [成功拒绝入群请求", "INFO");
                            }
                        } else {
                            console.log(res.getBody("utf8"));
                            log.write(`Ret:<${response.retcode}>`, "RequestHandler] [处理入群请求失败", "WARNING");
                        }
                    }
                    break;
                case "invite":
                    // var data = {};
                    // data.flag = packet.flag;
                    // data.sub_type = packet.sub_type;
                    // var url = `http://${config.sys("API_HOST")}:${config.sys("API_HTTP_PORT")}/set_group_add_request?access_token=${config.sys("ACCESS_TOKEN")}`;
                    // var res = request("POST", url, {
                    //     json: data
                    // });
                    // try {
                    //     var response = JSON.parse(res.getBody("utf8"));
                    // } catch (e) {
                    //     console.log(res.getBody("utf8"));
                    //     log.write("无法解析服务器返回的数据.", "RequestHandler] [同意入群邀请失败", "WARNING");
                    //     log.write("请检查后端服务器是否工作正常.", "RequestHandler] [同意入群邀请失败", "WARNING");
                    // }
                    // if (response.retcode == 0) {
                    //     log.write(`目标群: <${packet.group_id}>`, "RequestHandler] [成功同意入群邀请", "INFO");
                    //     setTimeout(function () {
                    //         message.send("group", packet.group_id.toString(), "大家好，我是老人机.\n我拥有入群验证、入群欢迎、广告过滤、每日抽签、灵魂鸡汤、智障聊天、问答系统、QQ炫舞爆点查询等能力\n要了解我的全部功能，请发送\"帮助\"\nBug反馈、功能咨询、功能定制联系Runc(814537405).");
                    //     }, 2000);
                    // } else {
                    //     console.log(res.getBody("utf8"));
                    //     log.write(`Ret:<${response.retcode}>`, "RequestHandler] [同意入群邀请失败", "WARNING");
                    // }
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