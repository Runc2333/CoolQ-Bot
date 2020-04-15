/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
const configFilePath = `${processPath}/config/config.json`;//配置文件路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const log = require(`${processPath}/utils/logger.js`);//日志
const config = require(`${processPath}/utils/configApi.js`);//设置
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器

function init() {
    /*
    config.registerSuperCommand({
        command: "timebot",
        script: "timebot.js",
        handler: "command",
        argument: "[action]",
        description: "布谷鸟插件入口, 以下是参数说明:\n[action]:\nenable|disable - 启用或禁用布谷鸟.#admin"
    });
    if (config.get("TIMEBOT") === false) {
        var data = {};
        data["DISABLE_GROUPS"] = [];
        data.TIMEBOT_IMAGES = {
            "CLOCK01": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/01.jpg",
            "CLOCK02": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/02.jpg",
            "CLOCK03": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/03.jpg",
            "CLOCK04": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/04.jpg",
            "CLOCK05": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/05.jpg",
            "CLOCK06": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/06.jpg",
            "CLOCK07": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/07.jpg",
            "CLOCK08": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/08.jpg",
            "CLOCK09": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/09.jpg",
            "CLOCK10": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/10.jpg",
            "CLOCK11": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/11.jpg",
            "CLOCK12": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/12.jpg",
            "CLOCK13": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/01.jpg",
            "CLOCK14": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/02.jpg",
            "CLOCK15": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/03.jpg",
            "CLOCK16": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/04.jpg",
            "CLOCK17": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/05.jpg",
            "CLOCK18": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/06.jpg",
            "CLOCK19": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/07.jpg",
            "CLOCK20": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/08.jpg",
            "CLOCK21": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/09.jpg",
            "CLOCK22": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/10.jpg",
            "CLOCK23": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/11.jpg",
            "CLOCK00": "https://qqbot2.oss-cn-shanghai.aliyuncs.com/12.jpg"
        };
        config.write("TIMEBOT", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "TIMEBOT", "INFO");
    }
    sendTimeSticker();
    */
}

function sendTimeSticker() {
    var date = new Date();
    var minutes = date.getMinutes();
    var time = date.getTime();
    var TIMEBOT_IMAGES = config.get("TIMEBOT", "TIMEBOT_IMAGES");
    var url = `http://${config.get("GLOBAL", "API_HOST")}:${config.get("GLOBAL", "API_HTTP_PORT")}/get_group_list?access_token=${config.get("GLOBAL", "ACCESS_TOKEN")}`;
    var res = request("GET", url);
    try {
        var response = JSON.parse(res.getBody("utf8"));
    } catch (e) {
        console.log(res.getBody("utf8"));
        log.write("无法解析服务器返回的数据.", "TIMEBOT", "WARNING");
        log.write("请检查后端服务器是否工作正常.", "TIMEBOT", "WARNING");
        return false;
    }
    if (response.retcode == 0) {
        log.write(`送往<${uid}>: <${msg}>.`, "TIMEBOT", "INFO");
    } else {
        console.log(res.getBody("utf8"));
        log.write(`Ret:<${response.retcode}>`, "TIMEBOT", "WARNING");
        return false;
    }
    var ENABLE_TIMEBOT_GROUP = config.get("TIMEBOT", "ENABLE_TIMEBOT_GROUP");
    if (minutes == 0) {
        log.write(`${date.getHours()}点了!`, "TIMEBOT", "INFO");
        var stickerSeq = `CLOCK${date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()}`;
        var sticker = TIMEBOT_IMAGES[stickerSeq];
        for (i = 0; i < ENABLE_TIMEBOT_GROUP.length; i++) {
            message.sendImage(ENABLE_TIMEBOT_GROUP[i], sticker);
        }
    }
    date = new Date();
    minutes = date.getMinutes();
    time = date.getTime();
    var nextFullHour = (Math.ceil(time / 3600000) * 3600000) - time;
    var nextFullMinute = (Math.ceil(time / 60000) * 60000) - time;
    if (nextFullHour < 1000) {
        setTimeout(function () {
            sendTimeSticker();
        }, 60000);
    } else {
        setTimeout(function () {
            sendTimeSticker();
        }, nextFullHour);
    }

}

function command(packet) {
    var options = cqcode.decode(packet.message).pureText.split(" ");
    switch (options[1]) {
        case "enable":
            /* 检查权限 */
            if (config.checkPermission(packet) === false) {
                return false;
            }
            var DISABLE_GROUPS = config.get("TIMEBOT", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index !== -1) {
                //处于禁用状态
                DISABLE_GROUPS.splice(index, 1);
                config.write("TIMEBOT", DISABLE_GROUPS, "DISABLE_GROUPS");
                var msg = "[Timebot] 已启用.";
            } else {
                //处于启用状态
                var msg = "[Timebot] 已经是启用状态了, 无需重复启用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        case "disable":
            /* 检查权限 */
            if (config.checkPermission(packet) === false) {
                return false;
            }
            var DISABLE_GROUPS = config.get("TIMEBOT", "DISABLE_GROUPS");//读出配置文件里的已禁用群组
            var index = DISABLE_GROUPS.indexOf(packet.group_id.toString());//判断是否已经禁用
            if (index === -1) {
                //处于启用状态
                DISABLE_GROUPS.push(packet.group_id.toString());
                config.write("TIMEBOT", DISABLE_GROUPS, "DISABLE_GROUPS");
                var msg = "[Timebot] 已禁用.";
            } else {
                //处于禁用状态
                var msg = "[Timebot] 已经是禁用状态了, 无需重复禁用.";
            }
            message.prepare(packet, msg, true).send();
            break;
        default:
            log.write("处理失败:未知指令.", "TIMEBOT", "WARNING");
            var msg = "[Timebot] 未知指令.";
            message.prepare(packet, msg, true).send();
            return false;
    }
}

module.exports = {
    init,
    command
}