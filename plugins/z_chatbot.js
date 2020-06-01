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
        type: "message",
        subType: "groupMessage, discussMessage, privateMessage",
        script: "z_chatbot.js",
        handler: "chatbot",
        regex: "/./",
        description: "让机器人来陪你聊聊天~",
        notification: false
    });
    config.registerSuperCommand({
        command: "chatbot",
        script: "z_chatbot.js",
        handler: "command",
        argument: "[action]",
        description: "聊天机器人插件入口, 以下是参数说明:\n[action]:\nsetapikey [apikey] - 设置插件使用的API KEY.#admin\nalwaysReply [state]:\nenable|disable - 启用或禁用一律回复."
    });
    if (config.get("CHATBOT") === false) {
        var data = {};
        data["API_KEY"] = {};
        data["ALWAYS_REPLY"] = [];
        config.write("CHATBOT", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "CHATBOT", "INFO");
    }
}

function chatbot(packet) {
    //获取机器人名字
    var BOT_NAME = config.get("GLOBAL", "BOT_NAME");
    var BOT_QQNUM = config.get("GLOBAL", "BOT_QQNUM");
    //获取发送人ID
    var userId = packet.sender.user_id;
    var ALWAYS_REPLY = config.get("CHATBOT", "ALWAYS_REPLY");
    var index = ALWAYS_REPLY.indexOf(userId.toString());//判断是否已经禁用
    if (index === -1 && packet.message_type === "group") {
        //处于禁用状态
        var regex = eval("/(^{BOT_NAME}.+?|\\[CQ:at,qq={BOT_QQNUM}\\].+?)/".replace(/\{BOT_NAME\}/g, BOT_NAME).replace(/\{BOT_QQNUM\}/g, BOT_QQNUM));//唤醒词匹配规则
        if (!(regex.test(packet.message))) {//判断是否使用了唤醒词
            return false;
        }
    }
    var apikey = config.get("CHATBOT", "API_KEY")[packet.group_id];
    if (apikey === undefined) {
        apikey = "xiaosi"
    }
    var regex = eval(`/(^${config.get("GLOBAL", "BOT_NAME")}|\\[CQ:at,qq=${config.get("GLOBAL", "BOT_QQNUM")}\\])/`);
    var spoken = packet.message.replace(regex, "");
    var url = encodeURI(`https://api.ownthink.com/bot?appid=${apikey}&spoken=${spoken}&userid=${packet.sender.user_id}`);
    // console.log(url);
    var res = request("GET", url);
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "HITOKOTO", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "HITOKOTO", "WARNING");
        return false;
    }
    var msg = `${response.data.info.text.replace(/小思/g, "老人机")}`;
    if (packet.message_type === "group") {
        message.prepare(packet, `${msg}`, true).send();
    } else {
        message.prepare(packet, `${msg}\n\n提示：这是未匹配到任何功能时的默认聊天回复，如若要查看机器人支持的功能，请发送"帮助".`).send();
    }
}

function command(packet) {
    var options = cqcode.decode(packet.message).pureText.split(" ");
    switch (options[1]) {
        case "setapikey":
            /* 检查权限 */
            if (message.checkPermission(packet) === false) {
                return false;
            }
            /* 检查必须参数 */
            if (typeof (options[2]) === "undefined") {
                var msg = "[ChatBot] 请提供要设置的API KEY.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            message.revoke(packet.message_id, packet);
            var apikeyConfig = config.get("CHATBOT", "API_KEY");
            var APIKey = options[2];
            apikeyConfig[packet.group_id] = APIKey;
            config.write("CHATBOT", apikeyConfig, "API_KEY");
            var msg = "[ChatBot] 已设定API KEY.";
            message.prepare(packet, msg, true).send();
            break;
        case "alwaysReply":
            var userId = packet.sender.user_id;
            if (userId == "2821116126") {
                var msg = "[ChatBot] 拒绝执行.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            switch (options[2]) {
                case "enable":
                    var ALWAYS_REPLY = config.get("CHATBOT", "ALWAYS_REPLY");
                    var index = ALWAYS_REPLY.indexOf(userId.toString());//判断是否已经禁用
                    if (index !== -1) {
                        //处于启用状态
                        var msg = "[ChatBot] 已经是启用状态了, 无需重复启用.";
                    } else {
                        //处于禁用状态
                        ALWAYS_REPLY.push(userId.toString());
                        config.write("CHATBOT", ALWAYS_REPLY, "ALWAYS_REPLY");
                        var msg = "[ChatBot] 成功启用一律回复功能, 现在开始, 机器人将回复你说的每一句话.";
                    }
                    message.prepare(packet, msg, true).send();
                    break;
                case "disable":
                    var ALWAYS_REPLY = config.get("CHATBOT", "ALWAYS_REPLY");
                    var index = ALWAYS_REPLY.indexOf(userId.toString());//判断是否已经禁用
                    if (index !== -1) {
                        //处于启用状态
                        ALWAYS_REPLY.splice(index, 1);
                        config.write("CHATBOT", ALWAYS_REPLY, "ALWAYS_REPLY");
                        var msg = "[ChatBot] 成功禁用一律回复功能, 现在开始, 与机器人聊天将需要使用唤醒词.";
                    } else {
                        //处于禁用状态
                        var msg = "[ChatBot] 已经是禁用状态了, 无需重复禁用.";
                    }
                    message.prepare(packet, msg, true).send();
                    break;
                default:
                    log.write("处理失败:未知指令.", "CHATBOT", "WARNING");
                    var msg = "[ChatBot] 未知指令.";
                    message.prepare(packet, msg, true).send();
                    return false;
            }
            break;
        default:
            log.write("处理失败:未知指令.", "CHATBOT", "WARNING");
            var msg = "[ChatBot] 未知指令.";
            message.prepare(packet, msg, true).send();
            return false;
    }
}

module.exports = {
    init,
    chatbot,
    command
}