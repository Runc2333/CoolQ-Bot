/* 常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const fs = require("fs");//文件系统读写
// const message = require(`${processPath}/utils/messageApi.js`);//消息接口
// const config = require(`${processPath}/utils/configApi.js`);//设置

// const GLOBAL_ADMINISTRATORS = config.get("GLOBAL", "GLOBAL_ADMINISTRATORS");//全局管理员

function write(msg, event, level = "INFO") {
    var date = new Date();
    var time = (
        date.getFullYear()
        + "-" +
        ((date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1))
        + "-" +
        (date.getDate() < 10 ? "0" + date.getDate() : date.getDate())
        + " " +
        (date.getHours() < 10 ? "0" + date.getHours() : date.getHours())
        + ":" +
        (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes())
        + ":" +
        (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds())
    ).toString();
    // msg = msg.replace(new RegExp("\n", "gm"), " ").replace(new RegExp("\r", "gm"), "");
    switch (level) {
        case "INFO":
            var data = `[${time}] [${level}] [${event}] : ${msg}\n`;
            break;
        case "WARNING":
            var data = `[${time}] [${level}] [${event}] : ${msg}\n`;
            break;
        case "ERROR":
            var data = `[${time}] [${level}] [${event}] : ${msg}\n`;
            break;
        default:
            var data = `[${time}] [${event}] [${level}] : ${msg}\n`;
            break;
    }
    if (level != "INFO") {
        fs.appendFileSync(`${processPath}/server.log`, data, function (err) {
            if (err) {
                console.log("无法写入日志.");
                process.exit(true);
            }
        });
    }
    switch (level) {
        case "INFO":
            var log = "[" + time + "] \033[40;97m[" + level + "]\033[0m [" + event + "] : " + msg;
            break;
        case "WARNING":
            var log = "[" + time + "] \033[44;97m[" + level + "]\033[0m [" + event + "] : " + msg;
            break;
        case "ERROR":
            var log = "[" + time + "] \033[41;97m[" + level + "]\033[0m [" + event + "] : " + msg;
            break;
        default:
            var log = `[${time}] [${level}] [${event}] : ${msg}`;
            break;
    }
    console.log(log);
}

module.exports = {
    write
}