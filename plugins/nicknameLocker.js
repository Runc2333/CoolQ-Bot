/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const db = require(`${processPath}/utils/database.js`);
const request = require("sync-request");//同步网络请求
const { userinfo } = require("../utils/messageApi");
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const toolbox = require(`${processPath}/utils/toolbox.js`);//常用工具箱

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, discussMessage",
        script: "nicknameLocker.js",
        handler: "nicknameLocker",
        regex: "/./",
        description: "锁定群名片，拒绝🐻管理捣乱",
        notification: false
    });
    config.registerSuperCommand({
        command: "锁定群名片",
        script: "nicknameLocker.js",
        handler: "lock",
        argument: "[QQ号] [群昵称]",
        requirePermission: true,
        description: "锁定指定QQ号的群名片.\n使用示例：#锁定群名片 1145141919 大帅哥"
    });
    config.registerSuperCommand({
        command: "解锁群名片",
        script: "nicknameLocker.js",
        handler: "unlock",
        argument: "[QQ号]",
        requirePermission: true,
        description: "锁定指定QQ号的群名片.\n使用示例：#解锁群名片 1145141919"
    });
    if (config.get("NICKNAME_LOCKER") === false) {
        var data = {};
        data["GROUPS_CONFIGURATIONS"] = {};
        config.write("NICKNAME_LOCKER", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "NICKNAME_LOCKER", "INFO");
    }
}

const nicknameLocker = (packet) => {
    var GROUPS_CONFIGURATIONS = config.get("NICKNAME_LOCKER", "GROUPS_CONFIGURATIONS");
    if(typeof (GROUPS_CONFIGURATIONS[packet.group_id]) === "undefined") {
        return false;
    }
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id][packet.sender.user_id]) === "undefined") {
        return false;
    }
    message.changeNickname(packet.group_id, packet.sender.user_id, GROUPS_CONFIGURATIONS[packet.group_id][packet.sender.user_id].nickname);
    return false;
}

const lock = (packet) => {
    var options = cqcode.decode(packet.message).pureText.replace(/^#锁定群名片 */, "").split(" ");
    var userToLock = options.shift();
    if (toolbox.isNum(userToLock) === false || userToLock.length >= 11 || userToLock.length < 6) {
        var msg = `请提供要锁定群名片用户的QQ号.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    var userInfo = message.getGroupMemberInfo(packet.group_id, userToLock);
    if (userInfo === false) {
        var msg = `指定用户不存在（或不存在于本群）.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    var nicknameForLock = options.shift();
    if (typeof (nicknameForLock) === "undefined") {
        var msg = `请提供一个群昵称.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (nicknameForLock.length > 16) {
        var msg = `提供的群昵称长度不能超过16位.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    var GROUPS_CONFIGURATIONS = config.get("NICKNAME_LOCKER", "GROUPS_CONFIGURATIONS");
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id]) === "undefined") {
        GROUPS_CONFIGURATIONS[packet.group_id] = {};
    }
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id][userToLock]) === "undefined") {
        GROUPS_CONFIGURATIONS[packet.group_id][userToLock] = {
            nickname: nicknameForLock,
            locker: packet.sender.user_id
        };
    } else {
        if (packet.sender.user_id == GROUPS_CONFIGURATIONS[packet.group_id][userToLock].locker) {
            GROUPS_CONFIGURATIONS[packet.group_id][userToLock] = {
                nickname: nicknameForLock,
                locker: packet.sender.user_id
            };
        } else {
            var msg = `该用户的群名片已由<${GROUPS_CONFIGURATIONS[packet.group_id][userToLock].locker}>锁定，请先联系ta解锁后再尝试锁定.`;
            message.prepare(packet, msg, true).send();
            return false;
        }
    }
    config.write("NICKNAME_LOCKER", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    message.changeNickname(packet.group_id, userToLock, nicknameForLock);
    var msg = `已成功锁定用户<${userInfo.nickname}(${userToLock})>的群名片为"${nicknameForLock}".`;
    message.prepare(packet, msg, true).send();
}

const unlock = (packet) => {
    var GROUPS_CONFIGURATIONS = config.get("NICKNAME_LOCKER", "GROUPS_CONFIGURATIONS");
    var options = cqcode.decode(packet.message).pureText.replace(/^#解锁群名片 */, "").split(" ");
    var userToUnlock = options.shift();
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id]) === "undefined") {
        var msg = `该用户的群名片未被锁定.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (typeof (GROUPS_CONFIGURATIONS[packet.group_id][userToUnlock]) === "undefined") {
        var msg = `该用户的群名片未被锁定.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    if (packet.sender.user_id != GROUPS_CONFIGURATIONS[packet.group_id][userToUnlock].locker) {
        var msg = `解铃还须系铃人，请联系锁定者(${GROUPS_CONFIGURATIONS[packet.group_id][userToUnlock].locker})解锁.`;
        message.prepare(packet, msg, true).send();
        return false;
    }
    var userInfo = message.userinfo(userToUnlock);
    delete GROUPS_CONFIGURATIONS[packet.group_id][userToUnlock];
    config.write("NICKNAME_LOCKER", GROUPS_CONFIGURATIONS, "GROUPS_CONFIGURATIONS");
    var msg = `已成功解锁用户<${userInfo.nickname}(${userToUnlock})>的群名片.`;
    message.prepare(packet, msg, true).send();
}

module.exports = {
    init,
    nicknameLocker,
    lock,
    unlock
}