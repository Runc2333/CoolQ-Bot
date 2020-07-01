/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const db = require(`${processPath}/utils/database.js`);
const Database = require("better-sqlite3"); // SQLite3驱动程序
const request = require("sync-request");//同步网络请求
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const toolbox = require(`${processPath}/utils/toolbox.js`);//常用工具箱

/* 局部常量 */
const BOT_QQNUM = config.get("GLOBAL", "BOT_QQNUM");

const gdb = db.getDatabase("group_messages");
const udb = db.getDatabase("user_messages");

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, discussMessage",
        script: "messageQuery.js",
        handler: "messageQuery",
        regex: "/^asfiosoifkskld$/",
        description: "通过特定条件查询聊天记录，从此黑屁证据再也不怕丢",
        notification: false
    });
    config.registerSuperCommand({
        command: "查某人记录",
        script: "messageQuery.js",
        handler: "searchByUinAndKeyword",
        argument: "[QQ号] <关键词> <页数>",
        requirePermission: false,
        description: "通过QQ号和关键词(可选)来查找ta说过的话.\n使用示例：#查某人记录 1145141919 今晚排位 1"
    });
    config.registerSuperCommand({
        command: "查全群记录",
        script: "messageQuery.js",
        handler: "searchByKeyword",
        argument: "[关键词] <页数>",
        requirePermission: false,
        description: "通过关键词查询群组中所有匹配的消息.\n使用示例：#查全群记录 绝对不鸽 1"
    });
}

function messageQuery(packet) {
    return false;
}

function searchByUinAndKeyword(packet) {
    var options = packet.message.replace(/^#查某人记录 */, "").split(" ");
    if (options.length >= 3) {
        var page = options.pop();
        if (isNaN(page) === true) {
            options.push(page);
            page = 1;
        }
    } else {
        var page = 1;
    }
    var user_id = options.shift();
    if (user_id === undefined) {
        var msg = "请提供您查询目标的QQ号.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var keyword = options.join(" ").replace(new RegExp("\r\n", "gm"), "\n");
    if (keyword == "" || keyword == "%") {
        var keyword = "%";
        var data = searchMessageByGidAndUid(packet.group_id, user_id);
    } else {
        var data = searchMessageByGidAndUidAndContent(packet.group_id, user_id, keyword);
    }
    if (data.length == 0) {
        var msg = `针对查询未找到任何结果.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (page > Math.ceil(data.length / 5)) {
        var msg = `指定的页数超出范围，可接受的范围：(1 - ${Math.ceil(data.length / 5)}).`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    data = data.reverse();
    let start = (page - 1) * 5;
    let end = data.length < start + 5 ? data.length : start + 5;
    var msg = `针对查询共找到${data.length}个结果, 正在显示第${start}~${end - 1}条:\n\n`;
    data.slice(start, end).forEach((v) => {
        let sendTime = toolbox.formatTime(v.time);
        let sender_id = v.user_id;
        let content = v.content;
        msg += `[${sendTime}] - <${sender_id}>\n${content}\n`;
    });
    if (end < data.length) {
        msg += `\n[${page}/${Math.ceil(data.length / 5)}] 若要查看下一页, 请发送"#查某人记录 ${user_id} ${keyword} ${parseFloat(page) + 1}".`
    } else {
        msg += `\n[${page}/${Math.ceil(data.length / 5)}] 没有下一页了.`
    }
    message.prepare(packet, msg, true).send();
}

function searchByKeyword(packet) {
    var options = packet.message.replace(/^#查全群记录 */, "").split(" ");
    if (options.length >= 2) {
        var page = options.pop();
        if (isNaN(page) === true) {
            options.push(page);
            page = 1;
        }
    } else {
        var page = 1;
    }
    var keyword = options.join(" ").replace(new RegExp("\r\n", "gm"), "\n");
    if (keyword === undefined || keyword == "" || keyword == "%") {
        var msg = "请提供您要查询的关键词.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    var data = searchMessageByGidAndContent(packet.group_id, keyword);
    if (data.length == 0) {
        var msg = `针对查询未找到任何结果.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (page > Math.ceil(data.length / 5)) {
        var msg = `指定的页数超出范围，可接受的范围：(1 - ${Math.ceil(data.length / 5)}).`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    data = data.reverse();
    let start = (page - 1) * 5;
    let end = data.length < start + 5 ? data.length : start + 5;
    var msg = `针对查询共找到${data.length}个结果, 正在显示第${start}~${end - 1}条:\n\n`;
    data.slice(start, end).forEach((v, i, a) => {
        let sendTime = toolbox.formatTime(v.time);
        let sender_id = v.user_id;
        let content = v.content;
        msg += `[${sendTime}] - <${sender_id}>\n${content}\n`;
    });
    if (end < data.length) {
        msg += `\n[${page}/${Math.ceil(data.length / 5)}] 若要查看下一页, 请发送"#查全群记录 ${keyword} ${parseFloat(page) + 1}".`
    } else {
        msg += `\n[${page}/${Math.ceil(data.length / 5)}] 没有下一页了.`
    }
    message.prepare(packet, msg, true).send();
}

function searchMessageByGidAndUid(gid, uid) {
    try {
        var data = gdb.prepare(`SELECT * FROM \`${gid}\` WHERE \`user_id\` = '${uid}' AND \`user_id\` != '${BOT_QQNUM}'`).all();
    } catch (e) {
        console.log(e);
        log.write("无法读取数据库.", "DATABASE", "ERROR");
        return false;
    }
    return data;
}

function searchMessageByGidAndContent(gid, content) {
    try {
        var data = gdb.prepare(`SELECT * FROM \`${gid}\` WHERE \`content\` LIKE '%${content}%' AND \`user_id\` != '${BOT_QQNUM}'`).all();
    } catch (e) {
        console.log(e);
        log.write("无法读取数据库.", "DATABASE", "ERROR");
        return false;
    }
    return data;
}

function searchMessageByGidAndUidAndContent(gid, uid, content) {
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
    init,
    messageQuery,
    searchByUinAndKeyword,
    searchByKeyword,
}