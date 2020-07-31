/* 常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
const configFilePath = `${processPath}/config/config.json`;//配置文件路径
const registryPath = `${processPath}/tmp/registry.json`;//插件注册文件路径
/* 模块 */
const fs = require("fs");//文件系统读写
const mysql = require("mysql"); // mysql
const lodash = require("lodash"); // lodash
const log = require(`${processPath}/utils/logger.js`);//日志
const tool = require(`${processPath}/utils/toolbox.js`);

// 读入固定配置
var configFile = fs.readFileSync(configFilePath);
try {
    var configFileObject = JSON.parse(configFile);
} catch (e) {
    log.write(`[${configFilePath}]解析失败，正在退出进程...`, "CONFIG API", "ERROR");
    process.exit();
}

// 连接远程数据库
const db = mysql.createConnection({
    host: configFileObject.MYSQL_HOST,
    user: configFileObject.MYSQL_USERNAME,
    password: configFileObject.MYSQL_PASSWORD,
    database: configFileObject.MYSQL_DATABASE
});
try {
    db.connect();
} catch (e) {
    log.write(`无法连接到远程数据库，正在退出进程...`, "CONFIG API", "ERROR");
    process.exit();
}
// 检查插件注册表是否存在
db.query('CREATE TABLE IF NOT EXISTS `registry` (`ID` int(255) NOT NULL AUTO_INCREMENT,`plugin` varchar(190) NOT NULL,`alias` text NOT NULL,`description` text NOT NULL,`author` text NOT NULL,`defaultState` text NOT NULL,`switchable` text NOT NULL,PRIMARY KEY(`ID`),UNIQUE KEY `plugin` (`plugin`)) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;');
// 检查WebConsole表是否存在
db.query('CREATE TABLE IF NOT EXISTS `webconsole` (`ID` int(255) NOT NULL AUTO_INCREMENT,`plugin` varchar(190) NOT NULL,`table` text NOT NULL,`name` text NOT NULL,`maximum` text NOT NULL,`description` text NOT NULL, `columns` text NOT NULL, `permission` text NOT NULL,PRIMARY KEY(`ID`),UNIQUE KEY (`plugin`)) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;');

// 初始化插件注册区
var registry = {
    PLUGIN_REGISTRY: [],
    MESSAGE_REGISTRY: {
        GROUP_MESSAGE: [],
        PRIVATE_MESSAGE: [],
        DISCUSS_MESSAGE: []
    },
    NOTICE_REGISTRY: {
        GROUP_UPLOAD: [],
        GROUP_ADMIN: [],
        GROUP_INCREASE: [],
        GROUP_DECREASE: [],
        GROUP_BAN: [],
        FRIEND_ADD: []
    },
    REQUEST_REGISTRY: {
        FRIEND: [],
        GROUP: []
    },
    SUPER_COMMAND_REGISTRY: []
}
refreshRegistry();

function getPluginByToken(token) {
    var itemToReturn = null;
    registry.PLUGIN_REGISTRY.forEach((item) => {
        if (item.token == token) {
            itemToReturn = item;
            return;
        }
    });
    return itemToReturn === null ? false : itemToReturn;
}

function read({ mode, token, table, callback, condition = null, nocache = false } = {}) {
    var plugin = getPluginByToken(token);
    if (plugin === false) {
        callback({
            code: 1,
            msg: `Token无效`
        });
        return;
    }
    db.query(`SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${configFileObject.MYSQL_DATABASE}' and TABLE_NAME ='${plugin.plugin}-${table}';`, (e, r, f) => {
        if (r[0]["count(*)"] === 0) {
            callback({
                code: 1,
                msg: `目标数据表不存在`
            });
            console.log(`SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${configFileObject.MYSQL_DATABASE}' and TABLE_NAME ='${plugin.plugin}-${table}';`);
            return;
        } else {
            switch (mode) {
                case "standard":
                    if (condition === null) {
                        db.query(`SELECT * FROM \`${plugin.plugin}-${table}\`;`, (e, r, f) => {
                            callback({
                                code: 0,
                                msg: `OK`,
                                data: r
                            });
                            return;
                        });
                    } else {
                        db.query(`SELECT * FROM \`${plugin.plugin}-${table}\` WHERE \`groupId\` = '${condition.group_id}';`, (e, r, f) => {
                            callback({
                                code: 0,
                                msg: `OK`,
                                data: r
                            });
                            return;
                        });
                    }
                    break;
                case "advanced":
                    if (condition === null) {
                        db.query(`SELECT * FROM \`${plugin.plugin}-${table}\`;`, (e, r, f) => {
                            callback({
                                code: 0,
                                msg: `OK`,
                                data: r
                            });
                            return;
                        });
                    } else {
                        var sql = `SELECT * FROM \`${plugin.plugin}-${table}\` WHERE `;
                        var sqlCondition = [];
                        Object.keys(condition).forEach((key) => {
                            sqlCondition.push(`\`${key}\` = '${condition[key]}'`);
                        });
                        sql += sqlCondition.join(" AND ");
                        db.query(sql, (e, r, f) => {
                            callback({
                                code: 0,
                                msg: `OK`,
                                data: r
                            });
                            return;
                        });
                    }
                    break;
            }
        }
    });
}

function write({ token, table, data, callback, packet = null } = {}) {
    var plugin = getPluginByToken(token);
    if (plugin === false) {
        callback({
            code: 1,
            msg: `Token无效`,
        });
        return;
    }
    db.query(`SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA= ? AND TABLE_NAME = ?;`, [
        configFileObject.MYSQL_DATABASE,
        `${plugin.plugin}-${table}`,
    ], (e, r, f) => {
        if (r[0]["count(*)"] === 0) {
            callback({
                code: 1,
                msg: `目标数据表不存在`,
            });
            return;
        } else {
            db.query(`DESC \`${plugin.plugin}-${table}\`;`, (e, r, f) => {
                var dataToInsert = {};
                r.forEach((v) => {
                    if (typeof (data[v.Field]) !== "undefined") {
                        dataToInsert[v.Field] = data[v.Field];
                    }
                });
                var keys = Object.keys(dataToInsert);
                var values = Object.values(dataToInsert);
                if (packet !== null) {
                    values.push(packet.group_id);
                }
                values = values.concat(values);
                if (keys.length > 0) {
                    if (packet !== null) {
                        var sql = `INSERT INTO \`${plugin.plugin}-${table}\` (\`${keys.join('`, `')}\`, \`groupId\`) VALUES (?${new Array(keys.length).join(", ?")}, ?) ON DUPLICATE KEY UPDATE \`${keys.join("` = ?, `")}\` = ?, \`groupId\` = ?;`;
                    } else {
                        var sql = `INSERT INTO \`${plugin.plugin}-${table}\` (\`${keys.join('`, `')}\`) VALUES (?${new Array(keys.length).join(", ?")}) ON DUPLICATE KEY UPDATE \`${keys.join("` = ?, `")}\` = ?;`;
                    }
                    db.query(sql, values, (e, r, f) => {
                        if (e === null) {
                            var returnData = {
                                code: 0,
                                msg: `OK`,
                                data: r
                            }
                        } else {
                            var returnData = {
                                code: 1,
                                msg: `MySQL服务器返回了一个错误`,
                                data: r,
                                error: e,
                            }
                            console.log(e);
                            console.log(r);
                        }
                        callback(returnData);
                        return;
                    });
                } else {
                    callback({
                        code: 1,
                        msg: `无可插入到表中的数据`,
                    });
                    return;
                }
            });
        }
    });
}

function remove({ token, table, ID, callback } = {}) {
    var plugin = getPluginByToken(token);
    if (plugin === false) {
        callback({
            code: 1,
            msg: 'Token无效',
        });
        return;
    }
    if (typeof (ID) === undefined || ID == "" || ID == null || ID == NaN) {
        callback({
            code: 1,
            msg: '内部传参错误',
        });
        return;
    }
    db.query(`DELETE FROM \`${plugin.plugin}-${table}\` WHERE \`ID\` = ?;`, [
        ID
    ], (e, r, f) => {
        if (r.affectedRows === 0) {
            callback({
                code: 1,
                msg: '指定的ID不存在'
            });
            return;
        }
        if (e === null) {
            callback({
                code: 0,
                msg: 'OK'
            });
            return;
        } else {
            callback({
                code: 1,
                msg: '数据库返回了一个错误',
                raw: e
            });
            return;
        }
    });
}

function sys(field) {
    return configFileObject[field];
}

function getRegistry() {
    return registry;
}

function refreshRegistry() {
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, "\t"));
}

function registerPlugin(manifest) {

    // 验证必须字段
    ["pluginName", "script"].forEach((v) => {
        if (typeof (manifest[v]) === "undefined") {
            return {
                status: false,
                reason: `Manifest文件内缺失字段'${v}'`,
            }
        }
    });

    // 创建全局数据表
    if (manifest.globalConfigurations) {
        manifest.globalConfigStructure.forEach((table) => {
            db.query(`SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${configFileObject.MYSQL_DATABASE}' and TABLE_NAME ='${manifest.pluginName}-global-${table.tableName}';`, (e, r, f) => {
                if (r[0]["count(*)"] === 0) {
                    var sql = `CREATE TABLE IF NOT EXISTS \`${manifest.pluginName}-global-${table.tableName}\` (\`ID\` int(255) NOT NULL AUTO_INCREMENT`;
                    var unique = [];
                    table.columns.forEach((key) => {
                        if (key.primary) {
                            unique.push(key.key);
                            sql += `,\`${key.key}\` varchar(190) NOT NULL`;
                        } else {
                            sql += `,\`${key.key}\` text NOT NULL`;
                        }
                    });
                    sql += ',PRIMARY KEY(\`ID\`)';
                    sql += ') ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;';
                    db.query(sql);
                    if (unique.length > 0) {
                        var sql = `CREATE UNIQUE INDEX major ON \`${manifest.pluginName}-global-${table.tableName}\`(\`${unique.join('`,`')}\`);`;
                        db.query(sql);
                    }
                }
            });
        });
    }

    // 创建群组数据表
    if (manifest.groupSensitive) {
        manifest.groupConfigStructure.forEach((table) => {
            db.query(`SELECT count(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='${configFileObject.MYSQL_DATABASE}' and TABLE_NAME ='${manifest.pluginName}-${table.tableName}';`, (e, r, f) => {
                if (r[0]["count(*)"] === 0) {
                    var sql = `CREATE TABLE IF NOT EXISTS \`${manifest.pluginName}-${table.tableName}\` (\`ID\` int(255) NOT NULL AUTO_INCREMENT`;
                    var unique = ["groupId"];
                    table.columns.forEach((key) => {
                        if (key.primary) {
                            unique.push(key.key);
                            sql += `,\`${key.key}\` varchar(190) NOT NULL`;
                        } else {
                            sql += `,\`${key.key}\` text NOT NULL`;
                        }
                    });
                    sql += ',`groupId` varchar(190) NOT NULL,PRIMARY KEY(\`ID\`)';
                    sql += ') ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;';
                    db.query(sql);
                    if (unique.length > 0) {
                        var sql = `CREATE UNIQUE INDEX major ON \`${manifest.pluginName}-${table.tableName}\`(\`${unique.join('`,`')}\`);`;
                        db.query(sql);
                    }
                }
            });
        });
    }

    // 注册WebConsole
    if (manifest.webConsole) {
        manifest.webConsoleConfigurableItems.forEach((item) => {
            ["name", "description", "table", "permission", "columns"].forEach((v) => {
                if (typeof (item[v]) === "undefined") {
                    log.write(`插件[${manifest.pluginName}]的WebConsole页面注册失败，原因是：WebConsole Configurable Items缺失字段'${v}'.`, "CONFIG API", "ERROR");
                    return;
                }
            });
            db.query('INSERT INTO `webconsole` (`plugin`, `table`, `name`, `maximum`, `description`, `columns`, `permission`) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `plugin` = ?, `table` = ?, `name` = ?, `maximum` = ?, `description` = ?, `columns` = ?, `permission` = ?', [
                manifest.pluginName,
                item.table,
                item.name,
                typeof (item.maximum) === "undefined" ? 0 : item.maximum,
                item.description,
                JSON.stringify(item.columns),
                item.permission,
                manifest.pluginName,
                item.table,
                item.name,
                typeof (item.maximum) === "undefined" ? 0 : item.maximum,
                item.description,
                JSON.stringify(item.columns),
                item.permission,
            ]);
        });
    }

    // 注册消息匹配
    if (typeof (manifest.message) !== "undefined" && manifest.message.length > 0) {
        manifest.message.forEach((item) => {
            ["type", "mode", "handler", "priority", "skipable", "silent"].forEach((v) => {
                if (typeof (item[v]) === "undefined") {
                    return {
                        status: false,
                        reason: `消息匹配缺失字段'${v}'`,
                    }
                }
            });
            item.type.forEach((type) => {
                if (/GROUP_MESSAGE|PRIVATE_MESSAGE|DISCUSS_MESSAGE/.test(type)) {
                    if (item.mode === "all") {
                        var configToPush = {
                            "script": `${processPath}/plugins/script/${manifest.script}`,
                            "plugin": manifest.pluginName,
                            "handler": item.handler,
                            "regexp": ".",
                            "priority": item.priority,
                            "skipable": item.skipable,
                            "silent": item.silent,
                            "alias": typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias,
                        }
                        if (item.identifier) {
                            configToPush.identifier = item.identifier;
                        }
                    } else if (item.mode === "cue") {
                        var configToPush = {
                            "script": `${processPath}/plugins/script/${manifest.script}`,
                            "plugin": manifest.pluginName,
                            "handler": item.handler,
                            "regexp": `^${sys("BOT_NAME")}$|^\s*\\[CQ:at,qq=${sys("BOT_QQNUM")}\\]\s*$`,
                            "priority": item.priority,
                            "skipable": item.skipable,
                            "silent": item.silent,
                            "alias": typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias,
                        }
                        if (item.identifier) {
                            configToPush.identifier = item.identifier;
                        }
                    } else if (item.mode === "mention") {
                        var configToPush = {
                            "script": `${processPath}/plugins/script/${manifest.script}`,
                            "plugin": manifest.pluginName,
                            "handler": item.handler,
                            "regexp": `^${sys("BOT_NAME")}|${sys("BOT_NAME")}$|\\[CQ:at,qq=${sys("BOT_QQNUM")}\\]`,
                            "priority": item.priority,
                            "skipable": item.skipable,
                            "silent": item.silent,
                            "alias": typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias,
                        }
                        if (item.identifier) {
                            configToPush.identifier = item.identifier;
                        }
                    } else if (item.mode === "regexp") {
                        if (typeof (item["regexp"]) === "undefined") {
                            return {
                                status: false,
                                reason: `消息匹配缺失字段'${v}'`,
                            }
                        }
                        var configToPush = {
                            "script": `${processPath}/plugins/script/${manifest.script}`,
                            "plugin": manifest.pluginName,
                            "handler": item.handler,
                            "regexp": item.regexp,
                            "priority": item.priority,
                            "skipable": item.skipable,
                            "silent": item.silent,
                            "alias": typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias,
                        }
                        if (item.identifier) {
                            configToPush.identifier = item.identifier;
                        }
                    } else {
                        return {
                            status: false,
                            reason: `尝试注册不支持的匹配模式'${item.mode}'`,
                        }
                    }
                    if (item.skipable) {
                        registry.MESSAGE_REGISTRY[type].push(configToPush);
                    } else {
                        registry.MESSAGE_REGISTRY[type].unshift(configToPush);
                    }
                    var unskipable = [];
                    var skipable = [];
                    registry.MESSAGE_REGISTRY[type].forEach((item) => {
                        if (item.skipable) {
                            skipable.push(item);
                        } else {
                            unskipable.push(item);
                        }
                    });
                    unskipable = lodash.sortBy(unskipable, (item) => {
                        return -item.priority;
                    });
                    skipable = lodash.sortBy(skipable, (item) => {
                        return -item.priority;
                    });
                    var tmp = [];
                    tmp.push(...unskipable);
                    tmp.push(...skipable);
                    registry.MESSAGE_REGISTRY[type] = tmp;
                } else {
                    return {
                        status: false,
                        reason: `尝试注册不支持的匹配模式'${type}'`,
                    }
                }
            });
        });
    }

    // 注册提醒消息
    if (typeof (manifest.notice) !== "undefined" && manifest.notice.length > 0) {
        manifest.notice.forEach((item) => {
            ["type", "handler"].forEach((v) => {
                if (typeof (item[v]) === "undefined") {
                    return {
                        status: false,
                        reason: `提醒消息缺失字段'${v}'`,
                    }
                }
            });
            item.type.forEach((type) => {
                if (/GROUP_UPLOAD|GROUP_ADMIN|GROUP_INCREASE|GROUP_DECREASE|GROUP_BAN|FRIEND_ADD/.test(type)) {
                    registry.NOTICE_REGISTRY[type].push({
                        "script": `${processPath}/plugins/script/${manifest.script}`,
                        "plugin": manifest.pluginName,
                        "handler": item.handler,
                        "priority": typeof (item.priority) === "undefined" ? 0 : item.priority,
                        "skipable": typeof (item.skipable) === "undefined" ? true : item.skipable,
                        "alias": typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias,
                    })
                }
            });
        });
    }

    // 注册请求
    if (typeof (manifest.request) !== "undefined" && manifest.request.length > 0) {
        manifest.request.forEach((item) => {
            ["type", "handler"].forEach((v) => {
                if (typeof (item[v]) === "undefined") {
                    return {
                        status: false,
                        reason: `提醒消息缺失字段'${v}'`,
                    }
                }
            });
            item.type.forEach((type) => {
                if (/FRIEND|GROUP/.test(type)) {
                    registry.REQUEST_REGISTRY[type].push({
                        "script": `${processPath}/plugins/script/${manifest.script}`,
                        "plugin": manifest.pluginName,
                        "handler": item.handler,
                        "priority": typeof (item.priority) === "undefined" ? 0 : item.priority,
                        "skipable": typeof (item.skipable) === "undefined" ? true : item.skipable,
                        "alias": typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias,
                    })
                }
            });
        });
    }

    // 注册超级指令
    if (typeof (manifest.superCommand) !== "undefined" && manifest.superCommand.length > 0) {
        manifest.superCommand.forEach((item) => {
            ["command", "handler", "permission"].forEach((v) => {
                if (typeof (item[v]) === "undefined") {
                    return {
                        status: false,
                        reason: `超级指令缺失字段'${v}'`,
                    }
                }
            });
            var commandToPush = {};
            for (key in item) {
                if (/command|handler|identifier|arguments|permission|description/.test(key)) {
                    commandToPush[key] = item[key];
                }
                commandToPush.script = `${processPath}/plugins/script/${manifest.script}`;
                commandToPush.alias = typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias;
                commandToPush.plugin = manifest.pluginName;
            }
            registry.SUPER_COMMAND_REGISTRY.push(commandToPush);
        });
    }

    // 生成Token用于保存和返回给插件
    var pluginToken = tool.randomString(32);
    registry.PLUGIN_REGISTRY.push({
        "path": `${processPath}/plugins/script/${manifest.script}`,
        "plugin": manifest.pluginName,
        "token": pluginToken,
        "alias": typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias,
        "description": typeof (manifest.description) === "undefined" ? "" : manifest.description,
    });

    // 刷新注册表
    refreshRegistry();

    // 注册插件到远程数据库
    db.query('INSERT INTO `registry` (plugin, alias, description, author, defaultState, switchable) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE plugin = ?, alias = ?, description = ?, author = ?, defaultState = ?, switchable = ?', [
        manifest.pluginName,
        typeof (manifest.pluginAlias) === "undefined" ? "" : manifest.pluginAlias,
        typeof (manifest.description) === "undefined" ? "" : manifest.description,
        typeof (manifest.author) === "undefined" ? "" : manifest.author,
        typeof (manifest.defaultState) === "undefined" ? true : manifest.defaultState,
        typeof (manifest.switchable) === "undefined" ? true : manifest.switchable,
        manifest.pluginName,
        typeof (manifest.pluginAlias) === "undefined" ? "" : manifest.pluginAlias,
        typeof (manifest.description) === "undefined" ? "" : manifest.description,
        typeof (manifest.author) === "undefined" ? "" : manifest.author,
        typeof (manifest.defaultState) === "undefined" ? true : manifest.defaultState,
        typeof (manifest.switchable) === "undefined" ? true : manifest.switchable,
    ]);

    // 返回成功
    return {
        "status": true,
        "path": `${processPath}/plugins/script/${manifest.script}`,
        "plugin": typeof (manifest.pluginAlias) === "undefined" ? manifest.pluginName : manifest.pluginAlias,
        "token": pluginToken,
    }
}

function generateSwitchTable() {
    db.query(`SELECT * FROM \`registry\` WHERE \`switchable\` = true`, (e, r, f) => {
        if (e === null) {
            db.query('CREATE TABLE IF NOT EXISTS `pluginswitch` (`ID` int(255) NOT NULL AUTO_INCREMENT,`groupId` varchar(190) NOT NULL,PRIMARY KEY(`ID`),UNIQUE KEY `groupId` (`groupId`)) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;', (ee, rr, ff) => {
                if (ee === null) {
                    db.query('DESC `pluginswitch`', (eee, rrr, fff) => {
                        var currentPlugins = [];
                        var existedPlugins = [];
                        var pendingAddPlugins = [];
                        r.forEach((item) => {
                            currentPlugins.push(item.plugin);
                        });
                        rrr.forEach((item) => {
                            if (!/ID|groupId/.test(item.Field)) {
                                if (currentPlugins.indexOf(item.Field) === -1) {
                                    db.query(`ALTER TABLE \`pluginswitch\` DROP COLUMN \`${item.Field}\`;`);
                                } else {
                                    existedPlugins.push(item.Field);
                                }
                            }
                        });
                        currentPlugins.forEach((plugin) => {
                            if (existedPlugins.indexOf(plugin) === -1) {
                                pendingAddPlugins.push(plugin);
                            }
                        });
                        pendingAddPlugins.forEach((plugin) => {
                            db.query(`ALTER TABLE \`pluginswitch\` ADD COLUMN \`${plugin}\` TEXT NOT NULL;`);
                        });
                    });
                }
            });
        }
    });
}

// 缓存插件开关表
var switchTableCache = {
    "default": {}
};
function refreshSwitchTableCache() {
    var tmp = {};
    db.query(`SELECT * FROM \`registry\` WHERE \`switchable\` = true`, (e, r, f) => {
        var pluginDefaultState = {};
        r.forEach((item) => {
            pluginDefaultState[item.plugin] = item.defaultState === "enable" ? 1 : 0;
        });
        db.query(`SELECT * FROM \`pluginswitch\``, (ee, rr, ff) => {
            rr.forEach((item) => {
                var groupCache = JSON.parse(JSON.stringify(pluginDefaultState));
                Object.keys(item).forEach((plugin) => {
                    if (typeof (groupCache[plugin]) !== "undefined") {
                        groupCache[plugin] = groupCache[plugin] ^ item[plugin];
                    }
                });
                tmp[item.groupId] = groupCache;
            });
            tmp["default"] = pluginDefaultState;
            switchTableCache = tmp;
        });
    });
}
// 定时刷新缓存
setInterval(() => {
    refreshSwitchTableCache();
}, 10 * 1000);
// 立即缓存
refreshSwitchTableCache();

function isEnable(packet, plugin) {
    if (typeof (packet.group_id) === "undefined") {
        // log.write("传入的包类型不支持", "CONFIG API", "ERROR");
        return true;
    }
    if (typeof (switchTableCache[packet.group_id.toString()]) === "undefined") {
        // log.write("未在缓存内找到传入的群聊", "CONFIG API", "ERROR");
        if (typeof (switchTableCache["default"][plugin]) === "undefined") {
            return true;
        }
        return switchTableCache["default"][plugin] === 1 ? true : false;
    }
    if (typeof (switchTableCache[packet.group_id.toString()][plugin]) === "undefined") {
        // log.write("传入的插件不存在", "CONFIG API", "ERROR");
        return true;
    }
    return switchTableCache[packet.group_id.toString()][plugin] === 1 ? true : false;
}

module.exports = {
    registerPlugin,
    sys,
    getRegistry,
    read,
    write,
    remove,
    generateSwitchTable,
    refreshSwitchTableCache,
    isEnable,
};