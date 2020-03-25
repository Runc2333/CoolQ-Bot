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
        subType: "groupMessage, discussMessage",
        script: "chatbot.js",
        handler: "chatbot",
        regex: "/(^{BOT_NAME}.+?|\\[CQ:at,qq={BOT_QQNUM}\\].+?)/",
        description: "让机器人来陪你聊聊天~"
    });
    config.registerSuperCommand({
        command: "chatbot",
        script: "chatbot.js",
        handler: "command",
        argument: "[action]",
        description: "聊天机器人插件入口, 以下是参数说明:\n[action]:\nenable|disable - 启用或禁用聊天机器人.#admin\nsetapikey [apikey] - 设置插件使用的API KEY.#admin"
    });
    if (config.get("CHATBOT") === false) {
        var data = {};
        data["API_KEY"] = {};
        data["DISABLE_GROUPS"] = [];
        config.write("CHATBOT", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "CHATBOT", "INFO");
    }
}

function chatbot(packet) {
    if (packet.message_type === "group") {
        var DISABLE_GROUPS = config.get("CHATBOT", "DISABLE_GROUPS");
        var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());
        if (index !== -1) {
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
    console.log(url);
    var res = request("GET", url);
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "HITOKOTO", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "HITOKOTO", "WARNING");
        return false;
    }
    var msg = `${response.data.info.text.replace("小思", "老人机")}`;
    message.prepare(packet, msg, true).send();
}

function command(packet) {
    var options = cqcode.decode(packet.message).pureText.split(" ");
    switch (options[1]) {
        case "enable":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[ChatBot] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var DISABLE_GROUPS = config.get("CHATBOT", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index !== -1) {
                //处于禁用状态
                DISABLE_GROUPS.splice(index, 1);
                config.write("CHATBOT", DISABLE_GROUPS, "DISABLE_GROUPS");
                var msg = "[ChatBot] 已启用.";
            } else {
                //处于启用状态
                var msg = "[ChatBot] 已经是启用状态了, 无需重复启用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "disable":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[ChatBot] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var DISABLE_GROUPS = config.get("CHATBOT", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index === -1) {
                //处于启用状态
                DISABLE_GROUPS.push(packet.group_id.toString());
                config.write("CHATBOT", DISABLE_GROUPS, "DISABLE_GROUPS");
                var msg = "[ChatBot] 已禁用.";
            } else {
                //处于禁用状态
                var msg = "[ChatBot] 已经是禁用状态了, 无需重复禁用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "setapikey":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[ChatBot] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            /* 检查必须参数 */
            if (typeof (options[2]) === "undefined") {
                var msg = "[ChatBot] 请提供要设置的API KEY.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            message.revoke(packet.message_id);
            var apikeyConfig = config.get("CHATBOT", "API_KEY");
            var APIKey = options[2];
            apikeyConfig[packet.group_id] = APIKey;
            config.write("CHATBOT", apikeyConfig, "API_KEY");
            var msg = "[ChatBot] 已设定API KEY.";
            message.prepare(packet, msg, true).send();
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