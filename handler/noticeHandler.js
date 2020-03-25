/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function handle(packet) {
    switch (packet.notice_type) {
        case "group_upload"://群文件
            var noticeType = "GROUP_UPLOAD";
            break;
        case "group_admin"://管理员
            var noticeType = "GROUP_ADMIN";
            break;
        case "group_increase"://进群
            var noticeType = "GROUP_INCREASE";
            break;
        case "group_decrease"://退群
            var noticeType = "GROUP_DECREASE";
            break;
        case "group_ban"://禁言
            var noticeType = "GROUP_BAN";
            break;
        case "friend_add"://新好友
            var noticeType = "FRIEND_ADD";
            break;
        default:
            log.write("遇到了未定义的事件.", "NoticeHandler", "WARNING");
            console.log(packet);
            return false;
    }
    /* 交给注册的插件处理 */
    var registeredPlugins = config.get("GLOBAL", "NOTICE_REGISTRY")[noticeType];
    for (key in registeredPlugins) {
        log.write(`重定向到${key}处理`, "NoticeHandler", "INFO");
        require(`${processPath}/plugins/${key}`)[registeredPlugins[key].handler](packet);//把请求转发给注册的插件处理
    }
}

module.exports = {
    handle
}