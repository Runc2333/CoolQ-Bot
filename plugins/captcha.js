/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const sharp = require("sharp");//图形库
const svgCaptcha = require("svg-captcha");//svg-captcha
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const tool = require(`${processPath}/utils/toolbox.js`);

function init() {
    config.registerPlugin({
        type: "notice",
        subType: "groupIncrease",
        script: "captcha.js",
        handler: "captcha",
        description: "给新成员发送入群验证"
    });
    config.registerPlugin({
        type: "message",
        subType: "groupMessage",
        script: "captcha.js",
        handler: "auth",
        regex: "/./",
        description: "给新成员发送入群验证",
        notification: false
    });
    config.registerPlugin({
        type: "message",
        subType: "groupMessage",
        script: "captcha.js",
        handler: "refresh",
        regex: "/换一张/",
        description: "给新成员发送入群验证",
        notification: false
    });
    config.registerPlugin({
        type: "notice",
        subType: "groupDecrease",
        script: "captcha.js",
        handler: "userExit",
        description: "给新成员发送入群欢迎"
    });
    // config.registerSuperCommand({
    //     command: "captcha",
    //     script: "captcha.js",
    //     handler: "command",
    //     argument: "[action]",
    //     description: "入群验证插件入口, 以下是参数说明:\n[action]:\nenable - 启用入群验证.#admin\ndisable - 禁用入群验证.#admin"
    // });
    if (config.get("CAPTCHA") === false) {
        var data = {};
        // data["IGNORED_GROUPS"] = [];
        data["PENDING_CAPTCHA"] = [];
        config.write("CAPTCHA", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "CAPTCHA", "INFO");
    } else {
        var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
        for (key in PENDING_CAPTCHA) {
            message.send("group", PENDING_CAPTCHA[key].group, `${cqcode.at(`${PENDING_CAPTCHA[key].userId}`)}\n因后端程序重启，验证时间已被重置.\n请在600秒内发送下图中的验证码，不区分大小写.\n若超时未发送, 您将会被移出群聊.${cqcode.image(`${PENDING_CAPTCHA[key].image}`)}\n发送"换一张"可更换一张验证码.`);
            setTimeout(function () {
                var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
                for (key in PENDING_CAPTCHA) {
                    if (PENDING_CAPTCHA[key].userId == PENDING_CAPTCHA[key].userId) {
                        message.send("group", PENDING_CAPTCHA[key].group, `${cqcode.at(`${PENDING_CAPTCHA[key].userId}`)}\n您将在300秒后被移出群组，若要避免，请发送下图中的验证码，不区分大小写.${cqcode.image(PENDING_CAPTCHA[key].image)}\n发送"换一张"可更换一张验证码.`);
                        return true;
                    }
                }
            }, 300 * 1000);
            setTimeout(function () {
                var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
                for (key in PENDING_CAPTCHA) {
                    if (PENDING_CAPTCHA[key].userId == PENDING_CAPTCHA[key].userId) {
                        message.send("group", PENDING_CAPTCHA[key].group, `${cqcode.at(`${PENDING_CAPTCHA[key].userId}`)}\n您已因超时未验证被移出群聊，若有需要，您可重新申请加入.`);
                        var tmp = key;
                        setTimeout(function () {
                            var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
                            message.kick(PENDING_CAPTCHA[tmp].group, PENDING_CAPTCHA[tmp].userId);
                            PENDING_CAPTCHA.splice(tmp, 1);
                            config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
                        }, 5000);
                        return true;
                    }
                }
            }, 600 * 1000);
        }
    }
}

function captcha(packet) {
    if (message.checkSelfPermission(packet.group_id) === false) {
        message.prepare(packet, `欢迎加入群聊！\n因无管理员权限，入群验证能力已停用.`, true).send();
        return false;
    }
    // var IGNORED_GROUPS = config.get("CAPTCHA", "IGNORED_GROUPS");
    // if (IGNORED_GROUPS.indexOf(packet.group_id.toString()) !== -1) {
    //     return false;
    // }
    var captchaImage = svgCaptcha.create({
        size: 6,
        ignoreChars: "iIlLoOq10WMVwmvDUuVvasdf",
        noise: 2,
        background: "#FFFFFF",
        color: false
    });
    sharp(Buffer.from(captchaImage.data)).png().toBuffer().then(function (info) {
        var imageBase64 = `base64://${info.toString("base64")}`;
        var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
        PENDING_CAPTCHA.push({
            group: packet.group_id.toString(),
            userId: packet.user_id.toString(),
            text: captchaImage.text.toLowerCase(),
            image: imageBase64
        });
        // console.log(PENDING_CAPTCHA);
        config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
        message.prepare(packet, `欢迎加入群聊！\n请在600秒内发送下图中的验证码，不区分大小写.\n若超时未发送, 您将会被移出群聊.${cqcode.image(imageBase64)}\n发送"换一张"可更换一张验证码.`, true).send();
        setTimeout(function () {
            var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
            for (key in PENDING_CAPTCHA) {
                if (PENDING_CAPTCHA[key].userId == packet.user_id.toString()) {
                    message.prepare(packet, `您将在300秒后被移出群组，若要避免，请发送下图中的验证码，不区分大小写.${cqcode.image(imageBase64)}\n发送"换一张"可更换一张验证码.`, true).send();
                    // console.log("Timer1 Done.");
                    return true;
                }
            }
        }, 300 * 1000);
        setTimeout(function () {
            var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
            for (key in PENDING_CAPTCHA) {
                if (PENDING_CAPTCHA[key].userId == packet.user_id.toString()) {
                    message.prepare(packet, `您已因超时未验证被移出群聊，若有需要，您可重新申请加入.`, true).send();
                    PENDING_CAPTCHA.splice(key, 1);
                    config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
                    setTimeout(function () {
                        message.kick(packet.group_id, packet.user_id);
                    }, 5000);
                    return true;
                }
            }
        }, 600 * 1000);
    }).catch(function (err) {
        message.prepare(packet, `后端错误: 未能生成验证码图片.`, true).send();
    });
}

function auth(packet) {
        // console.log(cqcode.decode(packet.message).pureText);
        var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
        for (key in PENDING_CAPTCHA) {
            if (PENDING_CAPTCHA[key].userId == packet.user_id.toString() && PENDING_CAPTCHA[key].group == packet.group_id.toString() && /换一张/.test(cqcode.decode(packet.message).pureText) === false) {
                if (cqcode.decode(packet.message).pureText.toLowerCase() == PENDING_CAPTCHA[key].text) {
                    PENDING_CAPTCHA.splice(key, 1);
                    // console.log(PENDING_CAPTCHA);
                    config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
                    message.prepare(packet, "恭喜您通过了验证！", true).send();
                } else {
                    // console.log(packet);
                    message.revoke(packet.message_id, packet);
                    if (cqcode.decode(packet.message).pureText.length == 6) {
                        message.prepare(packet, `输入的验证码有误, 请再试一次.\n相似度:${(tool.similarity(cqcode.decode(packet.message).pureText.toLowerCase(), PENDING_CAPTCHA[key].text) * 100).toFixed(2)}%\n请发送下图中的验证码，不区分大小写.${cqcode.image(`${PENDING_CAPTCHA[key].image}`)}\n发送"换一张"可更换一张验证码.`, true).send();
                    } else {
                        message.prepare(packet, `请先通过验证后再进行发言，验证码长度为6位.\n请发送下图中的验证码，不区分大小写.${cqcode.image(`${PENDING_CAPTCHA[key].image}`)}\n发送"换一张"可更换一张验证码.`, true).send();
                    }
                }
            } else if (PENDING_CAPTCHA[key].userId != packet.user_id.toString() && PENDING_CAPTCHA[key].group == packet.group_id.toString() && cqcode.decode(packet.message).pureText.toLowerCase() == PENDING_CAPTCHA[key].text) {
                message.revoke(packet.message_id, packet);
                message.mute(packet.group_id, packet.sender.user_id, 60);
                message.prepare(packet, `请不要试图帮助他人完成验证码。`, true).send();
            }
        }
}

function userExit(packet) {
    var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
    for (key in PENDING_CAPTCHA) {
        if (PENDING_CAPTCHA[key].userId == packet.user_id.toString() && PENDING_CAPTCHA[key].group == packet.group_id.toString()) {
            PENDING_CAPTCHA.splice(key, 1);
        }
    }
    // console.log(PENDING_CAPTCHA);
    config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
}

function refresh(packet) {
    var PENDING_CAPTCHA = config.get("CAPTCHA", "PENDING_CAPTCHA");
    var keyToChange = -1;
    for (key in PENDING_CAPTCHA) {
        if (PENDING_CAPTCHA[key].userId == packet.user_id.toString() && PENDING_CAPTCHA[key].group == packet.group_id.toString()) {
            keyToChange = key;
        }
    }
    if (keyToChange !== -1) {
        var captchaImage = svgCaptcha.create({
            size: 6,
            ignoreChars: "iIlLoOq10WMVwmvDUuVvasdfASF7",
            noise: 2,
            background: "#FFFFFF",
            color: false
        });
        sharp(Buffer.from(captchaImage.data)).png().toBuffer().then(function (info) {
            var imageBase64 = `base64://${info.toString("base64")}`;
            PENDING_CAPTCHA[keyToChange] = {
                group: packet.group_id.toString(),
                userId: packet.user_id.toString(),
                text: captchaImage.text.toLowerCase(),
                image: imageBase64
            };
            // console.log(PENDING_CAPTCHA);
            config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
            message.prepare(packet, `验证码已被刷新，请发送下图中的验证码，不区分大小写.${cqcode.image(imageBase64)}`, true).send();
        }).catch(function (err) {
            message.prepare(packet, `后端错误: 未能生成验证码图片.`, true).send();
        });
    }
    config.write("CAPTCHA", PENDING_CAPTCHA, "PENDING_CAPTCHA");
}

// function command(packet) {
//     var options = cqcode.decode(packet.message).pureText.split(" ");
//     switch (options[1]) {
//         case "enable":
//             var IGNORED_GROUPS = config.get("CAPTCHA", "IGNORED_GROUPS");
//             var index = IGNORED_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
//             if (index === -1) {
//                 //处于启用状态
//                 var msg = "[Captcha] 已经是启用状态了, 无需重复启用.";
//             } else {
//                 //处于禁用状态
//                 IGNORED_GROUPS.splice(index, 1);
//                 config.write("CHATBOT", IGNORED_GROUPS, "IGNORED_GROUPS");
//                 var msg = "[Captcha] 成功启用入群验证功能，从现在开始，新加群的成员将需要完成验证码.";
//             }
//             message.prepare(packet, msg, true).send();
//             break;
//         case "disable":
//             var IGNORED_GROUPS = config.get("CAPTCHA", "IGNORED_GROUPS");
//             var index = IGNORED_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
//             if (index === -1) {
//                 //处于启用状态
//                 IGNORED_GROUPS.push(userId.toString());
//                 config.write("CHATBOT", IGNORED_GROUPS, "IGNORED_GROUPS");
//                 var msg = "[Captcha] 成功禁用入群验证功能，从现在开始，新加群的成员将不需要进行验证.";
//             } else {
//                 //处于禁用状态
//                 var msg = "[Captcha] 已经是禁用状态了, 无需重复禁用.";
//             }
//             message.prepare(packet, msg, true).send();
//             break;
//         default:
//             log.write("处理失败:未知指令.", "CAPTCHA", "WARNING");
//             var msg = "[Captcha] 未知指令.";
//             message.prepare(packet, msg, true).send();
//             return false;
//     }
// }

module.exports = {
    init,
    captcha,
    auth,
    userExit,
    refresh,
    // command
}