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
        type: "groupMessage",
        script: "hitokoto.js",
        handler: "hitokoto",
        regex: "/(^一言|一言$|hitokoto)/",
        description: "获取一句话~"
    });
    config.registerPlugin({
        type: "privateMessage",
        script: "hitokoto.js",
        handler: "hitokoto",
        regex: "/(^一言|一言$|hitokoto)/",
        description: "获取一句话~"
    });
    config.registerPlugin({
        type: "discussMessage",
        script: "hitokoto.js",
        handler: "hitokoto",
        regex: "/(^一言|一言$|hitokoto)/",
        description: "获取一句话~"
    });
    config.registerSuperCommand({
        command: "hitokoto",
        script: "hitokoto.js",
        handler: "command",
        argument: "[action]",
        description: "[action]:\nenable|disable - 启用或禁用Hitokoto.#admin\n"
    });
    if (config.get("HITOKOTO") === false) {
        var data = {};
        data["HITOKOTO_DISABLE_GROUPS"] = [];
        config.write("HITOKOTO", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "HITOKOTO", "INFO");
    }
}

function hitokoto(packet) {
    if (packet.message_type === "group") {
        var HITOKOTO_DISABLE_GROUPS = config.get("HITOKOTO", "HITOKOTO_DISABLE_GROUPS");
        var index = HITOKOTO_DISABLE_GROUPS.indexOf(packet.group_id.toString());
        if (index !== -1) {
            return false;
        }
    }
    var url = "https://v1.hitokoto.cn/";
    var res = request("GET", url);
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "HITOKOTO", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "HITOKOTO", "WARNING");
        return false;
    }
    var msg = `${response.hitokoto} ——${response.from}`;
    message.prepare(packet, msg, true).send();
}

function command(packet) {
    var options = cqcode.decode(packet.message).pureText.split(" ");
    switch (options[1]) {
        case "enable":
            /* 检查权限 */
            if (packet.sender.role !== "admin") {
                var msg = "[Hitokoto] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var HITOKOTO_DISABLE_GROUPS = config.get("HITOKOTO", "HITOKOTO_DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = HITOKOTO_DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index !== -1) {
                //处于禁用状态
                HITOKOTO_DISABLE_GROUPS.splice(index, 1);
                config.write("HITOKOTO", HITOKOTO_DISABLE_GROUPS, "HITOKOTO_DISABLE_GROUPS");
                var msg = "[Hitokoto] 已启用.";
            } else {
                //处于启用状态
                var msg = "[Hitokoto] 已经是启用状态了, 无需重复启用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "disable":
            if (packet.sender.role !== "admin") {
                var msg = "[Hitokoto] 权限不足.";
                message.prepare(packet, msg, true).send();
                return false;
            }
            var HITOKOTO_DISABLE_GROUPS = config.get("HITOKOTO", "HITOKOTO_DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = HITOKOTO_DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index === -1) {
                //处于启用状态
                HITOKOTO_DISABLE_GROUPS.push(packet.group_id.toString());
                config.write("HITOKOTO", HITOKOTO_DISABLE_GROUPS, "HITOKOTO_DISABLE_GROUPS");
                var msg = "[Hitokoto] 已禁用.";
            } else {
                //处于禁用状态
                var msg = "[Hitokoto] 已经是禁用状态了, 无需重复禁用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        default:
            log.write("处理失败:未知指令.", "HITOKOTO", "WARNING");
            var msg = "[Hitokoto] 未知指令.";
            message.prepare(packet, msg, true).send();
            return false;
    }
}

module.exports = {
    init,
    hitokoto,
    command
}