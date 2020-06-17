/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const fs = require("fs");
const Database = require("better-sqlite3"); // SQLite3驱动程序
const log = require(`${processPath}/utils/logger.js`);//日志
const config = require(`${processPath}/utils/configApi.js`);//设置
/* 配置 */
const groupDatabasePath = `${processPath}/group_messages.db`;
const userDatabasePath = `${processPath}/user_messages.db`;

const BOT_QQNUM = config.get("GLOBAL", "BOT_QQNUM");

try {
    if (fs.existsSync(groupDatabasePath) === false) {
        log.write("未找到群聊数据库文件，已自动创建.", "DATABASE", "INFO");
        fs.writeFileSync(groupDatabasePath, "");
    }
    if (fs.existsSync(userDatabasePath) === false) {
        log.write("未找到私聊数据库文件，已自动创建.", "DATABASE", "INFO");
        fs.writeFileSync(userDatabasePath, "");
    }
} catch (e) {
    console.log(e);
    log.write("无法读取/写入文件系统，请尝试以管理员身份运行本程序.", "DATABASE", "ERROR");
    process.exit(true);
}

// 载入数据库
const gdb = new Database(groupDatabasePath, {
    fileMustExist: true
});
const udb = new Database(userDatabasePath, {
    fileMustExist: true
});

const saveMessageIntoDatabase = (parameter) => {
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

const searchMessageByGidAndUid = (gid, uid) => {
    try {
        var data = gdb.prepare(`SELECT * FROM \`${gid}\` WHERE \`user_id\` = '${uid}' AND \`user_id\` != '${BOT_QQNUM}'`).all();
    } catch (e) {
        console.log(e);
        log.write("无法读取数据库.", "DATABASE", "ERROR");
        return false;
    }
    return data;
}

const searchMessageByGidAndContent = (gid, content) => {
    try {
        var data = gdb.prepare(`SELECT * FROM \`${gid}\` WHERE \`content\` LIKE '%${content}%' AND \`user_id\` != '${BOT_QQNUM}'`).all();
    } catch (e) {
        console.log(e);
        log.write("无法读取数据库.", "DATABASE", "ERROR");
        return false;
    }
    return data;
}

const searchMessageByGidAndUidAndContent = (gid, uid, content) => {
    try {
        var data = gdb.prepare(`SELECT * FROM \`${gid}\` WHERE \`user_id\` = '${uid}' AND \`user_id\` != '${BOT_QQNUM}' AND \`content\` LIKE '%${content}%'`).all();
    } catch (e) {
        console.log(e);
        log.write("无法读取数据库.", "DATABASE", "ERROR");
        return false;
    }
    return data;
}

module.exports = {
    saveMessageIntoDatabase,
    searchMessageByGidAndUid,
    searchMessageByGidAndContent,
    searchMessageByGidAndUidAndContent,
}