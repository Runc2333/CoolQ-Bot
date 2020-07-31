/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const sharp = require("sharp");//图形库
const svgCaptcha = require("svg-captcha");//svg-captcha
const { findLastIndex } = require("lodash");
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const tool = require(`${processPath}/utils/toolbox.js`);

var authcache = [];
var token = null;
function init(t) {
    token = t;
    config.read({
        mode: "advanced",
        token: token,
        table: "pending-captcha",
        callback: (r) => {
            if (r.code === 0) {
                r = r.data;
                r.forEach((item) => {
                    var userId = item.target.toString();
                    var groupId = item.groupId.toString();
                    authcache.push(userId); // 推入缓存
                    message.send("group", item.groupId, `${cqcode.at(`${item.target}`)}\n因后端程序重启，验证时间已被重置.\n请在600秒内发送下图中的验证码，不区分大小写.\n若超时未发送, 您将会被移出群聊.${cqcode.image(`${item.image}`)}\n发送"换一张"可更换一张验证码.`);
                    message.send("private", item.target, `因后端程序重启，您在群组<${item.groupId}>内的人机验证时间已被重置为600秒，请尽快前往群内完成人机验证.\n若超时未完成，您将会被移出群组.`);
                    // 五分钟后提醒
                    setTimeout(function () {
                        config.read({
                            mode: "advanced",
                            token: token,
                            table: "pending-captcha",
                            condition: {
                                target: userId,
                                groupId: groupId
                            },
                            callback: (r) => {
                                if (r.code === 0) {
                                    r = r.data;
                                    if (r.length > 0) {
                                        message.send("group", item.groupId, `${cqcode.at(`${item.target}`)}\n您将在300秒后被移出群组，若要避免，请发送下图中的验证码，不区分大小写.${cqcode.image(`${item.image}`)}\n发送"换一张"可更换一张验证码.`);
                                        message.send("private", item.target, `您将在300秒后被移出群组<${item.groupId}>，请尽快前往群内完成人机验证.\n若超时未完成，您将会被移出群组.`);
                                    }
                                } else {
                                    log.write(`发生错误: ${r.msg}`, "入群验证", "ERROR");
                                }
                            }
                        });
                    }, 300 * 1000);
                    // 十分钟后提醒
                    setTimeout(function () {
                        config.read({
                            mode: "advanced",
                            token: token,
                            table: "pending-captcha",
                            condition: {
                                target: userId,
                                groupId: groupId
                            },
                            callback: (r) => {
                                if (r.code === 0) {
                                    r = r.data;
                                    if (r.length > 0) {
                                        message.send("group", item.groupId, `用户<${userId}>因超时未验证而离开了我们.`);
                                        message.send("private", item.target, `您已因超时未验证被移出群组<${groupId}>，若有需要，您可重新申请加入.`);
                                        setTimeout(function () {
                                            message.kick(item.groupId, item.target);
                                            config.remove({
                                                token: token,
                                                table: "pending-captcha",
                                                ID: r[0].ID,
                                                callback: (rr) => {
                                                    if (rr.code === 0) {
                                                        log.write("已处理超时用户.", "入群验证", "INFO");
                                                    } else if (rr.code === 1) {
                                                        log.write(`移出等待列表失败，原因：${rr.msg}.`, "入群验证", "ERROR");
                                                    } else {
                                                        log.write(`移出等待列表失败，未知原因.`, "入群验证", "ERROR");
                                                    }
                                                }
                                            });
                                        }, 5 * 1000);
                                    }
                                } else {
                                    log.write(`发生错误: ${r.msg}`, "入群验证", "ERROR");
                                }
                            }
                        });
                    }, 600 * 1000);
                });
            } else {
                log.write(`发生错误: ${r.msg}`, "入群验证", "ERROR");
            }
        }
    });
}

function captcha(packet) {
    message.checkSelfPermission(packet.group_id, (permission) => {
        if (permission) {
            var captchaImage = svgCaptcha.create({
                size: 6,
                ignoreChars: "iIlLoO0vVuUwW",
                noise: 2,
                background: "#FFFFFF",
                color: false
            });
            sharp(Buffer.from(captchaImage.data)).png().toBuffer().then(function (info) {
                var imageBase64 = `base64://${info.toString("base64")}`;
                config.write({
                    token: token,
                    table: "pending-captcha",
                    data: {
                        target: packet.user_id.toString(),
                        text: captchaImage.text.toLowerCase(),
                        image: imageBase64
                    },
                    packet: packet,
                    callback: (r) => {
                        if (r.code === 0) {
                            var userId = packet.user_id.toString();
                            var groupId = packet.group_id.toString();
                            authcache.push(userId); // 推入缓存
                            message.prepare(packet, `欢迎加入群聊！\n请在600秒内发送下图中的验证码，不区分大小写.\n若超时未发送, 您将会被移出群聊.${cqcode.image(imageBase64)}\n发送"换一张"可更换一张验证码.`, true).send();
                            message.send("private", packet.user_id, `您已成功加入群组<${packet.group_id}>，请尽快前往群内完成人机验证.\n若超时未完成，您将会被移出群组.`);
                            // 五分钟后提醒
                            setTimeout(function () {
                                config.read({
                                    mode: "advanced",
                                    token: token,
                                    table: "pending-captcha",
                                    condition: {
                                        target: userId,
                                        groupId: groupId
                                    },
                                    callback: (r) => {
                                        if (r.code === 0) {
                                            r = r.data;
                                            if (r.length > 0) {
                                                message.send("group", r[0].groupId, `${cqcode.at(`${r[0].target}`)}\n您将在300秒后被移出群组，若要避免，请发送下图中的验证码，不区分大小写.${cqcode.image(`${r[0].image}`)}\n发送"换一张"可更换一张验证码.`);
                                                message.send("private", r[0].target, `您将在300秒后被移出群组<${r[0].groupId}>，请尽快前往群内完成人机验证.\n若超时未完成，您将会被移出群组.`);
                                            }
                                        } else {
                                            log.write(`发生错误: ${r.msg}`, "入群验证", "ERROR");
                                        }
                                    }
                                });
                            }, 300 * 1000);
                            // 十分钟后提醒
                            setTimeout(function () {
                                config.read({
                                    mode: "advanced",
                                    token: token,
                                    table: "pending-captcha",
                                    condition: {
                                        target: userId,
                                        groupId: groupId
                                    },
                                    callback: (r) => {
                                        if (r.code === 0) {
                                            r = r.data;
                                            if (r.length > 0) {
                                                message.send("group", groupId, `用户<${userId}>因超时未验证而离开了我们.`);
                                                message.send("private", userId, `您已因超时未验证被移出群组<${groupId}>，若有需要，您可重新申请加入.`);
                                                setTimeout(function () {
                                                    message.kick(groupId, userId);
                                                    config.remove({
                                                        token: token,
                                                        table: "pending-captcha",
                                                        ID: r[0].ID,
                                                        callback: (rr) => {
                                                            if (rr.code === 0) {
                                                                log.write("已处理超时用户.", "入群验证", "INFO");
                                                            } else if (rr.code === 1) {
                                                                log.write(`移出等待列表失败，原因：${rr.msg}.`, "入群验证", "ERROR");
                                                            } else {
                                                                log.write(`移出等待列表失败，未知原因.`, "入群验证", "ERROR");
                                                            }
                                                        }
                                                    });
                                                }, 5 * 1000);
                                            }
                                        } else {
                                            log.write(`发生错误: ${r.msg}`, "入群验证", "ERROR");
                                        }
                                    }
                                });
                            }, 600 * 1000);
                        } else {
                            var msg = `[入群验证] 生成失败：${r.msg}.`;
                            message.prepare(packet, msg, true).send();
                        }
                    }
                });
            }).catch(function (err) {
                console.log(err);
                message.prepare(packet, `后端错误: 未能生成验证码图片.`, true).send();
            });
        } else {
            // message.prepare(packet, `欢迎加入群聊！\n因无管理员权限，入群验证能力已停用.`, true).send();
            return false;
        }
    });
}

function auth(packet) {
    if (authcache.indexOf(packet.user_id.toString()) !== -1 && /换一张/.test(cqcode.decode(packet.message).pureText) === false) {
        config.read({
            mode: "advanced",
            token: token,
            table: "pending-captcha",
            condition: {
                target: packet.user_id.toString(),
                groupId: packet.group_id.toString(),
            },
            callback: (r) => {
                if (r.code === 0) {
                    r = r.data;
                    if (r.length === 1) {
                        var similarity = tool.similarity(cqcode.decode(packet.message).pureText.toLowerCase().replace(/[^a-zA-Z]/g, ""), r[0].text);
                        if (similarity > 0.8 || eval(`/${r[0].text}/`).test(cqcode.decode(packet.message).pureText.toLowerCase())) {
                            authcache.splice(authcache.indexOf(packet.user_id.toString()), 1);
                            config.remove({
                                token: token,
                                table: "pending-captcha",
                                ID: r[0].ID,
                                callback: (rr) => {
                                    if (rr.code === 0) {
                                        message.prepare(packet, "[入群验证] 恭喜您通过了验证！", true).send();
                                    } else if (rr.code === 1) {
                                        var msg = `[入群验证] 移出等待列表失败，原因：${rr.msg}.`;
                                        message.prepare(packet, msg, true).send();
                                    } else {
                                        var msg = `[入群验证] 移出等待列表失败，未知原因.`;
                                        message.prepare(packet, msg, true).send();
                                    }
                                }
                            });
                        } else {
                            message.revoke(packet.message_id, packet);
                            message.prepare(packet, `输入的验证码有误, 请再试一次.\n在完成验证前，您无法进行发言.\n请发送下图中的验证码，不区分大小写.${cqcode.image(`${r[0].image}`)}\n发送"换一张"可更换一张验证码.`, true).send();
                        }
                    } else if (r.length === 0) {
                        // do nothing
                    } else {
                        log.write(`严重错误: 意料外的数据库结构`, "入群验证", "ERROR");
                        message.prepare(packet, `严重错误: 意料外的数据库结构.`, true).send();
                    }
                } else {
                    log.write(`发生错误: ${r.msg}`, "入群验证", "ERROR");
                }
            },
        });
        return true;
    } else {
        return false;
    }
}

function userExit(packet) {
    if (authcache.indexOf(packet.user_id.toString()) !== -1) {
        config.read({
            mode: "advanced",
            token: token,
            table: "pending-captcha",
            condition: {
                target: packet.user_id.toString(),
                groupId: packet.group_id.toString(),
            },
            callback: (r) => {
                if (r.code === 0) {
                    r = r.data;
                    if (r.length === 1) {
                        authcache.splice(authcache.indexOf(packet.user_id.toString()), 1);
                        config.remove({
                            token: token,
                            table: "pending-captcha",
                            ID: r[0].ID,
                            callback: (rr) => {
                                if (rr.code === 0) {
                                    log.write("已处理退群用户.", "入群验证", "INFO");
                                } else if (rr.code === 1) {
                                    log.write(`移出等待列表失败，原因：${rr.msg}.`, "入群验证", "ERROR");
                                } else {
                                    log.write(`移出等待列表失败，未知原因.`, "入群验证", "ERROR");
                                }
                            }
                        });
                    } else if (r.length === 0) {
                        // do nothing
                    } else {
                        log.write(`严重错误: 意料外的数据库结构`, "入群验证", "ERROR");
                        message.prepare(packet, `严重错误: 意料外的数据库结构.`, true).send();
                    }
                } else {
                    log.write(`发生错误: ${r.msg}`, "入群验证", "ERROR");
                }
            }
        });
    }
}

function refresh(packet) {
    if (authcache.indexOf(packet.user_id.toString()) !== -1) {
        var captchaImage = svgCaptcha.create({
            size: 6,
            ignoreChars: "iIlLoO0vVuUwW",
            noise: 2,
            background: "#FFFFFF",
            color: false
        });
        sharp(Buffer.from(captchaImage.data)).png().toBuffer().then(function (info) {
            var imageBase64 = `base64://${info.toString("base64")}`;
            config.write({
                token: token,
                table: "pending-captcha",
                data: {
                    target: packet.user_id.toString(),
                    text: captchaImage.text.toLowerCase(),
                    image: imageBase64
                },
                packet: packet,
                callback: (r) => {
                    if (r.code === 0) {
                        // var userId = packet.user_id.toString();
                        // var groupId = packet.group_id.toString();
                        message.prepare(packet, `验证码已被刷新，请发送下图中的验证码，不区分大小写.${cqcode.image(imageBase64)}\n发送"换一张"可更换一张验证码.`, true).send();
                    } else {
                        var msg = `[入群验证] 生成失败：${r.msg}.`;
                        message.prepare(packet, msg, true).send();
                    }
                }
            });
        }).catch(function (err) {
            console.log(err);
            message.prepare(packet, `后端错误: 未能生成验证码图片.`, true).send();
        });
    } else {
        message.prepare(packet, `禁止捣乱！`, true).send();
    }
    return true;
}

function manual(action, packet, [target] = []) {
    if (authcache.indexOf(target.toString()) !== -1) {
        config.read({
            mode: "advanced",
            token: token,
            table: "pending-captcha",
            condition: {
                target: target.toString(),
                groupId: packet.group_id.toString(),
            },
            callback: (r) => {
                if (r.code === 0) {
                    r = r.data;
                    if (r.length === 1) {
                        authcache.splice(authcache.indexOf(packet.user_id.toString()), 1);
                        config.remove({
                            token: token,
                            table: "pending-captcha",
                            ID: r[0].ID,
                            callback: (rr) => {
                                if (rr.code === 0) {
                                    switch (action) {
                                        case "pass":
                                            message.send("group", packet.group_id, `[入群验证] 已成功通过用户<${target}>的入群验证.`);
                                            break;
                                        case "decline":
                                            message.send("group", packet.group_id, `[入群验证] 已成功拒绝用户<${target}>的入群验证.`);
                                            message.send("private", target, `您已因管理员操作而被移出群组<${packet.group_id}>，若有需要，您可重新申请加入.`);
                                            setTimeout(function () {
                                                message.kick(packet.group_id, target);
                                            }, 5 * 1000);
                                            break;
                                    }
                                } else if (rr.code === 1) {
                                    log.write(`移出等待列表失败，原因：${rr.msg}.`, "入群验证", "ERROR");
                                    message.prepare(packet, `[入群验证] 无法完成所请求的操作，原因: ${rr.msg}.`, true).send();
                                } else {
                                    log.write(`移出等待列表失败，未知原因.`, "入群验证", "ERROR");
                                    message.prepare(packet, `[入群验证] 无法完成所请求的操作，未知原因.`, true).send();
                                }
                            }
                        });
                    } else if (r.length === 0) {
                        message.prepare(packet, `[入群验证] 无法完成所请求的操作，原因: 指定的目标不存在于验证队列中.`, true).send();
                        return false;
                    } else {
                        log.write(`严重错误: 意料外的数据库结构`, "入群验证", "ERROR");
                        message.prepare(packet, `严重错误: 意料外的数据库结构.`, true).send();
                    }
                } else {
                    log.write(`发生错误: ${r.msg}`, "入群验证", "ERROR");
                    message.prepare(packet, `[入群验证] 无法完成所请求的操作，原因: ${r.msg}.`, true).send();
                }
            }
        });
    } else {
        message.prepare(packet, `[入群验证] 无法完成所请求的操作，原因: 指定的目标不存在于验证队列中.`, true).send();
        return false;
    }
}

module.exports = {
    init,
    captcha,
    auth,
    userExit,
    refresh,
    manual,
}