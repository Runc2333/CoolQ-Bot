/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function init() {
    config.registerPlugin({
        type: "notice",
        subType: "groupIncrease",
        script: "captcha.js",
        handler: "captcha",
        description: "给新成员发送入群验证"
    });
    config.registerPlugin({
        type: "message",
        subType: "groupMessage",
        script: "captcha.js",
        handler: "auth",
        regex: "/我不是机器人/",
        description: "给新成员发送入群验证",
        notification: false
    });
    if (config.get("CAPTCHA") === false) {
        var data = {};
        data["PENDING_CAPTCHA"] = [];
        config.write("CAPTCHA", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "CAPTCHA", "INFO");
    }
}

function captcha(packet) {
    setTimeout(function () {
        var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
        if (PENDING_CAPTCHA.indexOf(packet.user_id.toString()) !== -1) {
            message.prepare(packet, "您将在100秒后被移出群组, 若要避免, 请发送<我不是机器人>以确认您的身份.", true).send();
        }
        console.log("Timer1 Done.");
    }, 200 * 1000);
    setTimeout(function () {
        var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
        if (PENDING_CAPTCHA.indexOf(packet.user_id.toString()) !== -1) {
            message.kick(packet.group_id, packet.user_id);
        }
        console.log("Timer2 Done.");
        PENDING_CAPTCHA.splice(PENDING_CAPTCHA.indexOf(packet.user_id.toString()), 1);
        config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
    }, 300 * 1000);
    var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
    PENDING_CAPTCHA.push(packet.user_id.toString());
    console.log(PENDING_CAPTCHA);
    config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
    message.prepare(packet, "欢迎加入群聊！\n请在300秒内发送<我不是机器人>以确认您的身份.若超时未发送, 您将会被移出群聊.", true).send();
}

function auth(packet) {
    var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
    if (PENDING_CAPTCHA.indexOf(packet.user_id.toString()) !== -1) {
        PENDING_CAPTCHA.splice(PENDING_CAPTCHA.indexOf(packet.user_id.toString()), 1);
        config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
        message.prepare(packet, "恭喜您通过了验证！", true).send();
    }
}

module.exports = {
    init,
    captcha,
    auth
}