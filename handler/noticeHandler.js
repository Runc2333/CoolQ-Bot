/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const mysql = require("mysql"); // mysql
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

// 连接远程数据库
const sqldb = mysql.createConnection({
    host: config.sys("MYSQL_HOST"),
    user: config.sys("MYSQL_USERNAME"),
    password: config.sys("MYSQL_PASSWORD"),
    database: config.sys("MYSQL_DATABASE"),
});
try {
    sqldb.connect();
} catch (e) {
    log.write(`无法连接到远程数据库，正在退出进程...`, "插件开关", "ERROR");
    process.exit();
}

function handle(packet) {
    switch (packet.notice_type) {
        case "group_upload"://群文件
            var noticeType = "GROUP_UPLOAD";
            // 在群内发送通知
            var userinfo = message.getGroupMemberInfo(packet.group_id, packet.user_id);
            message.prepare(packet, `<${userinfo.nickname}(${packet.user_id})>上传了文件[${packet.file.name}].`, false).send();
            break;
        case "group_admin"://管理员
            var noticeType = "GROUP_ADMIN";
            switch (packet.sub_type) {
                case "set":
                    sqldb.query('UPDATE `GROUP_MEMBERS` SET `role` = \'admin\' WHERE `userId` = ? AND `groupId` = ?', [
                        packet.user_id,
                        packet.group_id
                    ]);
                    var userinfo = message.getGroupMemberInfo(packet.group_id, packet.user_id);
                    message.prepare(packet, `<${userinfo.nickname}(${packet.user_id})>已成功上位.`, false).send();
                    break;
                case "unset":
                    sqldb.query('UPDATE `GROUP_MEMBERS` SET `role` = \'member\' WHERE `userId` = ? AND `groupId` = ?', [
                        packet.user_id,
                        packet.group_id
                    ]);
                    var userinfo = message.getGroupMemberInfo(packet.group_id, packet.user_id);
                    message.prepare(packet, `<${userinfo.nickname}(${packet.user_id})>已被罢免.`, false).send();
                    break;
                default:
                    break;
            }
            break;
        case "group_increase"://进群
            var groupinfo = message.getGroupInfo(packet.group_id);
            var memberinfo = message.getGroupMemberInfo(packet.group_id, packet.user_id);
            sqldb.query('INSERT INTO `GROUP_MEMBERS` (`groupId`, `userId`, `groupName`, `nickname`, `card`, `joinTime`, `lastSentTime`, `role`) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `groupId` = ?, `userId` = ?, `groupName` = ?, `nickname` = ?, `card` = ?, `joinTime` = ?, `lastSentTime` = ?, `role` = ?;', [
                memberinfo.group_id,
                memberinfo.user_id,
                groupinfo.group_name,
                memberinfo.nickname,
                memberinfo.card,
                memberinfo.join_time,
                memberinfo.last_sent_time,
                memberinfo.role,
                memberinfo.group_id,
                memberinfo.user_id,
                groupinfo.group_name,
                memberinfo.nickname,
                memberinfo.card,
                memberinfo.join_time,
                memberinfo.last_sent_time,
                memberinfo.role,
            ]);
            var noticeType = "GROUP_INCREASE";
            break;
        case "group_decrease"://退群
            sqldb.query('DELETE FROM `GROUP_MEMBERS` WHERE `userId` = ? AND `groupId` = ?', [
                packet.user_id,
                packet.group_id
            ]);
            var noticeType = "GROUP_DECREASE";
            switch (packet.sub_type) {
                case "leave":
                    var userinfo = message.userinfo(packet.user_id);
                    message.prepare(packet, `<${userinfo.nickname}(${packet.user_id})>离开了群聊.`, false).send();
                    break;
                case "kick":
                    var userinfo = message.userinfo(packet.user_id);
                    var operatorinfo = message.userinfo(packet.operator_id);
                    message.prepare(packet, `<${userinfo.nickname}(${packet.user_id})>被管理员<${operatorinfo.nickname}(${packet.operator_id})>移出了群聊.`, false).send();
                    break;
                default:
                    break;
            }
            break;
        case "group_ban"://禁言
            var noticeType = "GROUP_BAN";
            switch (packet.sub_type) {
                case "ban":
                    var operatorinfo = message.getGroupMemberInfo(packet.group_id, packet.operator_id);
                    var userinfo = message.getGroupMemberInfo(packet.group_id, packet.user_id);
                    message.prepare(packet, `<${operatorinfo.nickname}(${packet.operator_id})>已经给<${userinfo.nickname}(${packet.user_id})>戴上了时长为${packet.duration}秒的口球.`, false).send();
                    break;
                case "lift_ban":
                    var operatorinfo = message.getGroupMemberInfo(packet.group_id, packet.operator_id);
                    var userinfo = message.getGroupMemberInfo(packet.group_id, packet.user_id);
                    message.prepare(packet, `<${userinfo.nickname}(${packet.user_id})>的口球已被<${operatorinfo.nickname}(${packet.operator_id})>摘下.`, false).send();
                    break;
                default:
                    break;
            }
            break;
        case "friend_add"://新好友
            var noticeType = "FRIEND_ADD";
            message.prepare(packet, `你好，我是老人机.\n在私聊状态下，我仅拥有部分能力，因此功能表现可能和在群内不一致.\n要了解我的全部功能，请发送\"帮助\"\nBug反馈、功能咨询、功能定制联系Runc(814537405).`, false).send();
            break;
        default:
            log.write("遇到了未定义的事件.", "NoticeHandler", "WARNING");
            console.log(packet);
            return false;
    }
    /* 交给注册的插件处理 */
    var skipSignalReceived = false;
    var forceSkipReceived = false;
    var registry = config.getRegistry().NOTICE_REGISTRY[noticeType];
    registry.forEach((v) => {
        if (forceSkipReceived) {
            return false;
        }
        if (skipSignalReceived && v.skipable === true) {
            return false;
        }
        // console.log(v.plugin);
        if (config.isEnable(packet, v.plugin)) {
            if (!v.silent) {
                log.write(`重定向到[${v.alias}]处理`, "NoticeHandler", "INFO");
            }
            if (typeof (v.identifier) === "undefined") {
                var skipSignal = require(v.script)[v.handler](packet);
            } else {
                var skipSignal = require(v.script)[v.handler](v.identifier, packet);
            }
            if (skipSignal === true) {
                skipSignalReceived = true;
            } else if (skipSignal === "forceskip") {
                forceSkipReceived = true;
            }
        }
    });
}

module.exports = {
    handle
}