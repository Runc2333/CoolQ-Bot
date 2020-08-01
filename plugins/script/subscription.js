/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const log = require(`${processPath}/utils/logger.js`);//日志
const tool = require(`${processPath}/utils/toolbox.js`);

var token = null;
function init(t) {
    token = t;
    refreshPackageCache(() => {
        refreshSubscriptionCache(() => {
            refreshGroupMember();
        });
    });
}

var packageCache = {};
var subscriptionCache = {};
var reminded = [];
var cacheReady = false;
const package = {
    "free": "免费套餐",
    "basic": "基础套餐",
    "premium": "高级套餐"
}
function check(mode, packet) {
    if (!cacheReady) {
        return false;
    }
    if (typeof (subscriptionCache[packet.group_id.toString()]) === "undefined") {
        // console.log("CREATE");
        config.write({
            token: token,
            table: "records",
            data: {
                code: "FREE",
                messageCurrent: 0,
                memberCurrent: 0,
                operator: "system",
            },
            packet: packet,
            callback: (r) => {
                // do nothing
            },
        });
        return false;
    }
    if (subscriptionCache[packet.group_id.toString()].state) {
        // console.log("VAILD");
        // console.log(subscriptionCache[packet.group_id.toString()]);
        config.read({
            mode: "standard",
            table: "records",
            token: token,
            condition: packet,
            callback: (r) => {
                if (r.code === 0) {
                    r = r.data;
                    if (r.length === 1) {
                        config.write({
                            token: token,
                            table: "records",
                            data: {
                                messageCurrent: Math.round(r[0].messageCurrent) + 1
                            },
                            packet: packet,
                            callback: (r) => {
                                // do nothing
                            },
                        });
                    } else {
                        config.write({
                            token: token,
                            table: "records",
                            data: {
                                code: "FREE",
                                messageCurrent: 0,
                                memberCurrent: 0,
                                operator: "system",
                            },
                            packet: packet,
                            callback: (r) => {
                                // do nothing
                            },
                        });
                    }
                } else {
                    log.write(`发生错误: ${r.msg}`, "订阅管理", "ERROR");
                }
            }
        });
        return false;
    } else {
        // console.log(`[EXPIRE] GROUP <${packet.group_id}>`);
        if ((new RegExp(`^${config.sys("BOT_NAME")}|${config.sys("BOT_NAME")}$|\\[CQ:at,qq=${config.sys("BOT_QQNUM")}\\]`)).test(packet.message)) {
            // 测试用
            // console.log(`[MENTION] GROUP <${packet.group_id}>`);
            // console.log(`当前群内订阅已达到配额，老人机将停止处理本群的消息，直至配额恢复.\n套餐类型：${package[subscriptionCache[packet.group_id.toString()].grade]}\n过期时间：${tool.formatTime(subscriptionCache[packet.group_id.toString()].validity)}\n消息处理量：[${subscriptionCache[packet.group_id.toString()].messageCurrent} / ${subscriptionCache[packet.group_id.toString()].messageQuota}]\n群人数：[${subscriptionCache[packet.group_id.toString()].memberCurrent} / ${subscriptionCache[packet.group_id.toString()].memberQuota}]`);

            message.prepare(packet, `当前群内订阅已达到配额，老人机将停止处理本群的消息，直至配额恢复.\n套餐类型：${package[subscriptionCache[packet.group_id.toString()].grade]}\n过期时间：${tool.formatTime(subscriptionCache[packet.group_id.toString()].validity)}\n消息处理量：[${subscriptionCache[packet.group_id.toString()].messageCurrent} / ${subscriptionCache[packet.group_id.toString()].messageQuota}]\n群人数：[${subscriptionCache[packet.group_id.toString()].memberCurrent} / ${subscriptionCache[packet.group_id.toString()].memberQuota}]`).send();
            return "forceskip";
        } else {
            if (reminded.indexOf(packet.group_id) === -1) {
                // 测试用
                // console.log(`[REMIND] GROUP <${packet.group_id}>`);
                // console.log(`当前群内订阅已达到配额，老人机将停止处理本群的消息，直至配额恢复.\n套餐类型：${package[subscriptionCache[packet.group_id.toString()].grade]}\n过期时间：${tool.formatTime(subscriptionCache[packet.group_id.toString()].validity)}\n消息处理量：[${subscriptionCache[packet.group_id.toString()].messageCurrent} / ${subscriptionCache[packet.group_id.toString()].messageQuota}]\n群人数：[${subscriptionCache[packet.group_id.toString()].memberCurrent} / ${subscriptionCache[packet.group_id.toString()].memberQuota}]`);

                reminded.push(packet.group_id);
                message.prepare(packet, `当前群内订阅已达到配额，老人机将停止处理本群的消息，直至配额恢复.\n套餐类型：${package[subscriptionCache[packet.group_id.toString()].grade]}\n过期时间：${tool.formatTime(subscriptionCache[packet.group_id.toString()].validity)}\n消息处理量：[${subscriptionCache[packet.group_id.toString()].messageCurrent} / ${subscriptionCache[packet.group_id.toString()].messageQuota}]\n群人数：[${subscriptionCache[packet.group_id.toString()].memberCurrent} / ${subscriptionCache[packet.group_id.toString()].memberQuota}]`).send();
            }
            return "forceskip";
        }
    }
}

function refreshSubscriptionCache(callback = false) {
    config.read({
        mode: "standard",
        table: "records",
        token: token,
        callback: (r) => {
            if (r.code === 0) {
                r = r.data;
                r.forEach((group) => {
                    if (typeof (packageCache[group.code]) === "undefined") {
                        refreshPackageCache(function () {
                            subscriptionCache[group.groupId.toString()] = {
                                state: (packageCache[group.code].memberQuota >= parseInt(group.memberCurrent) && packageCache[group.code].messageQuota >= parseInt(group.messageCurrent) && parseInt(packageCache[group.code].validity) >= Math.round((new Date()).getTime() / 1000)) ? true : false,
                                grade: packageCache[group.code].grade,
                                memberQuota: parseInt(packageCache[group.code].memberQuota),
                                messageQuota: parseInt(packageCache[group.code].messageQuota),
                                validity: parseInt(packageCache[group.code].validity),
                                memberCurrent: parseInt(group.memberCurrent),
                                messageCurrent: parseInt(group.messageCurrent),
                            }
                        });
                    } else {
                        subscriptionCache[group.groupId.toString()] = {
                            state: (packageCache[group.code].memberQuota >= parseInt(group.memberCurrent) && packageCache[group.code].messageQuota >= parseInt(group.messageCurrent) && parseInt(packageCache[group.code].validity) >= Math.round((new Date()).getTime() / 1000)) ? true : false,
                            grade: packageCache[group.code].grade,
                            memberQuota: parseInt(packageCache[group.code].memberQuota),
                            messageQuota: parseInt(packageCache[group.code].messageQuota),
                            validity: parseInt(packageCache[group.code].validity),
                            memberCurrent: parseInt(group.memberCurrent),
                            messageCurrent: parseInt(group.messageCurrent),
                        }
                    }
                });
                if (callback) {
                    callback();
                }
                cacheReady = true;
            } else {
                log.write(`发生错误: ${r.msg}`, "订阅管理", "ERROR");
            }
        }
    });
}
setInterval(function () {
    refreshPackageCache(() => {
        refreshSubscriptionCache();
    });
}, 1 * 60 * 1000);

function refreshPackageCache(callback = false) {
    config.read({
        mode: "standard",
        table: "global-activation-code",
        token: token,
        callback: (r) => {
            if (r.code === 0) {
                r = r.data;
                r.forEach((package) => {
                    packageCache[package.code] = {
                        grade: package.grade,
                        memberQuota: parseInt(package.memberQuota),
                        messageQuota: parseInt(package.messageQuota),
                        validity: parseInt(package.validity),
                        firstActivated: parseInt(package.firstActivated),
                        lastActivated: parseInt(package.lastActivated),
                        owner: package.owner,
                    }
                });
                if (callback) {
                    callback();
                }
            } else {
                log.write(`发生错误: ${r.msg}`, "订阅管理", "ERROR");
            }
        }
    });
}

function refreshGroupMember() {
    message.getGroupList((a) => {
        a.forEach((item) => {
            message.getGroupInfoAsync(item.group_id, (info) => {
                if (!cacheReady) {
                    return false;
                }
                if (typeof (subscriptionCache[item.group_id.toString()]) === "undefined") {
                    // console.log("CREATE");
                    config.write({
                        token: token,
                        table: "records",
                        data: {
                            code: "FREE",
                            messageCurrent: 0,
                            memberCurrent: info.member_count,
                            operator: "system",
                        },
                        packet: {
                            group_id: item.group_id
                        },
                        callback: (r) => {
                            // do nothing
                        },
                    });
                    return false;
                } else {
                    config.write({
                        token: token,
                        table: "records",
                        data: {
                            memberCurrent: info.member_count,
                        },
                        packet: {
                            group_id: item.group_id
                        },
                        callback: (r) => {
                            // console.log(r);
                            // do nothing
                        }
                    });
                }
            });
        });
    });
}

setInterval(() => {
    refreshGroupMember();
}, 60 * 60 * 1000);

function status(packet) {
    message.prepare(packet, `以下是本群当前的订阅状态：\n套餐类型：${package[subscriptionCache[packet.group_id.toString()].grade]}\n过期时间：${tool.formatTime(subscriptionCache[packet.group_id.toString()].validity)}\n消息处理量：[${subscriptionCache[packet.group_id.toString()].messageCurrent} / ${subscriptionCache[packet.group_id.toString()].messageQuota}]\n群人数：[${subscriptionCache[packet.group_id.toString()].memberCurrent} / ${subscriptionCache[packet.group_id.toString()].memberQuota}]`).send();
}

function refresh(packet, code) {
    refreshPackageCache(() => {
        config.read({
            mode: "advanced",
            token: token,
            table: "global-activation-code",
            condition: {
                code: code
            },
            callback: (r) => {
                if (r.code === 0) {
                    r = r.data;
                    if (r.length === 1) {
                        config.read({
                            mode: "advanced",
                            token: token,
                            table: "records",
                            condition: {
                                code: code
                            },
                            callback: (rr) => {
                                if (rr.code === 0) {
                                    rr = rr.data;
                                    if (rr.length === 0 || code == "FREE") {
                                        config.write({
                                            token: token,
                                            table: "records",
                                            data: {
                                                code: code,
                                                operator: packet.user_id,
                                            },
                                            packet: packet,
                                            callback: (rrr) => {
                                                refreshSubscriptionCache(() => {
                                                    message.prepare(packet, `已成功更新订阅码，以下是本群当前的订阅状态：\n套餐类型：${package[subscriptionCache[packet.group_id.toString()].grade]}\n过期时间：${tool.formatTime(subscriptionCache[packet.group_id.toString()].validity)}\n消息处理量：[${subscriptionCache[packet.group_id.toString()].messageCurrent} / ${subscriptionCache[packet.group_id.toString()].messageQuota}]\n群人数：[${subscriptionCache[packet.group_id.toString()].memberCurrent} / ${subscriptionCache[packet.group_id.toString()].memberQuota}]`).send();
                                                });
                                            },
                                        });
                                    } else {
                                        if (rr[0].groupId == packet.group_id) {
                                            message.prepare(packet, `当前群组的订阅码已经是[${code}]了.`).send();
                                        } else {
                                            message.prepare(packet, `该订阅码已由群组<${rr[0].groupId}>使用，请先将群组<${rr[0].groupId}>的订阅码注册为"FREE"后再尝试在当前群组注册改订阅码.`).send();
                                        }
                                    }
                                } else {
                                    log.write(`发生错误: ${rr.msg}`, "订阅管理", "ERROR");
                                    message.prepare(packet, `发生错误: ${rr.msg}`).send();
                                }
                            }
                        });
                    } else {
                        message.prepare(packet, `指定的订阅码[${code}]无效，请检查您的输入.`).send();
                    }
                } else {
                    log.write(`发生错误: ${r.msg}`, "订阅管理", "ERROR");
                    message.prepare(packet, `发生错误: ${r.msg}`).send();
                }
            }
        });
    });
}

module.exports = {
    init,
    check,
    refreshSubscriptionCache,
    refreshPackageCache,
    refreshGroupMember,
    status,
    refresh,
}