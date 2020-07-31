const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const Database = require("better-sqlite3"); // SQLite3驱动程序
const lodash = require("lodash"); // lodash
const tool = require(`${processPath}/utils/toolbox.js`);
const db = require(`${processPath}/utils/database.js`);
const AipImageCensorClient = require("baidu-aip-sdk").contentCensor;

function init() {
    if (config.get("MODERATION", "APP_ID") === false || config.get("MODERATION", "API_KEY") === false || config.get("MODERATION", "SECRET_KEY") === false) {
        log.write("未找到授权信息，信息检测功能将不会运行.", "信息检测", "ERROR");
    } else {
        config.registerPlugin({
            type: "message",
            subType: "groupMessage, discussMessage",
            script: "moderation.js",
            handler: "moderation",
            regex: "/./",
            description: "审核群聊内容，自动过滤违规信息.",
            notification: false,
            visible: true,
            skipable: false,
        });
    }
    if (config.get("MODERATION") === false) {
        var data = {};
        data["APP_ID"] = "";
        data["API_KEY"] = "";
        data["SECRET_KEY"] = "";
        config.write("MODERATION", data);
        log.write("未在配置文件内找到插件配置, 已自动生成默认配置.", "CAPTCHA", "INFO");
    }
}

// 获取授权信息
const APP_ID = config.get("MODERATION", "APP_ID")
const API_KEY = config.get("MODERATION", "API_KEY")
const SECRET_KEY = config.get("MODERATION", "SECRET_KEY")

// 连接数据库
const moderationDb = db.getDatabase("moderation");
if (moderationDb.prepare(`SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'users'`).all()[0]["count(*)"] === 0) {
    moderationDb.prepare(`CREATE TABLE \`users\` (\`user_id\` TEXT NOT NULL PRIMARY KEY, \`detect_total\` TEXT NOT NULL, \`pass_total\` TEXT NOT NULL, \`block_total\` TEXT NOT NULL, \`review_total\` TEXT NOT NULL, \`detect_remain\` TEXT NOT NULL, \`risk\` TEXT NOT NULL)`).run();
}
if (moderationDb.prepare(`SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = 'moderation_record'`).all()[0]["count(*)"] === 0) {
    moderationDb.prepare(`CREATE TABLE \`moderation_record\` (\`user_id\` TEXT NOT NULL, \`message_content\` TEXT NOT NULL, \`result\` TEXT NOT NULL)`).run();
}

// 初始化审核接口
const client = new AipImageCensorClient(APP_ID, API_KEY, SECRET_KEY);

function moderation(packet) {
    message.checkSelfPermission(packet.group_id, (permission) => {
        if (permission) {
            if (moderationDb.prepare(`SELECT count(*) FROM "users" WHERE \`user_id\` = '${packet.user_id}'`).all()[0]["count(*)"] === 0) {
                moderationDb.prepare(`INSERT INTO \`users\` (user_id, detect_total, pass_total, block_total, review_total, detect_remain, risk) VALUES (?, ?, ?, ?, ?, ?, ?);`).run(
                    packet.user_id.toString(),
                    0,
                    0,
                    0,
                    0,
                    10,
                    0
                );
            }
            var userSpoken = cqcode.decode(packet.message);
            if (userSpoken.pureText.length > 6 && /你的QQ暂不支持查看视频短片|请使用新版手机QQ查看闪照/.test(userSpoken.pureText) === false) {
                log.write("触发文本检测", "MODERATION", "INFO");
                var userDetail = moderationDb.prepare(`SELECT * FROM "users" WHERE \`user_id\` = '${packet.user_id}'`).all()[0];
                if (userDetail["detect_remain"] > 0) {
                    client.textCensorUserDefined(userSpoken.pureText).then(function (data) {
                        userDetail.detect_total++;
                        if (data.conclusionType === 1) {
                            log.write(`文本检测结果：合规`, "MODERATION", "INFO");
                            userDetail.pass_total++;
                            userDetail.detect_remain--;
                            userDetail.risk = (((userDetail.block_total * 1) + (userDetail.review_total * 0.8)) / userDetail.detect_total).toFixed(2);
                        } else if (data.conclusionType === 2) {
                            log.write(`文本检测结果：违规\n原文信息: ${userSpoken.pureText}`, "MODERATION", "WARNING");
                            message.revoke(packet.message_id, packet);
                            message.prepare(packet, `您的消息触发了审计规则，并且已被记录进数据库.\n请您注意不要发送广告内容，多次触发将会导致您被封禁.\n若您的消息未违规，也请不要再次尝试发送本条消息，多次触发将会导致全局封禁。`, true).send();
                            if (userDetail.detect_total > 10) {
                                userDetail.detect_remain--;
                            }
                            userDetail.block_total++;
                            userDetail.risk = (((userDetail.block_total * 1) + (userDetail.review_total * 0.8)) / userDetail.detect_total).toFixed(2);
                        } else if (data.conclusionType === 3) {
                            log.write(`文本检测结果：疑似\n原文信息: ${userSpoken.pureText}`, "MODERATION", "WARNING");
                            userDetail.review_total++;
                            if (userDetail.detect_total > 10) {
                                userDetail.detect_remain--;
                            }
                            userDetail.risk = (((userDetail.block_total * 1) + (userDetail.review_total * 0.8)) / userDetail.detect_total).toFixed(2);
                        } else {
                            console.log(data);
                            log.write("文本检测失败", "MODERATION", "WARNING");
                        }
                        moderationDb.prepare(`INSERT INTO \`moderation_record\` (user_id, message_content, result) VALUES (?, ?, ?);`).run(
                            packet.user_id.toString(),
                            userSpoken.pureText,
                            data.conclusionType
                        );
                        var sql = `UPDATE \`users\` SET detect_total = ${userDetail.detect_total}, pass_total = ${userDetail.pass_total}, block_total = ${userDetail.block_total}, review_total = ${userDetail.review_total}, detect_remain = ${userDetail.detect_remain}, risk = ${userDetail.risk} WHERE \`user_id\` = '${packet.user_id.toString()}';`;
                        moderationDb.prepare(sql).run();
                    }, function (e) {
                        console.log(e);
                    });
                } else if (userDetail["detect_remain"] == 0 && userDetail["risk"] > 0.65) {
                    message.revoke(packet.message_id, packet);
                    message.mute(packet.group_id, packet.sender.user_id, 2592000);
                    message.prepare(packet, `您已因多次触发审计规则而被全局封禁.\n若要申诉，请联系QQ814537405核实.`, true).send();
                }
            }
        }
    });
}

module.exports = {
    init,
    moderation,
}