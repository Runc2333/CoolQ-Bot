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



const HUAWEI_CLOUD_APP_KEY = config.get("GLOBAL", "HUAWEI_CLOUD_APP_KEY");
const HUAWEI_CLOUD_APP_SECRET = config.get("GLOBAL", "HUAWEI_CLOUD_APP_SECRET");

var res = request("GET", "https://c2cpicdw.qpic.cn/offpic_new/814537405//814537405-3595573822-BDC3C83B0313384A8AC9CD6EAD852CEB/0?term=2");
var image = res.getBody().toString("base64");
moderationUtils.initRegion("cn-north-4");
imageModeration.image_content_aksk(HUAWEI_CLOUD_APP_KEY, HUAWEI_CLOUD_APP_SECRET, image, "", ["politics", "terrorism", "porn", "ad"], "", function (result) {
    console.log(result.result);
});