/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

var token = null;
function init(t) {
    token = t;
}

function welcome(packet) {
    config.read({
        mode: "standard",
        token: token,
        table: "message",
        condition: packet,
        callback: (r) => {
            if (r.code === 0) {
                r = r.data;
                if (r.length == 1) {
                    message.prepare(packet, r[0].message, true).send();
                } else {
                    // do nothing
                }
            } else {
                log.write(`发生错误: ${r.msg}`, "入群欢迎", "ERROR");
            }
        }
    });
}

function set(packet, string) {
    config.write({
        token: token,
        table: "message",
        data: {
            "message": string,
        },
        packet: packet,
        callback: (r) => {
            if (r.code === 0) {
                var msg = "[入群欢迎] 已成功注册欢迎语.";
                message.prepare(packet, msg, true).send();
            } else {
                var msg = `[入群欢迎] 欢迎语注册失败：${r.msg}.`;
                message.prepare(packet, msg, true).send();
            }
        }
    });
    return true;
}

function remove(packet) {
    config.read({
        mode: "standard",
        token: token,
        table: "message",
        condition: packet,
        callback: (r) => {
            if (r.code === 0) {
                r = r.data;
                if (r.length == 1) {
                    config.remove({
                        token: token,
                        table: "message",
                        ID: r[0].ID,
                        callback: (rr) => {
                            if (rr.code === 0) {
                                var msg = "[入群欢迎] 已移除指定的欢迎语.";
                            } else if (rr.code === 1) {
                                var msg = `[入群欢迎] 移除欢迎语失败，原因：${rr.msg}.`;
                                log.write(`发生错误: ${rr.msg}`, "入群欢迎", "ERROR");
                            } else {
                                var msg = `[入群欢迎] 移除欢迎语失败，未知原因.`;
                            }
                            message.prepare(packet, msg, true).send();
                        }
                    });
                } else {
                    // do nothing
                    var msg = `[入群欢迎] 移除欢迎语失败，原因：未设置任何欢迎语.`;
                    message.prepare(packet, msg, true).send();
                }
            } else {
                var msg = `[入群欢迎] 移除欢迎语失败，原因：${rr.msg}.`;
                message.prepare(packet, msg, true).send();
                log.write(`发生错误: ${r.msg}`, "入群欢迎", "ERROR");
            }
        }
    });
    return true;
}

function display(packet) {
    config.read({
        mode: "standard",
        token: token,
        table: "message",
        condition: packet,
        callback: (r) => {
            if (r.code === 0) {
                r = r.data;
                if (r.length == 1) {
                    message.prepare(packet, `[入群欢迎] 本群目前设置的入群欢迎语如下：\n${r[0].message}`, true).send();
                } else {
                    message.prepare(packet, `[入群欢迎] 本群目前未设置任何入群欢迎语.\n使用指令"#设置欢迎语_[欢迎语]"来设置入群欢迎语.`, true).send();
                }
            } else {
                log.write(`发生错误: ${r.msg}`, "入群欢迎", "ERROR");
            }
        }
    });
}

module.exports = {
    init,
    welcome,
    set,
    remove,
    display,
}