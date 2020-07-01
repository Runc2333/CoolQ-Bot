const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
var AipImageCensorClient = require("baidu-aip-sdk").contentCensor;

function init() {
    if (config.get("MODERATION", "HUAWEI_CLOUD_APP_KEY") === false || config.get("MODERATION", "HUAWEI_CLOUD_APP_SECRET") === false) {
        log.write("未找到APP_KEY，信息检测功能将不会运行.", "信息检测", "ERROR");
    } else {
        config.registerPlugin({
            type: "message",
            subType: "groupMessage, discussMessage",
            script: "moderation.js",
            handler: "moderation",
            regex: "/./",
            description: "审核群聊内容，自动过滤违规信息.",
            notification: false,
            visible: false,
            skipable: false,
        });
    }
    if (config.get("MODERATION") === false) {
        var data = {};
        data["PENDING_CAPTCHA"] = [];
        config.write("MODERATION", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "CAPTCHA", "INFO");
    }
}

// 设置APPID/AK/SK
const APP_ID = "18788574";
const API_KEY = "gOlzNgtQGWHWEPvxynOMNxxI";
const SECRET_KEY = "b3AzyXO4MqkOm9sEZ2dYCLCF9YV8Cdsa";

// 初始化接口
const client = new AipImageCensorClient(APP_ID, API_KEY, SECRET_KEY);

function moderation(packet) {
    client.textCensorUserDefined("原单外贸奢侈时装，市场最高品质，百元价格有Amani 范思哲 CK 纪梵希 Prada 巴宝莉  GUCCI 耐克阿迪等多种品牌").then(function (data) {
        console.log(JSON.stringify(data));
    }, function (e) {
        console.log(e);
    });
}

module.exports = {
    init,
    moderation,
}