/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const config = require(`${processPath}/utils/configApi.js`);//设置
const mysql = require("mysql"); // mysql
const { identity } = require("lodash");
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口

const db = config.getDatabase();

var token = null;
function init(t) {
    token = t;
}

function enable(packet, target) {
    db.query('SELECT * FROM `registry` WHERE (`plugin` = ? OR `alias` = ?) AND `switchable` = true;', [
        target,
        target
    ], (e, r, f) => {
        if (r.length > 0) {
            var targetPlugin = r[0].plugin;
            db.query('SELECT * FROM `pluginswitch` WHERE `groupId` = ?;', [
                packet.group_id
            ], (ee, rr, ff) => {
                if (rr.length === 0) {
                    db.query('DESC `pluginswitch`;', (eee, rrr, fff) => {
                        var fields = [];
                        rrr.forEach((item) => {
                            if (!/ID|groupId/.test(item.Field)) {
                                fields.push(item.Field);
                            }
                        });
                        db.query(`INSERT INTO \`pluginswitch\` (\`groupId\`, \`${fields.join('`, `')}\`) VALUES ('${packet.group_id}', ${(new Array(fields.length)).join('0, ')}0);`, (eeee, rrrr, ffff) => {
                            if (eeee === null) {
                                db.query(`UPDATE \`pluginswitch\` SET \`${targetPlugin}\` = ? WHERE \`groupId\` = ?;`, [
                                    r[0].defaultState === "enable" ? false : true,
                                    packet.group_id
                                ]);
                                message.prepare(packet, `已启用插件<${target}>.`).send();
                                return;
                            } else {
                                message.prepare(packet, `未能启用插件<${target}>：数据库错误.`).send();
                                return;
                            }
                        });
                    });
                } else {
                    db.query(`UPDATE \`pluginswitch\` SET \`${targetPlugin}\` = ? WHERE \`groupId\` = ?;`, [
                        r[0].defaultState === "enable" ? false : true,
                        packet.group_id
                    ]);
                    message.prepare(packet, `已启用插件<${target}>.`).send();
                    return;
                }
            });
        } else {
            message.prepare(packet, `请求启用的插件<${target}>不存在或不允许启用.`).send();
            return;
        }
    });
}

function disable(packet, target) {
    db.query('SELECT * FROM `registry` WHERE (`plugin` = ? OR `alias` = ?) AND `switchable` = true;', [
        target,
        target
    ], (e, r, f) => {
        if (r.length > 0) {
            var targetPlugin = r[0].plugin;
            db.query('SELECT * FROM `pluginswitch` WHERE `groupId` = ?;', [
                packet.group_id
            ], (ee, rr, ff) => {
                if (rr.length === 0) {
                    db.query('DESC `pluginswitch`;', (eee, rrr, fff) => {
                        var fields = [];
                        rrr.forEach((item) => {
                            if (!/ID|groupId/.test(item.Field)) {
                                fields.push(item.Field);
                            }
                        });
                        db.query(`INSERT INTO \`pluginswitch\` (\`groupId\`, \`${fields.join('`, `')}\`) VALUES ('${packet.group_id}', ${(new Array(fields.length)).join('0, ')}0);`, (eeee, rrrr, ffff) => {
                            if (eeee === null) {
                                db.query(`UPDATE \`pluginswitch\` SET \`${targetPlugin}\` = ? WHERE \`groupId\` = ?;`, [
                                    r[0].defaultState === "enable" ? true : false,
                                    packet.group_id
                                ]);
                                message.prepare(packet, `已禁用插件<${target}>.`).send();
                                return;
                            } else {
                                message.prepare(packet, `未能禁用插件<${target}>：数据库错误.`).send();
                                return;
                            }
                        });
                    });
                } else {
                    db.query(`UPDATE \`pluginswitch\` SET \`${targetPlugin}\` = ? WHERE \`groupId\` = ?;`, [
                        r[0].defaultState === "enable" ? true : false,
                        packet.group_id
                    ]);
                    message.prepare(packet, `已禁用插件<${target}>.`).send();
                    return;
                }
            });
        } else {
            message.prepare(packet, `请求禁用的插件<${target}>不存在或不允许禁用.`).send();
            return;
        }
    });
}

module.exports = {
    init,
    enable,
    disable,
}