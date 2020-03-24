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
		case "groupMessage":
			var config = get("GLOBAL", "GROUP_MESSAGE_REGISTRY");
			config[arguments.script] = {
				"handler": arguments.handler,
				"regex": arguments.regex,
				"description": arguments.description
			};
			write("GLOBAL", config, "GROUP_MESSAGE_REGISTRY");
			break;
		case "privateMessage":
			var config = get("GLOBAL", "PRIVATE_MESSAGE_REGISTRY");
			config[arguments.script] = {
				"handler": arguments.handler,
				"regex": arguments.regex,
				"description": arguments.description
			};
			write("GLOBAL", config, "PRIVATE_MESSAGE_REGISTRY");
			break;
		case "discussMessage":
			var config = get("GLOBAL", "DISCUSS_MESSAGE_REGISTRY");
			config[arguments.script] = {
				"handler": arguments.handler,
				"regex": arguments.regex,
				"description": arguments.description
			};
			write("GLOBAL", config, "DISCUSS_MESSAGE_REGISTRY");
			break;
		case "notice":
			var config = get("GLOBAL", "NOTICE_REGISTRY");
			config[arguments.script] = {
				"handler": arguments.handler,
				"description": arguments.description
			};
			write("GLOBAL", config, "NOTICE_REGISTRY");
		case "request":
			var config = get("GLOBAL", "REQUEST_REGISTRY");
			config[arguments.sscript] = {
				"handler": arguments.shandler,
				"description": arguments.description
			};
			write("GLOBAL", config, "REQUEST_REGISTRY");
			break;
		default:
			log.write("未能注册插件: 提供的注册模式不受支持.", "CONFIG API", "WARNING");
			return false;
	}
	var sections = { "groupMessage": "群组MESSAGE事件", "privateMessage": "私聊MESSAGE事件", "discussMessage": "讨论组MESSAGE事件", "notice": "NOTICE事件", "request": "REQUEST事件" };
	log.write(`插件<${arguments.script}>已注册${sections[arguments.type]}.`, "CONFIG API", "INFO");
	return true;
}

function registerSuperCommand(arguments) {
	if (typeof (arguments) !== "object") {
		log.write("未能注册命令: 请提供一个对象作为参数.", "CONFIG API", "WARNING");
		return false;
	}
	var config = get("GLOBAL", "SUPER_COMMAND_REGISTRY");
	config[arguments.command] = {};
	config[arguments.command]["script"] = arguments.script;
	config[arguments.command]["handler"] = arguments.handler;
	config[arguments.command]["argument"] = typeof (arguments.argument) !== "undefined" ? arguments.argument : "";
	config[arguments.command]["description"] = typeof (arguments.description) !== "undefined" ? arguments.description : "";
	write("GLOBAL", config, "SUPER_COMMAND_REGISTRY");
	log.write(`插件<${arguments.script}>已注册命令</${arguments.command}>.`, "CONFIG API", "INFO");
}

/* 清空配置文件注册区 */
write("GLOBAL", {}, "GROUP_MESSAGE_REGISTRY");
write("GLOBAL", {}, "PRIVATE_MESSAGE_REGISTRY");
write("GLOBAL", {}, "DISCUSS_MESSAGE_REGISTRY");
write("GLOBAL", {}, "NOTICE_REGISTRY");
write("GLOBAL", {}, "REQUEST_REGISTRY");
write("GLOBAL", {}, "SUPER_COMMAND_REGISTRY");

module.exports = {
	get,
	write,
	registerPlugin,
	registerSuperCommand
};