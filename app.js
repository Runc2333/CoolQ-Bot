/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
const configFilePath = `${processPath}/config/config.json`;//配置文件路径
/* 模块 */
const fs = require("fs");//文件系统读写
const request = require("sync-request");//同步网络请求
const { CQWebSocket } = require("cq-websocket");//CoolQ-WebSocket
const Database = require("better-sqlite3"); // SQLite3驱动程序
const mysql = require("mysql"); // mysql
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
log.write("*              CoolQ-Bot v0.2.0              *", "MAIN THREAD", "INFO");
log.write("*             Written In Node.js             *", "MAIN THREAD", "INFO");
log.write("*              Build:2020.07.16              *", "MAIN THREAD", "INFO");
log.write("*              Author: Runc2333              *", "MAIN THREAD", "INFO");
log.write("**********************************************", "MAIN THREAD", "INFO");

/* 系统插件 */
log.write("开始载入系统插件...", "MAIN THREAD", "INFO");
// require(`${processPath}/systemPlugin/moderation.js`);
// require(`${processPath}/systemPlugin/help.js`);
// require(`${processPath}/systemPlugin/pluginSwitch.js`);
log.write("系统插件载入完毕.", "MAIN THREAD", "INFO");

/* 局部常量 */
const BOT_QQNUM = config.sys("BOT_QQNUM");
const API_HOST = config.sys("API_HOST");//WebSocket API Host
const API_WEBSOCKET_PORT = config.sys("API_WEBSOCKET_PORT");//WebSocket API Port
const ACCESS_TOKEN = config.sys("ACCESS_TOKEN");//WebSocket Access Token
const GLOBAL_ADMINISTRATORS = config.sys("GLOBAL_ADMINISTRATORS");//全局管理员

// 连接远程数据库
const sqldb = config.getDatabase();

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
bot.on("message", (_CQEvent, packet) => {
    if (packet.sender.user_id == BOT_QQNUM || packet.sender.user_id == "2854196310" || packet.sender.user_id == "2854196320" || packet.sender.user_id == "2854196306" || packet.sender.user_id == "2854196312" || packet.sender.user_id == "2854196314" || packet.sender.user_id == "2854196324" || packet.sender.user_id == "1648312960" || packet.user_id == "1022941833" || packet.user_id == "809154538") {
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
    if (packet.message_type != 'group' || (packet.group_id != '930458423' && packet.group_id != '1148034361')) {
        return false;
    }
    messageHandler.handle(packet);
});

//收到通知
bot.on("notice", (packet) => {
    if (packet.user_id == BOT_QQNUM || packet.user_id == "2854196310" || packet.user_id == "2854196320" || packet.user_id == "2854196306" || packet.user_id == "2854196312" || packet.user_id == "2854196314" || packet.user_id == "2854196324" || packet.user_id == "1648312960" || packet.user_id == "1022941833" || packet.user_id == "809154538") {
        return false;
    }
    if (packet.group_id != '930458423' && packet.group_id != '1148034361') {
        return false;
    }
    noticeHandler.handle(packet);
});

//收到请求
bot.on("request", (packet) => {
    if (packet.request_type != 'group' || (packet.group_id != '930458423' && packet.group_id != '1148034361')) {
        return false;
    }
    requestHandler.handle(packet);
});

//断开连接
bot.on("socket.error", () => {
    log.write(`到CQHTTP的WebSocket连接失败.`, "MAIN THREAD", "ERROR");
});

/* 程序退出事件 */
process.on("exit", (code) => {
    log.write("正在退出进程...", "进程结束", "INFO");
});

/* 捕获异常 */
process.on("uncaughtException", function (err) {
    log.write(`Caught exception: ${err}`, "MAIN THREAD", "ERROR");
    log.write(err.stack, "MAIN THREAD", "ERROR")
});

/* 载入插件 */
log.write("开始载入用户插件...", "MAIN THREAD", "INFO");
var pluginManifests = fs.readdirSync(`${processPath}/plugins/manifest`);
pluginManifests.forEach((currentManifestName) => {
    // console.log(`Reading: ${`${processPath}/plugins/manifest/${currentManifestName}`}`);
    var currentManifest = fs.readFileSync(`${processPath}/plugins/manifest/${currentManifestName}`);
    try {
        var currentManifestObject = JSON.parse(currentManifest);
    } catch (e) {
        log.write(`[${currentManifestName}]解析失败，该插件将不会运行。`, "MAIN THREAD", "ERROR");
        return;
    }
    log.write(`已成功解析[${currentManifestName}]，正在注册插件...`, "MAIN THREAD", "INFO");
    var registerInformation = config.registerPlugin(currentManifestObject);
    if (registerInformation.status) {
        require(registerInformation.path).init(registerInformation.token);
        log.write(`插件[${registerInformation.plugin}]注册成功.`, "MAIN THREAD", "INFO");
    } else {
        log.write(`插件[${currentManifestName.split(".")[0]}]注册失败，原因是:${registerInformation.reason}.`, "MAIN THREAD", "ERROR");
    }
});
log.write("用户插件载入完毕.", "MAIN THREAD", "INFO");
log.write("正在刷新插件启用表...", "MAIN THREAD", "INFO");
config.generateSwitchTable();

// // 上报群列表
// var groupTableProgress = 0;
// var groupTableTotal = 0;
// function generateGroupTable() {
//     log.write("正在上报群列表...", "MAIN THREAD", "INFO");
//     sqldb.query(`SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${config.sys('MYSQL_DATABASE')}' and TABLE_NAME ='GROUP_LIST';`, (e, r, f) => {
//         if (r[0]["count(*)"] === 0) {
//             var sql = 'CREATE TABLE IF NOT EXISTS `GROUP_LIST` (`ID` int(255) NOT NULL AUTO_INCREMENT, `groupId` varchar(190) NOT NULL, `groupName` TEXT NOT NULL,PRIMARY KEY(`ID`)) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;';
//             sqldb.query(sql, () => {
//                 var sql = 'CREATE UNIQUE INDEX major ON `GROUP_LIST`(`groupId`);';
//                 sqldb.query(sql, () => {
//                     generateGroupTable();
//                 });
//             });
//         } else {
//             message.getGroupList((a) => {
//                 groupTableTotal = a.length;
//                 a.forEach((item) => {
//                     var sql = 'INSERT INTO `GROUP_LIST` (`groupId`, `groupName`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `groupId` = ?, `groupName` = ?;';
//                     sqldb.query(sql, [
//                         item.group_id,
//                         item.group_name,
//                         item.group_id,
//                         item.group_name,
//                     ], (e) => {
//                         groupTableProgress++;
//                         // console.log(e);
//                     });
//                 });
//             });
//         }
//     });
// }

// // 获取群成员列表
// var groupFetchTotal = 0;
// var groupFetchProgress = 0;
// var userList = [];
// function fetchGroupMemberList() {
//     log.write("正在抓取群成员列表...", "MAIN THREAD", "INFO");
//     sqldb.query(`SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${config.sys('MYSQL_DATABASE')}' and TABLE_NAME ='GROUP_MEMBERS';`, (e, r, f) => {
//         if (r[0]["count(*)"] === 0) {
//             var sql = 'CREATE TABLE IF NOT EXISTS `GROUP_MEMBERS` (`ID` int(255) NOT NULL AUTO_INCREMENT, `groupId` varchar(190) NOT NULL, `userId` varchar(190) NOT NULL, `groupName` TEXT NOT NULL, `nickname` TEXT NOT NULL, `card` TEXT NOT NULL, `joinTime` TEXT NOT NULL, `lastSentTime` TEXT NOT NULL, `role` TEXT NOT NULL,PRIMARY KEY(`ID`)) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;';
//             sqldb.query(sql, () => {
//                 var sql = 'CREATE UNIQUE INDEX major ON `GROUP_MEMBERS`(`groupId`, `userId`);';
//                 sqldb.query(sql, () => {
//                     var sql = 'CREATE INDEX userid ON `GROUP_MEMBERS`(`userId`);';
//                     sqldb.query(sql, () => {
//                         fetchGroupMemberList();
//                     });
//                 });
//             });
//         } else {
//             message.getGroupList((a) => {
//                 groupFetchTotal = a.length;
//                 a.forEach((item) => {
//                     message.getGroupMemberList(item.group_id, (list) => {
//                         list.forEach((user) => {
//                             user.group_name = item.group_name;
//                             userList.push(user);
//                         });
//                         groupFetchProgress++;
//                     });
//                 });
//             });
//         }
//     });
// }

// // 上报群成员列表
// var groupMemberTotal = 0;
// var groupMemberProgress = 0;
// function reportGroupMemberList(list) {
//     log.write("正在上报群成员列表...", "MAIN THREAD", "INFO");
//     groupMemberTotal = list.length;
//     list.forEach((user) => {
//         var sql = 'INSERT INTO `GROUP_MEMBERS` (`groupId`, `userId`, `groupName`, `nickname`, `card`, `joinTime`, `lastSentTime`, `role`) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `groupId` = ?, `userId` = ?, `groupName` = ?, `nickname` = ?, `card` = ?, `joinTime` = ?, `lastSentTime` = ?, `role` = ?;';
//         sqldb.query(sql, [
//             user.group_id,
//             user.user_id,
//             user.group_name,
//             user.nickname,
//             user.card,
//             user.join_time,
//             user.last_sent_time,
//             user.role,
//             user.group_id,
//             user.user_id,
//             user.group_name,
//             user.nickname,
//             user.card,
//             user.join_time,
//             user.last_sent_time,
//             user.role,
//         ], (e) => {
//             groupMemberProgress++;
//             // console.log(e);
//             // return;
//         });
//     });
// }

// // 上报主程序
// var progressInterval = 0;
// function report() {
//     generateGroupTable();
//     progressInterval = setInterval(function () {
//         if (groupTableProgress === groupTableTotal) {
//             log.write(`群列表上报完毕. [${groupTableProgress} / ${groupTableTotal}]`, "MAIN THREAD", "INFO");
//             clearInterval(progressInterval);
//             fetchGroupMemberList();
//             progressInterval = setInterval(function () {
//                 if (groupFetchProgress === groupFetchTotal) {
//                     log.write(`群成员列表抓取完毕. [${groupFetchProgress} / ${groupFetchTotal}]`, "MAIN THREAD", "INFO");
//                     clearInterval(progressInterval);
//                     reportGroupMemberList(userList);
//                     progressInterval = setInterval(function () {
//                         if (groupMemberProgress === groupMemberTotal) {
//                             log.write(`群成员列表上报完毕. [${groupMemberProgress} / ${groupMemberTotal}]`, "MAIN THREAD", "INFO");
//                             clearInterval(progressInterval);
//                             groupTableProgress = 0;
//                             groupTableTotal = 0;
//                             groupFetchProgress = 0;
//                             groupFetchTotal = 0;
//                             groupMemberProgress = 0;
//                             groupMemberTotal = 0;
//                             userList = [];
//                             log.write("上报进程已经执行完毕，数据将会每90分钟刷新一次.", "MAIN THREAD", "INFO");
//                         } else {
//                             log.write(`当前正在上报群成员列表... [${groupMemberProgress} / ${groupMemberTotal}]`, "MAIN THREAD", "INFO");
//                         }
//                     }, 2000);
//                 } else {
//                     log.write(`当前正在抓取群成员列表... [${groupFetchProgress} / ${groupFetchTotal}]`, "MAIN THREAD", "INFO");
//                 }
//             }, 2000);
//         } else {
//             log.write(`当前正在上报群列表... [${groupTableProgress} / ${groupTableTotal}]`, "MAIN THREAD", "INFO");
//         }
//     }, 2000);
// }
// report();
// log.write("上报进程正在后台执行，上报未完成前，机器人性能可能受到影响.", "MAIN THREAD", "INFO");

// // 定时刷新上报数据 90分钟
// setInterval(() => {
//     report();
// }, 90 * 60 * 1000);

// // 上报消息处理量
// const gdb = db.getDatabase("group_messages");

// function reportMessageCapacity() {
//     log.write("正在上报消息处理量...", "MAIN THREAD", "INFO");
//     sqldb.query(`SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${config.sys('MYSQL_DATABASE')}' and TABLE_NAME ='message_capacity';`, (e, r, f) => {
//         if (r[0]["count(*)"] === 0) {
//             var sql = 'CREATE TABLE IF NOT EXISTS `message_capacity` (`ID` int(255) NOT NULL AUTO_INCREMENT, `groupId` varchar(190) NOT NULL, `capacityToday` TEXT NOT NULL, `capacityYesterday` TEXT NOT NULL, `updated` TEXT NOT NULL,PRIMARY KEY(`ID`)) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;';
//             sqldb.query(sql, () => {
//                 var sql = 'CREATE UNIQUE INDEX major ON `message_capacity`(`groupId`);';
//                 sqldb.query(sql, () => {
//                     reportMessageCapacity();
//                 });
//             });
//         } else {
//             message.getGroupList((a) => {
//                 a.forEach((item) => {
//                     var today = (new Date()).setHours(0, 0, 0, 0) / 1000;
//                     var yesterday = today - 86400;
//                     var capacityYesterday = gdb.prepare(`SELECT count(*) FROM \`${item.group_id}\` WHERE \`time\` > ${yesterday} AND \`time\` < ${today}`).all()[0]["count(*)"];
//                     var capacityToday = gdb.prepare(`SELECT count(*) FROM \`${item.group_id}\` WHERE \`time\` > ${today}`).all()[0]["count(*)"];
//                     var sql = 'INSERT INTO `message_capacity` (`groupId`, `capacityToday`, `capacityYesterday`, `updated`) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `groupId` = ?, `capacityToday` = ?, `capacityYesterday` = ?, `updated` = ?;';
//                     sqldb.query(sql, [
//                         item.group_id,
//                         capacityToday,
//                         capacityYesterday,
//                         Math.round(new Date().getTime() / 1000),
//                         item.group_id,
//                         capacityToday,
//                         capacityYesterday,
//                         Math.round(new Date().getTime() / 1000),
//                     ], (e) => {
//                         // console.log(e);
//                     });
//                 });
//             });
//         }
//     });
// }
// reportMessageCapacity();
// // 定时刷新上报数据 2分钟
// setInterval(() => {
//     reportMessageCapacity();
// }, 2 * 60 * 1000);
