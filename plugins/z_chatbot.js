/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const async_request = require('request');//异步网络请求
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
        command: "设置密钥",
        script: "z_chatbot.js",
        handler: "setapikey",
        argument: "[密钥]",
        requirePermission: true,
        description: "设置聊天机器人所使用的密钥(API KEY)，可在https://console.ownthink.com/login注册后获取.\n使用示例：#设置密钥 hitynga16d12tuowphz9f4tqvjdpzexn"
    });
    config.registerSuperCommand({
        command: "启用一律回复",
        script: "z_chatbot.js",
        handler: "enableAlwaysReply",
        description: "启用一律回复功能，启用后，机器人将会回复你说的每一句话.\n使用示例：#启用一律回复"
    });
    config.registerSuperCommand({
        command: "禁用一律回复",
        script: "z_chatbot.js",
        handler: "disalbeAlwaysReply",
        description: "禁用一律回复功能，禁用后，和机器人聊天将需要使用唤醒词.\n使用示例：#禁用一律回复"
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
    var regex = eval(`/(^${config.get("GLOBAL", "BOT_NAME")}|\\[CQ:at,qq=${config.get("GLOBAL", "BOT_QQNUM")}\\])/ig`);
    var spoken = cqcode.decode(packet.message).pureText.replace(regex, "小思");
    if (spoken.length == 0) {
        message.prepare(packet, `你不能给老人机发送一条空白的消息哦~\n老人机目前还无法理解除文字外的信息.`, true).send();
        return false;
    }
    var url = encodeURI(`https://api.ownthink.com/bot?appid=${apikey}&spoken=${spoken}&userid=${packet.sender.user_id}`);
    // async method
    async_request(url, function (_error, _response, body) {
        try {
            var response = JSON.parse(body);
        } catch (e) {
            console.log(response);
            log.write("无法解析服务器返回的数据.", "CHATBOT", "WARNING");
            log.write("请检查后端服务器是否工作正常.", "CHATBOT", "WARNING");
            return false;
        }
        var msg = `${response.data.info.text.replace(/小思/g, "老人机")}`;
        if (packet.message_type === "group") {
            message.prepare(packet, `${msg}\n\n提示：这是未匹配到任何功能时的默认聊天回复，如若要查看机器人支持的功能，请发送"帮助".`, true).send();
        } else {
            message.prepare(packet, `${msg}\n\n提示：这是未匹配到任何功能时的默认聊天回复，如若要查看机器人支持的功能，请发送"帮助".`).send();
        }
    });
    // sync method
    // var res = request("GET", url);
    // try {
    //     var response = JSON.parse(res.getBody("utf8"));
    // } catch (e) {
    //     console.log(res.getBody("utf8"));
    //     log.write("无法解析服务器返回的数据.", "HITOKOTO", "WARNING");
    //     log.write("请检查后端服务器是否工作正常.", "HITOKOTO", "WARNING");
    //     return false;
    // }
    // var msg = `${response.data.info.text.replace(/小思/g, "老人机")}`;
    // if (packet.message_type === "group") {
    //     message.prepare(packet, `${msg}`, true).send();
    // } else {
    //     message.prepare(packet, `${msg}\n\n提示：这是未匹配到任何功能时的默认聊天回复，如若要查看机器人支持的功能，请发送"帮助".`).send();
    // }
}

function setapikey(packet) {
    /* 检查权限 */
    if (message.checkPermission(packet) === false) {
        return false;
    }
    var APIKey = cqcode.decode(packet.message).pureText.replace(/^#设置密钥 */, "");
    /* 检查必须参数 */
    if (typeof (APIKey) === "undefined") {
        var msg = "[ChatBot] 请提供要设置的API KEY.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    message.revoke(packet.message_id, packet);
    var apikeyConfig = config.get("CHATBOT", "API_KEY");
    apikeyConfig[packet.group_id] = APIKey;
    config.write("CHATBOT", apikeyConfig, "API_KEY");
    var msg = "[ChatBot] 已设定API KEY.";
    message.prepare(packet, msg, true).send();
}

function enableAlwaysReply(packet) {
    var userId = packet.sender.user_id;
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
}

function disalbeAlwaysReply(packet) {
    var userId = packet.sender.user_id;
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
}

module.exports = {
    init,
    chatbot,
    setapikey,
    enableAlwaysReply,
    disalbeAlwaysReply
}