/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const crypto = require("crypto");
const imageModeration = require(`${processPath}/sdk/moderation/image_moderation.js`);//图片审核SDK
const textModeration = require(`${processPath}/sdk/moderation/moderation_text.js`);//文本审核SDK
const moderationUtils = require(`${processPath}/sdk/moderation/utils.js`);//信息审核SDK依赖

config.registerPlugin({
    type: "message",
    subType: "groupMessage, discussMessage",
    script: "../systemPlugin/moderation.js",
    handler: "moderation",
    regex: "/./",
    description: "审核群聊内容，自动过滤违规信息.",
    notification: false,
    skip: false
});
if (config.get("GLOBAL", "HUAWEI_CLOUD_APP_KEY") === false || config.get("GLOBAL", "HUAWEI_CLOUD_APP_SECRET") === false) {
    log.write("未找到APP_KEY，信息检测功能将不会运行.", "信息检测", "ERROR");
}

function moderation(packet) {
    var alreadySent = false;
    var messageToScan = cqcode.decode(packet.message);
    var reason = [];
    var trace = `${packet.message_id}${new Date().getTime()}`.toString();
    var traceId = crypto.createHmac("sha1", trace).digest("hex");
    const HUAWEI_CLOUD_APP_KEY = config.get("GLOBAL", "HUAWEI_CLOUD_APP_KEY");
    const HUAWEI_CLOUD_APP_SECRET = config.get("GLOBAL", "HUAWEI_CLOUD_APP_SECRET");
    moderationUtils.initRegion("cn-north-4");
    if (messageToScan.pureText.length > 12) {
        log.write("正在检测信息...", "触发文本检测", "INFO");
        // 文本检测
        textModeration.moderation_text_aksk(HUAWEI_CLOUD_APP_KEY, HUAWEI_CLOUD_APP_SECRET, [{
            "text": messageToScan.pureText,
            "type": "content"
        }], ["ad", "politics", "contraband"], function (result) {
            if (typeof (result.error_code) !== "undefined") {
                log.write(`${result.error_message}`, "文本检测失败", "ERROR");
                message.prepare(packet, `审核文本内容时出现错误:\n${result.error_message}`, false).send();
                return false;
            }
            if (result.result.suggestion == "block") {
                const possibleReasons = {
                    ad: "广告内容",
                    // abuse: "辱骂内容",
                    politics: "政治敏感",
                    // porn: "色情内容",
                    contraband: "违禁品"
                };
                Object.keys(result.result.detail).forEach((key) => {
                    reason.push(possibleReasons[key]);
                });
                log.write(`违规文本: ${reason.join("、")}`, "文本检测结果", "INFO");
                if (alreadySent === false) {
                    alreadySent = true;
                    sendResult(traceId, reason, packet);
                } else {
                    log.write(`太晚了：消息已因图片违规被撤回.`, "文本检测结果", "INFO");
                }
            } else {
                log.write("常规文本", "文本检测结果", "INFO");
            }
        });
    }
    // 图片检测 暂时停用
    // if (messageToScan.CQObjects.length > 0) {
    //     messageToScan.CQObjects.forEach(function (value, _key) {
    //         if (value.type == "image") {
    //             log.write("正在检测图像...", "触发图像检测", "INFO");
    //             var res = request("GET", value.url);
    //             var image = res.getBody().toString("base64");
    //             imageModeration.image_content_aksk(HUAWEI_CLOUD_APP_KEY, HUAWEI_CLOUD_APP_SECRET, image, "", ["politics", "terrorism", "porn"], "", function (result) {
    //                 // console.log(result.result);
    //                 if (result.result.suggestion == "block") {
    //                     const possibleReasons = {
    //                         ad: "广告内容",
    //                         politics: "政治敏感",
    //                         porn: "色情内容",
    //                         terrorism: "暴恐内容"
    //                     };
    //                     Object.keys(result.result.category_suggestions).forEach((key) => {
    //                         if (result.result.category_suggestions[key] == "block" && reason.indexOf(possibleReasons[key]) === -1) {
    //                             reason.push(possibleReasons[key]);
    //                         }
    //                     });
    //                     log.write(`违规图片: ${reason.join("、")}`, "图像检测结果", "INFO");
    //                     if (alreadySent === false) {
    //                         alreadySent = true;
    //                         sendResult(traceId, reason, packet);
    //                     } else {
    //                         log.write(`太晚了：消息已因文本违规被撤回.`, "图像检测结果", "INFO");
    //                     }
    //                 } else {
    //                     log.write("常规图片", "图像检测结果", "INFO");
    //                 }
    //             });
    //         }
    //     });
    // }
}

function sendResult(traceId, reason, packet) {
    // 检测到违规信息
    const MORDERATION_NOTIFICATION_GROUP = config.get("GLOBAL", "MORDERATION_NOTIFICATION_GROUP");
    if (message.checkSelfPermission(packet.group_id) === false) {
        log.write("违规信息: 机器人权限不足，无法撤回.", "内容检测结果", "WARNIING");
        message.prepare(packet, `您的消息触发了审计规则，但机器人权限不足，无法撤回.\n请赋予机器人管理员权限或主动处理此条信息.\n信息已被转发至♻️废纸篓(${MORDERATION_NOTIFICATION_GROUP})，若有误判，您可加群后联系管理员反馈，帮助我们改进识别算法.\nTrace ID: ${traceId}`, true).send();
        message.prepare(packet, `提示: 本能力可通过使用指令"/disable ../systemPlugin/moderation.js"来禁用.\n禁用后，机器人将不会检测聊天内容.`, false).send();
    } else {
        if (message.revoke(packet.message_id, packet) === true) {
            log.write("违规信息: 已撤回.", "内容检测结果", "INFO");
            message.prepare(packet, `您的消息触发了审计规则，已被撤回.\n原始信息已备份至♻️废纸篓(${MORDERATION_NOTIFICATION_GROUP})，您可前往查看详细信息.\nTrace ID: ${traceId}`, true).send();
            message.prepare(packet, `提示: 本能力可通过使用指令"/disable ../systemPlugin/moderation.js"来禁用.\n禁用后，机器人将不会检测聊天内容.`, false).send();
        } else {
            log.write("违规信息: 未知原因，撤回失败.", "内容检测结果", "WARNIING");
            message.prepare(packet, `您的消息触发了审计规则，但撤回失败.\n请主动处理此条信息.\n信息已被转发至♻️废纸篓(${MORDERATION_NOTIFICATION_GROUP})，若有误判，您可加群后联系管理员反馈，帮助我们改进识别算法.\nTrace ID: ${traceId}`, true).send();
            message.prepare(packet, `提示: 本能力可通过使用指令"/disable ../systemPlugin/moderation.js"来禁用.\n禁用后，机器人将不会检测聊天内容.`, false).send();
        }
    }
    message.send("group", MORDERATION_NOTIFICATION_GROUP, `Trace ID: ${traceId}\n发送者：${packet.sender.user_id}\n所在群聊：${packet.group_id}\n违规原因：${reason.join("、")}\n原始信息：\n${packet.message}`);
}

module.exports = {
    moderation,
}