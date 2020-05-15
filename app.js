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
/* 事件处理程序 */
const messageHandler = require(`${processPath}/handler/messageHandler.js`);
const noticeHandler = require(`${processPath}/handler/noticeHandler.js`);
const requestHandler = require(`${processPath}/handler/requestHandler.js`);
const superCommandHandler = require(`${processPath}/systemPlugin/superCommand.js`);

/* 打印程序信息 */
log.write("**********************************************", "MAIN THREAD", "INFO");
log.write("*              CoolQ-Bot v0.0.2              *", "MAIN THREAD", "INFO");
log.write("*             Written In Node.js             *", "MAIN THREAD", "INFO");
log.write("*              Build:2020.03.25              *", "MAIN THREAD", "INFO");
log.write("*              Author: Runc2333              *", "MAIN THREAD", "INFO");
log.write("**********************************************", "MAIN THREAD", "INFO");

/* 系统插件 */
log.write("开始载入系统插件...", "MAIN THREAD", "INFO");
require(`${processPath}/systemPlugin/help.js`);
require(`${processPath}/systemPlugin/pluginSwitch.js`);
log.write("系统插件载入完毕.", "MAIN THREAD", "INFO");

/* 局部常量 */
const API_HOST = config.get("GLOBAL", "API_HOST");//WebSocket API Host
const API_WEBSOCKET_PORT = config.get("GLOBAL", "API_WEBSOCKET_PORT");//WebSocket API Port
const ACCESS_TOKEN = config.get("GLOBAL", "ACCESS_TOKEN");//WebSocket Access Token

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
});

//收到消息
bot.on("message", function (_CQEvent, packet) {
    messageHandler.handle(packet);
});

//收到通知
bot.on("notice", function (packet) {
    noticeHandler.handle(packet);
    // console.log(packet);
})

//收到请求
bot.on("request", function (packet) {
    requestHandler.handle(packet);
    // console.log(packet);
})

/* 载入插件 */
log.write("开始载入用户插件...", "MAIN THREAD", "INFO");
var plugins = fs.readdirSync(`${processPath}/plugins`);
for (i = 0; i < plugins.length; i++) {
    log.write(`已检测到插件: ${plugins[i].split(".")[0]}`, "MAIN THREAD", "INFO");
    try {
        require(`${processPath}/plugins/${plugins[i]}`).init();
    } catch (e) {
        log.write(`未能初始化插件<${plugins[i].split(".")[0]}>: 初始化时发生问题.`, "MAIN THREAD", "ERROR");
    }
    log.write(`插件<${plugins[i].split(".")[0]}>初始化成功.`, "MAIN THREAD", "INFO");
}
log.write("用户插件载入完毕.", "MAIN THREAD", "INFO");