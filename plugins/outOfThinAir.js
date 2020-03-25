/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function init() {
    config.registerPlugin({
        type: "message",
        subType: "groupMessage, privateMessage, discussMessage",
        script: "outOfThinAir.js",
        handler: "outOfThinAir",
        regex: "/无中生有$/",
        description: "无中生有 暗度陈仓 凭空想象 凭空捏造 胡言胡语 无可救药 逝者安息 一路走好"
    });
    config.registerSuperCommand({
        command: "oota",
        script: "outOfThinAir.js",
        handler: "command",
        argument: "[action]",
        description: "无中生有插件入口, 以下是参数说明:\n[action]:\nenable|disable - 启用或禁用无中生有.#admin"
    });
    if (config.get("OOTA") === false) {
        var data = {};
        data["DISABLE_GROUPS"] = [];
        config.write("OOTA", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "OOTA", "INFO");
    }
}

function outOfThinAir(packet) {
    if (packet.message_type === "group") {
        var DISABLE_GROUPS = config.get("OOTA", "DISABLE_GROUPS");
        var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());
        if (index !== -1) {
            return false;
        }
    }
    var OOTAS = "暗度陈仓, 凭空想象, 凭空捏造, 胡言胡语, 无可救药, 逝者安息, 一路走好".split(", ");
    for (key in OOTAS) {
        var msg = OOTAS[key];
        message.prepare(packet, msg, false).send();
    }
}

function command(packet) {
    var options = cqcode.decode(packet.message).pureText.split(" ");
    switch (options[1]) {
        case "enable":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[OOTA] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var DISABLE_GROUPS = config.get("OOTA", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index !== -1) {
                //处于禁用状态
                DISABLE_GROUPS.splice(index, 1);
                config.write("OOTA", DISABLE_GROUPS, "DISABLE_GROUPS");
                var msg = "[OOTA] 已启用.";
            } else {
                //处于启用状态
                var msg = "[OOTA] 已经是启用状态了, 无需重复启用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "disable":
            /* 检查权限 */
            if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
                var msg = "[OOTA] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var DISABLE_GROUPS = config.get("OOTA", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index === -1) {
                //处于启用状态
                DISABLE_GROUPS.push(packet.group_id.toString());
                config.write("OOTA", DISABLE_GROUPS, "DISABLE_GROUPS");
                var msg = "[OOTA] 已禁用.";
            } else {
                //处于禁用状态
                var msg = "[OOTA] 已经是禁用状态了, 无需重复禁用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        default:
            log.write("处理失败:未知指令.", "OOTA", "WARNING");
            var msg = "[OOTA] 未知指令.";
            message.prepare(packet, msg, true).send();
            return false;
    }
}

module.exports = {
    init,
    outOfThinAir,
    command
}