/* 常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
const configFilePath = `${processPath}/config/config.json`;//配置文件路径
/* 模块 */
const fs = require("fs");//文件系统读写
const log = require(`${processPath}/utils/logger.js`);//日志

function readFileConfigIntoObject() {
	try {
		var configFile = fs.readFileSync(configFilePath);//读入配置文件
	} catch (e) {
		log.write("无法载入配置文件: config/config.json!", "CONFIG API", "ERROR");
		log.write("请检查文件是否存在.", "CONFIG API", "ERROR");
		process.exit(true);//退出进程
	}
	try {
		var configObject = JSON.parse(configFile.toString());//解析为对象
	} catch (e) {
		log.write("无法解析配置文件: config/config.json!", "CONFIG API", "ERROR");
		log.write("请检查JSON语法.", "CONFIG API", "ERROR");
		process.exit(true);//退出进程
	}
	return configObject;
}

function get(section, field = null) {
	var configObject = readFileConfigIntoObject();
	try {
		if (field === null) {
			var required = configObject[section];
		} else {
			var required = configObject[section][field];
		}
	} catch (e) {
		var required = undefined;
	}
	return required === undefined ? false : required;
}

function write(section, data, field = null) {
	var configObject = readFileConfigIntoObject();
	if (field === null) {
		configObject[section] = data;//填入数据
	} else {
		configObject[section][field] = data;//填入数据
	}
	var configString = JSON.stringify(configObject, null, "\t");//格式化json
	try {
		fs.writeFileSync(configFilePath, configString);//写入
	} catch (e) {
		log.write("无法写入配置文件: config/config.json!", "CONFIG API", "ERROR");
		process.exit(true);
	}
}

function registerPlugin(arguments) {
	if (typeof (arguments) !== "object") {
		log.write("未能注册插件: 请提供一个对象作为参数.", "CONFIG API", "WARNING");
		return false;
	}
	switch (arguments.type) {
		case "message"://消息事件
			var config = get("GLOBAL", "MESSAGE_REGISTRY");
			var subTypes = arguments.subType.split(/\s*,\s*/);
			for (key in subTypes) {
				switch (subTypes[key]) {
					case "groupMessage"://群组消息
						config["GROUP_MESSAGE"].push({
							"script": arguments.script,
							"handler": arguments.handler,
							"regex": arguments.regex,
							"notification": arguments.notification === false ? false : true
						});
						break;
					case "privateMessage"://私聊消息
						config["PRIVATE_MESSAGE"].push({
							"script": arguments.script,
							"handler": arguments.handler,
							"regex": arguments.regex,
							"notification": arguments.notification === false ? false : true
						});
						break;
					case "discussMessage"://讨论组消息
						config["DISCUSS_MESSAGE"].push({
							"script": arguments.script,
							"handler": arguments.handler,
							"regex": arguments.regex,
							"notification": arguments.notification === false ? false : true
						});
						break;
					default:
						log.write("未能注册插件: 提供的注册模式不受支持.", "CONFIG API", "WARNING");
						return false;
				}
			}
			write("GLOBAL", config, "MESSAGE_REGISTRY");
			if (arguments.notification === false) {
				log.write("警告: 插件开发者希望隐藏转发处理提示, 您将不会看到有关消息转发给此插件的提示.", "CONFIG API", "WARNING");
			}
			break;
		case "notice":
			var config = get("GLOBAL", "NOTICE_REGISTRY");
			var subTypes = arguments.subType.split(/\s*,\s*/);
			for (key in subTypes) {
				switch (subTypes[key]) {
					case "groupUpload":
						config["GROUP_UPLOAD"][arguments.script] = {
							"handler": arguments.handler
						};
						break;
					case "groupAdmin":
						config["GROUP_ADMIN"][arguments.script] = {
							"handler": arguments.handler
						};
						break;
					case "groupIncrease":
						config["GROUP_INCREASE"][arguments.script] = {
							"handler": arguments.handler
						};
						break;
					case "groupDecrease":
						config["GROUP_DECREASE"][arguments.script] = {
							"handler": arguments.handler
						};
						break;
					case "groupBan":
						config["GROUP_BAN"][arguments.script] = {
							"handler": arguments.handler
						};
						break;
					case "friendAdd":
						config["FRIEND_ADD"][arguments.script] = {
							"handler": arguments.handler
						};
						break;
					default:
						log.write("未能注册插件: 提供的注册模式不受支持.", "CONFIG API", "WARNING");
						return false;
				}
			}
			write("GLOBAL", config, "NOTICE_REGISTRY");
			break;
		case "request":
			var config = get("GLOBAL", "REQUEST_REGISTRY");
			var subTypes = arguments.subType.split(/\s*,\s*/);
			for (key in subTypes) {
				switch (subTypes[key]) {
					case "friend":
						config["FRIEND"][arguments.script] = {
							"handler": arguments.handler
						};
						break;
					case "group":
						config["GROUP"][arguments.script] = {
							"handler": arguments.handler
						};
						break;
					default:
						log.write("未能注册插件: 提供的注册模式不受支持.", "CONFIG API", "WARNING");
						return false;
				}
			}
			write("GLOBAL", config, "REQUEST_REGISTRY");
			break;
		default:
			log.write("未能注册插件: 提供的注册模式不受支持.", "CONFIG API", "WARNING");
			return false;
	}
	var config = get("GLOBAL", "PLUGIN_REGISTRY");
	if (typeof (config[arguments.script]) === "undefined") {
		config[arguments.script] = typeof (arguments.description) !== "undefined" ? arguments.description : "该插件开发者未填写描述.";
		write("GLOBAL", config, "PLUGIN_REGISTRY");
	}
	var sections = { "message": "MESSAGE事件", "notice": "NOTICE事件", "request": "REQUEST事件" };
	log.write(`插件<${arguments.script}>已注册${sections[arguments.type]}.`, "CONFIG API", "INFO");
	return true;
}

function registerSuperCommand(arguments) {
	if (typeof (arguments) !== "object") {
		log.write("未能注册命令: 请提供一个对象作为参数.", "CONFIG API", "WARNING");
		return false;
	}
	var config = get("GLOBAL", "SUPER_COMMAND_REGISTRY");
	if (typeof (config[arguments.command]) !== "undefined") {
		log.write(`未能注册插件<${arguments.script}>: 命令</${arguments.command}>已被其他插件注册.`, "CONFIG API", "ERROR");
		return false;
	}
	config[arguments.command] = {};
	config[arguments.command]["script"] = arguments.script;
	config[arguments.command]["handler"] = arguments.handler;
	config[arguments.command]["argument"] = typeof (arguments.argument) !== "undefined" ? arguments.argument : "";
	config[arguments.command]["description"] = typeof (arguments.description) !== "undefined" ? arguments.description : "";
	write("GLOBAL", config, "SUPER_COMMAND_REGISTRY");
	if (!arguments.skip) {
		var config = get("GLOBAL", "PLUGIN_REGISTRY");
		if (typeof (config[arguments.script]) === "undefined") {
			config[arguments.script] = "该插件开发者未填写描述.";
			write("GLOBAL", config, "PLUGIN_REGISTRY");
		}
	}
	log.write(`插件<${arguments.script}>已注册命令</${arguments.command}>.`, "CONFIG API", "INFO");
}

function checkPermission(packet) {
	if (packet.sender.role !== "admin" && packet.sender.role !== "owner") {
		var msg = "权限不足.";
		message.prepare(packet, msg, true).send();
		return false;
	}
	return true;
}

/* 初始化配置文件注册区 */
write("GLOBAL", {}, "PLUGIN_REGISTRY");
write("GLOBAL", { GROUP_MESSAGE: [], PRIVATE_MESSAGE: [], DISCUSS_MESSAGE: [] }, "MESSAGE_REGISTRY");
write("GLOBAL", { GROUP_UPLOAD: {}, GROUP_ADMIN: {}, GROUP_INCREASE: {}, GROUP_DECREASE: {}, GROUP_BAN: {}, FRIEND_ADD: {} }, "NOTICE_REGISTRY");
write("GLOBAL", { FRIEND: {}, GROUP: {} }, "REQUEST_REGISTRY");
write("GLOBAL", {}, "SUPER_COMMAND_REGISTRY");

module.exports = {
	get,
	write,
	registerPlugin,
	registerSuperCommand,
	checkPermission
};