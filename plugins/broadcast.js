/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const crypto = require("crypto");
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const toolbox = require(`${processPath}/utils/toolbox.js`);//常用工具箱

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, discussMessage",
        script: "broadcast.js",
        handler: "broadcast",
        regex: "/^asfiosoifkskld$/",
        description: "快速私聊信息给群成员，再也不用忍受群发之痛",
        notification: false
    });
    config.registerSuperCommand({
        command: "创建群发列表",
        script: "broadcast.js",
        handler: "addBrocastList",
        argument: "[群发列表名] [@要群发的群成员]",
        requirePermission: true,
        description: "创建一个群发列表，用于进行私聊消息群发.\n使用示例：#创建群发列表 三音六派 @小黄@小白@小黑@小绿@小红"
    });
    config.registerSuperCommand({
        command: "删除群发列表",
        script: "broadcast.js",
        handler: "removeBrocastList",
        argument: "[群发列表名]",
        requirePermission: true,
        description: "删除指定的群发列表.n使用示例：#删除群发列表 三音六派"
    });
    config.registerSuperCommand({
        command: "显示群发列表",
        script: "broadcast.js",
        handler: "displayBrocastLists",
        argument: "<页数>",
        requirePermission: true,
        description: "显示已创建的所有群发列表.\n使用示例：#显示群发列表 1"
    });
    config.registerSuperCommand({
        command: "开始群发",
        script: "broadcast.js",
        handler: "startBroadcast",
        argument: "[群发列表名] [群发内容]",
        requirePermission: true,
        description: "对指定的群发列表执行群发操作.\n使用示例：#开始群发 三音六派 宝贝们不要忘记打三音六派啦!!!"
    });
    config.registerSuperCommand({
        command: "中止群发",
        script: "broadcast.js",
        handler: "abortBroadcast",
        argument: "<页数>",
        requirePermission: true,
        description: "显示当前正在进行的/已完成的群发记录.\n使用示例：#显示群发状态 1"
    });
    config.registerSuperCommand({
        command: "显示群发状态",
        script: "broadcast.js",
        handler: "displayBroadcastStatus",
        argument: "<页数>",
        requirePermission: true,
        description: "显示当前正在进行的/已完成的群发记录.\n使用示例：#显示群发状态 1"
    });
    if (config.get("BROADCAST") === false) {
        var data = {};
        data["GROUPS_CONFIGURATIONS"] = {};
        data["BROADCAST_RECORD"] = {};
        config.write("BROADCAST", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "BROADCAST", "INFO");
    }
}

const broadcast = (packet) => {
    return false;
}

const addBrocastList = (packet) => {
    var GROUPS_CONFIGURATIONS = config.get("BROADCAST", "GROUPS_CONFIGURATIONS");
    var options = cqcode.decode(packet.message);
    var broadcastListName = options.pureText.replace(/^#创建群发列表 */, "").split(" ").shift();
    if (broadcastListName.length > 16) {
        var msg = `群发列表名不能超过16个字符.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id]) === "undefined") {
        GROUPS_CONFIGURATIONS[packet.group_id] = {};
    }
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName]) !== "undefined") {
        var msg = `群发列表名已存在，请先删除原群发列表.\n参考指令:“#删除群发列表 ${broadcastListName}”`;
        message.prepare(packet, msg, true).send();
        return false;
    } else {
        GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName] = {}
    }
    var broadcastListUsers = [];
    options.CQObjects.forEach((v) => {
        if (v.type == "at" && v.me === false && v.target.length >= 5) {
            broadcastListUsers.push(v.target.toString());
        }
    });
    broadcastListUsers = toolbox.unique(broadcastListUsers);
    if (broadcastListUsers.length < 2) {
        var msg = `群发列表至少需要包含两名成员，当前识别到的有效成员数：${broadcastListUsers.length}.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName].BROADCAST_LIST_CREATOR = packet.sender.user_id.toString();
    GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName].BROADCAST_LIST_USERS = broadcastListUsers;
    config.write("BROADCAST", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    var msg = `已成功建立群发列表，以下信息用于核对该列表是否正确：\n列表名称：${broadcastListName}\n列表成员：${broadcastListUsers.join("、")}`;
    message.prepare(packet, msg, true).send();
}

const removeBrocastList = (packet) => {
    var GROUPS_CONFIGURATIONS = config.get("BROADCAST", "GROUPS_CONFIGURATIONS");
    var options = cqcode.decode(packet.message);
    var broadcastListName = options.pureText.replace(/^#删除群发列表 */, "");
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id]) === "undefined") {
        var msg = `指定的群发列表不存在.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName]) === "undefined") {
        var msg = `指定的群发列表不存在.`;
        message.prepare(packet, msg, true).send();
        return false;
    } else {
        delete GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName]
    }
    config.write("BROADCAST", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    var msg = `已成功删除指定群发列表.`;
    message.prepare(packet, msg, true).send();
}

const displayBrocastLists = (packet) => {
    var page = cqcode.decode(packet.message).pureText.replace(/^#显示群发列表 */, "");
    if (!toolbox.isNum(page)) {
        page = 1;
    }
    var GROUPS_CONFIGURATIONS = config.get("BROADCAST", "GROUPS_CONFIGURATIONS");
    var CURRENT_GROUP_BROADCAST_LISTS = GROUPS_CONFIGURATIONS[packet.group_id];
    if (typeof (CURRENT_GROUP_BROADCAST_LISTS) === "undefined") {
        var msg = `本群无任何群发列表.`;
        message.prepare(packet, msg, true).send();
        return false;
    } else if (Object.keys(CURRENT_GROUP_BROADCAST_LISTS).length == 0) {
        var msg = `本群无任何群发列表.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    let length = Object.keys(CURRENT_GROUP_BROADCAST_LISTS).length
    let start = (page - 1) * 2;
    let end = length < start + 2 ? length : start + 2;
    var msg = `以下是目前注册到本群的所有群发列表\n共${length}个，正在显示第${start}~${end - 1}条.\n\n`
    Object.keys(CURRENT_GROUP_BROADCAST_LISTS).slice(start, end).forEach((v) => {
        let title = v;
        let users = CURRENT_GROUP_BROADCAST_LISTS[v].BROADCAST_LIST_USERS.join("、");
        msg += `列表名称：${title}\n列表成员：${users}\n\n`;
    });
    if (end < length) {
        msg += `[${page}/${Math.ceil(length / 2)}] 若要查看下一页, 请发送"#显示群发列表 ${parseFloat(page) + 1}".`
    } else {
        msg += `[${page}/${Math.ceil(length / 2)}] 没有下一页了.`
    }
    message.prepare(packet, msg, true).send();
}

const startBroadcast = (packet) => {
    var BROADCAST_RECORD = config.get("BROADCAST", "BROADCAST_RECORD");
    var CURRENT_GROUP_BROADCAST_RECORD = BROADCAST_RECORD[packet.group_id];
    if (typeof (CURRENT_GROUP_BROADCAST_RECORD) !== "undefined") {
        if (CURRENT_GROUP_BROADCAST_RECORD.length > 0) {
            if (CURRENT_GROUP_BROADCAST_RECORD[0].done === false) {
                var msg = `当前有正在进行中的群发任务，请等待任务完成后再执行下一个任务.\n您可发送"#显示群发状态"来获取当前群发进度.\n您也可发送"#中止群发"来中断当前群发任务.`;
                message.prepare(packet, msg, true).send();
                return false;
            }
        }
    }
    var GROUPS_CONFIGURATIONS = config.get("BROADCAST", "GROUPS_CONFIGURATIONS");
    var BROADCAST_RECORD = config.get("BROADCAST", "BROADCAST_RECORD");
    var options = cqcode.decode(packet.message).pureText.replace(/^#开始群发 */, "").split(" ");
    var broadcastListName = options.shift();
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id]) === "undefined") {
        var msg = `指定的群发列表不存在.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName]) === "undefined") {
        var msg = `指定的群发列表不存在.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    var content = options.join(" ");
    if (content == "") {
        var msg = "请提供要发送的内容.";
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (typeof (BROADCAST_RECORD[packet.group_id]) === "undefined") {
        BROADCAST_RECORD[packet.group_id] = [];
    }
    BROADCAST_RECORD[packet.group_id].unshift({
        list: broadcastListName,
        initializer: packet.sender.user_id.toString(),
        initializationTime: toolbox.formatTime(Math.floor(new Date().getTime() / 1000)),
        total: GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName].BROADCAST_LIST_USERS.length,
        progress: 0,
        done: false
    });
    config.write("BROADCAST", BROADCAST_RECORD, "BROADCAST_RECORD");
    setTimeout(function () {
        broadcastWorker(GROUPS_CONFIGURATIONS[packet.group_id][broadcastListName].BROADCAST_LIST_USERS, content, packet.group_id);
    }, 5000);
    var msg = `已将群发任务置入队列.\n您可发送"#显示群发状态"来获取当前群发进度.`;
    message.prepare(packet, msg, true).send();
}

const displayBroadcastStatus = (packet) => {
    var page = cqcode.decode(packet.message).pureText.replace(/^#显示群发状态 */, "");
    if (!toolbox.isNum(page)) {
        page = 1;
    }
    var BROADCAST_RECORD = config.get("BROADCAST", "BROADCAST_RECORD");
    var CURRENT_GROUP_BROADCAST_RECORD = BROADCAST_RECORD[packet.group_id];
    if (typeof (CURRENT_GROUP_BROADCAST_RECORD) === "undefined") {
        var msg = `本群无任何群发列表.`;
        message.prepare(packet, msg, true).send();
        return false;
    } else if (CURRENT_GROUP_BROADCAST_RECORD.length == 0) {
        var msg = `本群无任何群发列表.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    var length = CURRENT_GROUP_BROADCAST_RECORD.length
    // console.log(CURRENT_GROUP_BROADCAST_RECORD);
    var start = (page - 1) * 2;
    var end = length < start + 2 ? length : start + 2;
    // console.log(`${start}/${end}`)
    var msg = `以下是本群的群发记录\n共${length}个，正在显示第${start}~${end - 1}条.\n\n`
    CURRENT_GROUP_BROADCAST_RECORD.slice(start, end).forEach((v) => {
        var title = v.list;
        var num = v.total;
        var initializer = v.initializer;
        var initializationTime = v.initializationTime;
        var progress = v.progress;
        var done = v.done;
        if (progress == num) {
            var status = `[${progress}/${num}] 已完成.`;
        } else if (progress < num && done === false) {
            var status = `[${progress}/${num}] 正在群发...`;
        } else if (progress < num && done === true)  {
            var status = `[${progress}/${num}] 已取消.`;
        } else if (progress == 0 && done === false) {
            var status = `[${progress}/${num}] 正在等待开始...`;
        }
        msg += `用于群发的列表名称：${title}(${num} 成员)\n群发创建者：${cqcode.at(initializer)}\n开始时间：${initializationTime}\n当前状态：${status}\n\n`;
    });
    if (end < length) {
        msg += `[${page}/${Math.ceil(length / 2)}] 若要查看下一页, 请发送"#显示群发状态 ${parseFloat(page) + 1}".`
    } else {
        msg += `[${page}/${Math.ceil(length / 2)}] 没有下一页了.`
    }
    message.prepare(packet, msg, true).send();
}

const broadcastWorker = (list, content, gid) => {
    var BROADCAST_RECORD = config.get("BROADCAST", "BROADCAST_RECORD");
    BROADCAST_RECORD[gid][0].progress = BROADCAST_RECORD[gid][0].progress + 1;
    if (BROADCAST_RECORD[gid][0].progress == BROADCAST_RECORD[gid][0].total) {
        BROADCAST_RECORD[gid][0].done = true;
    }
    var target = list.shift();
    message.send("private", target, content);
    if (BROADCAST_RECORD[gid][0].done === false) {
        setTimeout(function () {
            broadcastWorker(list, content, gid);
        }, 500);
    }
    config.write("BROADCAST", BROADCAST_RECORD, "BROADCAST_RECORD");
}

function abortBroadcast(packet) {
    var BROADCAST_RECORD = config.get("BROADCAST", "BROADCAST_RECORD");
    var CURRENT_GROUP_BROADCAST_RECORD = BROADCAST_RECORD[packet.group_id];
    if (typeof (CURRENT_GROUP_BROADCAST_RECORD) !== "undefined") {
        if (CURRENT_GROUP_BROADCAST_RECORD.length > 0) {
            if (CURRENT_GROUP_BROADCAST_RECORD[0].done === false) {
                CURRENT_GROUP_BROADCAST_RECORD[0].done = true;
                config.write("BROADCAST", BROADCAST_RECORD, "BROADCAST_RECORD");
                var msg = `已中断当前群发任务.`;
                message.prepare(packet, msg, true).send();
                return false;
            } else {
                var msg = `没有正在进行的群发任务，无法执行中断.`;
                message.prepare(packet, msg, true).send();
                return false;
            }
        } else {
            var msg = `没有正在进行的群发任务，无法执行中断.`;
            message.prepare(packet, msg, true).send();
            return false;
        }
    } else {
        var msg = `没有正在进行的群发任务，无法执行中断.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
}

module.exports = {
    init,
    broadcast,
    addBrocastList,
    removeBrocastList,
    displayBrocastLists,
    startBroadcast,
    displayBroadcastStatus,
    abortBroadcast,
}