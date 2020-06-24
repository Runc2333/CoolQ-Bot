/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
const configFilePath = `${processPath}/config/config.json`;//配置文件路径
/* 模块 */
const fs = require("fs");//文件系统读写
const request = require("sync-request");//同步网络请求
const { CQWebSocket } = require("cq-websocket");//CoolQ-WebSocket
const log = require(`${processPath}/utils/logger.js`);//日志
const config = require(`${processPath}/utils/configApi.js`);//设置
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const db = require(`${processPath}/utils/database.js`);//数据库
/* 事件处理程序 */
const messageHandler = require(`${processPath}/handler/messageHandler.js`);
const noticeHandler = require(`${processPath}/handler/noticeHandler.js`);
const requestHandler = require(`${processPath}/handler/requestHandler.js`);
const superCommandHandler = require(`${processPath}/systemPlugin/superCommand.js`);

/* 打印程序信息 */
log.write("**********************************************", "MAIN THREAD", "INFO");
log.write("*              CoolQ-Bot v0.1.0              *", "MAIN THREAD", "INFO");
log.write("*             Written In Node.js             *", "MAIN THREAD", "INFO");
log.write("*              Build:2020.06.01              *", "MAIN THREAD", "INFO");
log.write("*              Author: Runc2333              *", "MAIN THREAD", "INFO");
log.write("**********************************************", "MAIN THREAD", "INFO");

/* 系统插件 */
log.write("开始载入系统插件...", "MAIN THREAD", "INFO");
// require(`${processPath}/systemPlugin/moderation.js`);
require(`${processPath}/systemPlugin/help.js`);
require(`${processPath}/systemPlugin/pluginSwitch.js`);
log.write("系统插件载入完毕.", "MAIN THREAD", "INFO");

/* 局部常量 */
const BOT_QQNUM = config.get("GLOBAL", "BOT_QQNUM");
const API_HOST = config.get("GLOBAL", "API_HOST");//WebSocket API Host
const API_WEBSOCKET_PORT = config.get("GLOBAL", "API_WEBSOCKET_PORT");//WebSocket API Port
const ACCESS_TOKEN = config.get("GLOBAL", "ACCESS_TOKEN");//WebSocket Access Token
const GLOBAL_ADMINISTRATORS = config.get("GLOBAL", "GLOBAL_ADMINISTRATORS");//全局管理员

/* 初始化后端WS连接 */
const bot = new CQWebSocket({
    accessToken: ACCESS_TOKEN,
    host: API_HOST,
    port: API_WEBSOCKET_PORT
});

/* 建立连线 */
bot.connect();

/* 注册事件 */
//连接建立事件
bot.on("ready", function () {
    log.write("到后端服务器的WebSocket连接已成功建立.", "MAIN THREAD", "INFO");
    // message.getGroupList().forEach(function (item) {
    //     message.send("group", item.group_id, `后端进程已启动或已被重载.\n机器人服务已恢复可用.`);
    // });
    // GLOBAL_ADMINISTRATORS.forEach(function (item) {
    //     message.send("private", item, "后端进程已启动或已被重载.\n机器人服务已恢复可用.");
    // });
});

//收到消息
bot.on("message", function (_CQEvent, packet) {
    if (packet.sender.user_id == BOT_QQNUM || packet.sender.user_id == "2854196310" || packet.sender.user_id == "2854196320" || packet.sender.user_id == "2854196306" || packet.sender.user_id == "2854196312" || packet.sender.user_id == "2854196314" || packet.sender.user_id == "2854196324" || packet.sender.user_id == "1648312960") {
        return false;
    }
    if (/^#/.test(cqcode.decode(packet.message).pureText) === false) {
        switch (packet.message_type) {
            case "group":
                db.saveMessageIntoDatabase({
                    type: packet.message_type,
                    content: packet.message,
                    groupId: packet.group_id,
                    userId: packet.sender.user_id,
                    messageId: packet.message_id
                });
                break;
            case "discuss":
                db.saveMessageIntoDatabase({
                    type: packet.message_type,
                    content: packet.message,
                    discussId: packet.group_id,
                    userId: packet.sender.user_id,
                    messageId: packet.message_id
                });
                break;
            case "private":
                db.saveMessageIntoDatabase({
                    type: packet.message_type,
                    content: packet.message,
                    userId: packet.sender.user_id,
                    sender: packet.sender.user_id,
                    messageId: packet.message_id
                });
                break;
            default:
                log.write("遇到了不支持的消息类型.", "MAIN THREAD", "ERROR");
                break;
        }
    }
    messageHandler.handle(packet);
});

//收到通知
bot.on("notice", function (packet) {
    if (packet.user_id == BOT_QQNUM || packet.user_id == "2854196310" || packet.user_id == "2854196320" || packet.user_id == "2854196306" || packet.user_id == "2854196312" || packet.user_id == "2854196314" || packet.user_id == "2854196324" || packet.user_id == "1648312960") {
        return false;
    }
    noticeHandler.handle(packet);
    // console.log(packet);
})

//收到请求
bot.on("request", function (packet) {
    requestHandler.handle(packet);
    // console.log(packet);
})

/* 程序退出事件 */
process.on("exit", (code) => {
    // message.getGroupList().forEach(function (item) {
    //     message.send("group", item.group_id, `后端进程已捕获到终止指令，正在退出.\n机器人服务将暂时不可用.`);
    // });
    // GLOBAL_ADMINISTRATORS.forEach(function (item) {
    //     message.send("private", item, `后端进程已捕获到终止指令，正在退出.\n机器人服务将暂时不可用.`);
    // });
    log.write("正在退出进程...", "进程结束", "INFO");
});

/* 捕获异常 */
process.on("uncaughtException", function (err) {
    console.log(`Caught exception: ${err}`);
    // message.getGroupList().forEach(function (item) {
    //     message.send("group", item.group_id, `后端进程在运行中捕获到了一个异常, 请尽快查看日志.错误详情: \n${err}`);
    // });
    // GLOBAL_ADMINISTRATORS.forEach(function (item) {
    //     message.send("private", item, `后端进程在运行中捕获到了一个异常, 请尽快查看日志.错误详情: \n${err}`);
    // });
});

/* 载入插件 */
log.write("开始载入用户插件...", "MAIN THREAD", "INFO");
var plugins = fs.readdirSync(`${processPath}/plugins`);
for (i = 0; i < plugins.length; i++) {
    log.write(`已检测到插件: ${plugins[i].split(".")[0]}`, "MAIN THREAD", "INFO");
    try {
        require(`${processPath}/plugins/${plugins[i]}`).init();
    } catch (e) {
        console.log(e);
        log.write(`未能初始化插件<${plugins[i].split(".")[0]}>: 初始化时发生问题.`, "MAIN THREAD", "ERROR");
    }
    log.write(`插件<${plugins[i].split(".")[0]}>初始化成功.`, "MAIN THREAD", "INFO");
}
log.write("用户插件载入完毕.", "MAIN THREAD", "INFO");

// /* 检查权限 */
// log.write("开始检查群组权限...", "MAIN THREAD", "INFO");
// message.getGroupList().forEach(function (item) {
//     if (message.checkSelfPermission(item.group_id) === false) {
//         console.log(`Group: ${item.group_id} NO PERMISSION.`);
//         // message.send("group", item.group_id, `[警告] 老人机没有本群的管理权限，以下功能将不会生效：\n1. 文本/图片内容审核: 过滤广告/色情/政治敏感信息\n2. 入群验证: 过滤批量加群的机器人\n3. 退群提示: 在群内广播成员退群信息，拉黑主动退群成员(可选)\n欢迎将我添加至其他群组，以快速获取入群验证、入群欢迎、广告过滤、每日抽签、灵魂鸡汤、智障聊天、正则关键词匹配、QQ炫舞爆点查询等能力`);
//         message.send("group", item.group_id, `[警告] 老人机没有本群的管理权限，部分功能可能不会生效.`);
//         message.send("group", item.group_id, `老人机已被更新，本次改动如下：\n1、更新了S6赛季所有模式的爆点数据, 现已可查询到S6赛季的新歌数据.\n2、新增"锁定群名片"功能，可锁定群成员的群名片，详细请参阅"#指令帮助".\n\nBug反馈、功能定制(免费)联系Runc(814537405).`);
//     } else {
//         console.log(`Group: ${item.group_id} GRANTED.`);
//         message.send("group", item.group_id, `老人机已被更新，本次改动如下：\n1、更新了S6赛季所有模式的爆点数据, 现已可查询到S6赛季的新歌数据.\n2、新增"锁定群名片"功能，可锁定群成员的群名片，详细请参阅"#指令帮助".\n\nBug反馈、功能定制(免费)联系Runc(814537405).`);
//     }
// });