/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const fs = require("fs");
const Database = require("better-sqlite3"); // SQLite3驱动程序
const log = require(`${processPath}/utils/logger.js`);//日志
/* 配置 */
const databaseStorePath = `${processPath}/data/database`;

function getDatabase(name) {
    var filepath = `${databaseStorePath}/${name}.db`;
    try {
        if (fs.existsSync(filepath) === false) {
            log.write(`正在尝试获取的数据库文件<${name}>不存在，已自动创建.`, "DATABASE", "INFO");
            fs.writeFileSync(filepath, "");
        }
    } catch (e) {
        console.log(e);
        log.write("无法读取/写入文件系统，请尝试以管理员身份运行本程序.", "DATABASE", "ERROR");
        process.exit(true);
    }
    return new Database(filepath, {
        fileMustExist: true
    });
}

const gdb = getDatabase("group_messages");
const udb = getDatabase("user_messages");

function saveMessageIntoDatabase(parameter) {
    // 检查是否提供了必要参数
    let requiredParameters = ["type", "content", "messageId", "userId"];
    let returnFlag = false;
    requiredParameters.forEach((v) => {
        if (typeof (parameter[v]) === "undefined") {
            log.write("未能存入数据库: 缺少参数.", "DATABASE", "WARNING");
            returnFlag = true;
        }
    });
    if (returnFlag) {
        console.log(parameter);
        return false;
    }
    switch (parameter.type) {
        case "group":
            if (typeof (parameter.groupId) === "undefined") {
                log.write("未能存入数据库: 缺少参数.", "DATABASE", "WARNING");
                console.log(parameter);
                return false;
            }
            if (gdb.prepare(`SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = '${parameter.groupId.toString()}'`).all()[0]["count(*)"] === 0) {
                gdb.prepare(`CREATE TABLE \`${parameter.groupId.toString()}\` ( \`ID\` INTEGER PRIMARY KEY, \`user_id\` TEXT NOT NULL , \`message_id\` TEXT NOT NULL , \`content\` TEXT NOT NULL , \`time\` TEXT NOT NULL)`).run();
            }
            var time = Math.floor((new Date()).getTime() / 1000);
            try {
                gdb.prepare(`INSERT INTO \`${parameter.groupId.toString()}\` (time, user_id, content, message_id) VALUES (?, ?, ?, ?);`).run(
                    time.toString(),
                    parameter.userId.toString(),
                    parameter.content.toString(),
                    parameter.messageId.toString()
                );
            } catch (e) {
                console.log(e);
                log.write("无法写入数据库.", "DATABASE", "ERROR");
                // process.exit();
            }
            break;
        case "private":
            if (typeof (parameter.sender) === "undefined") {
                console.log(parameter);
                log.write("未能存入数据库: 缺少参数.", "DATABASE", "WARNING");
                return false;
            }
            if (udb.prepare(`SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = '${parameter.userId.toString()}'`).all()[0]["count(*)"] === 0) {
                udb.prepare(`CREATE TABLE \`${parameter.userId.toString()}\` ( \`ID\` INTEGER PRIMARY KEY, \`user_id\` TEXT NOT NULL , \`message_id\` TEXT NOT NULL , \`content\` TEXT NOT NULL , \`time\` TEXT NOT NULL)`).run();
            }
            var time = Math.floor((new Date()).getTime() / 1000);
            try {
                udb.prepare(`INSERT INTO \`${parameter.userId.toString()}\` (time, user_id, content, message_id) VALUES (?, ?, ?, ?);`).run(time.toString(), parameter.userId.toString(), parameter.content.toString(), parameter.messageId.toString());
            } catch (e) {
                log.write("无法写入数据库.", "DATABASE", "ERROR");
                // process.exit();
            }
            break;
        case "discuss":
            if (typeof (parameter.discussId) === "undefined") {
                console.log(parameter);
                log.write("未能存入数据库: 缺少参数.", "DATABASE", "WARNING");
                return false;
            }
            if (gdb.prepare(`SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = '${parameter.discussId.toString()}'`).all()[0]["count(*)"] === 0) {
                gdb.prepare(`CREATE TABLE \`${parameter.discussId.toString()}\` ( \`ID\` INTEGER PRIMARY KEY, \`user_id\` TEXT NOT NULL , \`message_id\` TEXT NOT NULL , \`content\` TEXT NOT NULL , \`time\` TEXT NOT NULL)`).run();
            }
            var time = Math.floor((new Date()).getTime() / 1000);
            try {
                gdb.prepare(`INSERT INTO \`${parameter.discussId.toString()}\` (time, user_id, content, message_id) VALUES (?, ?, ?, ?);`).run(time.toString(), parameter.userId.toString(), parameter.content.toString(), parameter.messageId.toString());
            } catch (e) {
                log.write("无法写入数据库.", "DATABASE", "ERROR");
                // process.exit();
            }
            break;
        default:
            log.write("提供的消息类型不受支持.", "DATABASE", "WARNING");
            break;
    }
}

module.exports = {
    getDatabase,
    saveMessageIntoDatabase,
}