/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

var token = null;
var cache = {};
function init(t) {
    token = t;
}

const modemap = {
    "accurate": 0,
    "fuzzy": 1,
    "regexp": 2,
}

const modemapReverse = [
    "accurate",
    "fuzzy",
    "regexp",
]

function keyword(packet) {
    if (typeof (cache[packet.group_id.toString()]) === "undefined") {
        // console.log(`Info: Trying to read database.`);
        config.read({
            mode: "standard",
            token: token,
            table: "matchrules",
            condition: packet,
            callback: (r) => {
                if (r.code === 0) {
                    r = r.data;
                    cache[packet.group_id.toString()] = r;
                    r.forEach((item) => {
                        switch (modemapReverse[item.mode]) {
                            case "accurate":
                                if ((new RegExp(`^${item.target}$`)).test(packet.message)) {
                                    message.prepare(packet, item.answer, true).send();
                                }
                                break;
                            default:
                                if ((new RegExp(item.target)).test(packet.message)) {
                                    message.prepare(packet, item.answer, true).send();
                                }
                                break;
                        }
                    });
                } else {
                    log.write(`发生错误: ${r.msg}`, "问答系统", "ERROR");
                }
            }
        });
        if (typeof (msg) === "undefined") {
            return false;
        }
    } else {
        cache[packet.group_id.toString()].forEach((item) => {
            switch (item.mode) {
                case "accurate":
                    if ((new RegExp(`^${item.target}$`)).test(packet.message)) {
                        message.prepare(packet, item.answer, true).send();
                    }
                    break;
                default:
                    if ((new RegExp(item.target)).test(packet.message)) {
                        message.prepare(packet, item.answer, true).send();
                    }
                    break;
            }
        });
    }
}

function add(mode, packet, [target, answer] = []) {
    config.write({
        token: token,
        table: "matchrules",
        data: {
            "mode": modemap[mode],
            "target": target,
            "answer": answer,
        },
        packet: packet,
        callback: (r) => {
            if (r.code === 0) {
                var msg = "[问答系统] 已成功注册指定问答.";
                message.prepare(packet, msg, true).send();
                config.read({
                    mode: "standard",
                    token: token,
                    table: "matchrules",
                    condition: packet,
                    callback: (r) => {
                        if (r.code === 0) {
                            r = r.data;
                            cache[packet.group_id.toString()] = r;
                        } else {
                            log.write(`发生错误: ${r.msg}`, "问答系统", "ERROR");
                        }
                    }
                });
            } else {
                var msg = `[问答系统] 问答注册失败：${r.msg}.`;
                message.prepare(packet, msg, true).send();
            }
        }
    });
}

function remove(packet, [ID] = []) {
    config.read({
        mode: "standard",
        token: token,
        table: "matchrules",
        condition: {
            groupId: packet.group_id,
            ID: ID,
        },
        callback: (r) => {
            if (r.code === 0) {
                r = r.data;
                if (r.length === 1) {
                    config.remove({
                        token: token,
                        table: "matchrules",
                        ID: ID,
                        callback: (rr) => {
                            if (rr.code === 0) {
                                var msg = "[问答系统] 已移除指定的问答.";
                            } else if (rr.code === 1) {
                                var msg = `[问答系统] 移除问答失败，原因：${rr.msg}.`;
                            } else {
                                var msg = `[问答系统] 移除问答失败，未知原因.`;
                            }
                            message.prepare(packet, msg, true).send();
                        }
                    });
                } else {
                    var msg = `[问答系统] 移除问答失败，原因：指定的ID不存在.`;
                    message.prepare(packet, msg, true).send();
                }
            } else {
                log.write(`发生错误: ${r.msg}`, "问答系统", "ERROR");
                var msg = `[问答系统] 移除问答失败，原因：${r.msg}.`;
                message.prepare(packet, msg, true).send();
            }
        },
    });

}

function display(packet) {
    config.read({
        mode: "standard",
        token: token,
        table: "matchrules",
        condition: packet,
        callback: (r) => {
            if (r.code === 0) {
                r = r.data;
                cache[packet.group_id.toString()] = r;
                if (r.length > 0) {
                    var msg = "以下是目前注册到问答系统的所有问答:";
                    r.forEach((item) => {
                        switch (item.mode) {
                            case "accurate":
                                msg += `\n问答ID：${item.ID}\n`
                                msg += `匹配模式：精确匹配\n`
                                msg += `问题：${item.target}\n`;
                                msg += `回答：${item.answer}\n`;
                                break;
                            case "fuzzy":
                                msg += `\n问答ID：${item.ID}\n`
                                msg += `匹配模式：模糊匹配\n`
                                msg += `问题：${item.target}\n`;
                                msg += `回答：${item.answer}\n`;
                                break;
                            case "regexp":
                                msg += `\n问答ID：${item.ID}\n`
                                msg += `匹配模式：正则表达式\n`
                                msg += `问题：${item.target}\n`;
                                msg += `回答：${item.answer}\n`;
                                break;
                        }
                    });
                } else {
                    console.log(r);
                    var msg = "[问答系统] 当前群组未注册任何问答.";
                }
                message.prepare(packet, msg, true).send();
            } else {
                log.write(`发生错误: ${r.msg}`, "问答系统", "ERROR");
            }
        }
    });
}

function refreshCache() {
    // console.log(`Refreshing cache...`);
    Object.keys(cache).forEach((key) => {
        config.read({
            mode: "advanced",
            token: token,
            table: "matchrules",
            callback: (r) => {
                if (r.code === 0) {
                    r = r.data;
                    var wipedGroup = [];
                    r.forEach((item) => {
                        if (wipedGroup.indexOf(item.groupId) === -1) {
                            wipedGroup.push(item.groupId);
                            cache[item.groupId] = [];
                        }
                        cache[item.groupId].push(item);
                    });
                } else {
                    log.write(`发生错误: ${r.msg}`, "问答系统", "ERROR");
                }
            }
        });
    });
}

setInterval(() => {
    refreshCache();
}, 60000);

module.exports = {
    init,
    keyword,
    add,
    remove,
    display
}