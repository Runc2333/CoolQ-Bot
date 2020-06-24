/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function handle(packet) {
    switch (packet.notice_type) {
        case "group_upload"://群文件
            var noticeType = "GROUP_UPLOAD";
            // 在群内发送通知
            var userinfo = message.userinfo(packet.user_id);
            message.prepare(packet, `<${userinfo.nickname}>上传了学习资料[${packet.file.name}].`, false).send();
            break;
        case "group_admin"://管理员
            var noticeType = "GROUP_ADMIN";
            switch (packet.sub_type) {
                case "set":
                    var userinfo = message.userinfo(packet.user_id);
                    message.prepare(packet, `<${userinfo.nickname}>已成功上位.`, false).send();
                    break;
                case "unset":
                    var userinfo = message.userinfo(packet.user_id);
                    message.prepare(packet, `<${userinfo.nickname}>已被罢免.`, false).send();
                    break;
                default:
                    break;
            }
            break;
        case "group_increase"://进群
            var noticeType = "GROUP_INCREASE";
            break;
        case "group_decrease"://退群
            var noticeType = "GROUP_DECREASE";
            switch (packet.sub_type) {
                case "leave":
                    var userinfo = message.userinfo(packet.user_id);
                    message.prepare(packet, `<${userinfo.nickname}>离开了群聊.`, false).send();
                    break;
                case "kick":
                    var userinfo = message.userinfo(packet.user_id);
                    var operatorinfo = message.userinfo(packet.operator_id);
                    message.prepare(packet, `<${userinfo.nickname}>被管理员<${operatorinfo.nickname}>移出了群聊.`, false).send();
                    break;
                default:
                    break;
            }
            break;
        case "group_ban"://禁言
            var noticeType = "GROUP_BAN";
            switch (packet.sub_type) {
                case "ban":
                    var operatorinfo = message.userinfo(packet.operator_id);
                    var userinfo = message.userinfo(packet.user_id);
                    message.prepare(packet, `<${operatorinfo.nickname}>已经给<${userinfo.nickname}>戴上了时长为${packet.duration}秒的口球.`, false).send();
                    break;
                case "lift_ban":
                    var operatorinfo = message.userinfo(packet.operator_id);
                    var userinfo = message.userinfo(packet.user_id);
                    message.prepare(packet, `<${userinfo.nickname}>的口球已被<${operatorinfo.nickname}>摘下.`, false).send();
                    break;
                default:
                    break;
            }
            break;
        case "friend_add"://新好友
            var noticeType = "FRIEND_ADD";
            message.prepare(packet, `你好~欢迎和老人机成为好友~!!`, false).send();
            break;
        default:
            log.write("遇到了未定义的事件.", "NoticeHandler", "WARNING");
            console.log(packet);
            return false;
    }
/* 交给注册的插件处理 */
    var GROUP_PLUGIN_SWITCH = config.get("GLOBAL", "GROUP_PLUGIN_SWITCH");
    var registeredPlugins = config.get("GLOBAL", "NOTICE_REGISTRY")[noticeType];
    for (key in registeredPlugins) {
        if (typeof (GROUP_PLUGIN_SWITCH[packet.group_id]) !== "undefined") {
            if (GROUP_PLUGIN_SWITCH[packet.group_id.toString()][registeredPlugins[key].script] !== false) {
                if (registeredPlugins[key].notification !== false) {
                    log.write(`重定向到${registeredPlugins[key].script}处理`, "NoticeHandler", "INFO");
                }
                require(`${processPath}/plugins/${registeredPlugins[key].script}`)[registeredPlugins[key].handler](packet);//把请求转发给注册的插件处理
            }
        } else {
            if (registeredPlugins[key].notification !== false) {
                log.write(`重定向到${registeredPlugins[key].script}处理`, "NoticeHandler", "INFO");
            }
            require(`${processPath}/plugins/${registeredPlugins[key].script}`)[registeredPlugins[key].handler](packet);//把请求转发给注册的插件处理
        }
    }
}

module.exports = {
    handle
}