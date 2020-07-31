/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
/* 局部常量 */
const BOT_QQNUM = config.sys("BOT_QQNUM");
const API_HOST = config.sys("API_HOST");//API Host
const API_HTTP_PORT = config.sys("API_HTTP_PORT");//HTTP API Port
const ACCESS_TOKEN = config.sys("ACCESS_TOKEN");//WebSocket Access Token
const GLOBAL_ADMINISTRATORS = config.sys("GLOBAL_ADMINISTRATORS");//全局管理员

function at(uin) {
    return `[CQ:at,qq=${uin}]`;
}

function face(code) {
    return `[CQ:face,id=${code}]`;
}

function image(src, isBase64 = false) {
    if (isBase64) {
        return `[CQ:image,file=base64://${src}]`;
    } else {
        return `[CQ:image,file=${src}]`;
    }
}

function record(src, isBase64 = false) {
    if (isBase64) {
        return `[CQ:record,file=base64://${src}]`;
    } else {
        return `[CQ:record,file=${src}]`;
    }
}

function decode(text) {
    var CQObjectsMatched = text.match(/\[CQ:.+?]/ig);
    CQObjects = [];
    if (CQObjectsMatched !== null) {
        CQObjectsMatched.forEach(function (value, _key) {
            switch (value.match(/(?<=\[CQ:).+?(?=,)/ig)[0]) {
                case "image":
                    CQObjects.push({
                        type: "image",
                        url: value.match(/(?<=,url=).+(?=])/)[0],
                        input: value,
                    });
                    break;
                case "record":
                    CQObjects.push({
                        type: "record",
                        url: `http://${API_HOST}:${API_HTTP_PORT}/data/record/${value.match(/(?<=,file=).+(?=])/)[0]}?access_token=${ACCESS_TOKEN}`,
                        input: value,
                    });
                    break;
                case "face":
                    CQObjects.push({
                        type: "face",
                        id: value.match(/(?<=,id=).+(?=])/)[0],
                        input: value,
                    });
                    break;
                case "emoji":
                    CQObjects.push({
                        type: "emoji",
                        id: value.match(/(?<=,id=).+(?=])/)[0],
                        input: value,
                    });
                    break;
                case "sface":
                    CQObjects.push({
                        type: "sface",
                        id: value.match(/(?<=,id=).+(?=])/)[0],
                        input: value,
                    });
                    break;
                case "bface":
                    CQObjects.push({
                        type: "bface",
                        id: value.match(/(?<=,id=).+(?=])/)[0],
                        input: value,
                    });
                    break;
                case "at":
                    var atTarget = value.match(/(?<=,qq=).+(?=])/)[0]
                    CQObjects.push({
                        type: "at",
                        target: atTarget,
                        me: atTarget === BOT_QQNUM ? true : false,
                        input: value,
                    });
                    break;
                case "rps":
                    CQObjects.push({
                        type: "rps",
                        result: value.match(/(?<=,type=).+(?=])/)[0],
                        input: value,
                    });
                    break;
                case "dice":
                    CQObjects.push({
                        type: "dice",
                        result: value.match(/(?<=,type=).+(?=])/)[0],
                        input: value,
                    });
                    break;
                case "shake":
                    CQObjects.push({
                        type: "shake",
                        input: value,
                    });
                    break;
                case "location":
                    CQObjects.push({
                        type: "location",
                        longitude: value.match(/(?<=,lon=).+?(?=[\],])/)[0],
                        latitude: value.match(/(?<=,lat=).+?(?=[\],])/)[0],
                        title: value.match(/(?<=,title=).+?(?=[\],])/)[0],
                        content: value.match(/(?<=,content=).+?(?=[\],])/)[0],
                        style: value.match(/(?<=,style=).+?(?=[\],])/)[0],
                        input: value,
                    });
                    break;
                case "sign":
                    CQObjects.push({
                        type: "sign",
                        location: value.match(/(?<=,location=).+?(?=[\],])/)[0],
                        title: value.match(/(?<=,title=).+?(?=[\],])/)[0],
                        image: value.match(/(?<=,image=).+?(?=[\],])/)[0],
                        input: value,
                    });
                    break;
                case "music":
                    var platform = value.match(/(?<=,type=).+?(?=[\],])/)[0]
                    var url = value.match(/(?<=,url=).+?(?=[\],])/);
                    var audio = value.match(/(?<=,audio=).+?(?=[\],])/);
                    var title = value.match(/(?<=,title=).+?(?=[\],])/);
                    var content = value.match(/(?<=,content=).+?(?=[\],])/);
                    var image = value.match(/(?<=,image=).+?(?=[\],])/);
                    var id = value.match(/(?<=,id=).+?(?=[\],])/);
                    var style = value.match(/(?<=,style=).+?(?=[\],])/);
                    if (platform == "custom") {
                        CQObjects.push({
                            type: "music",
                            platform: platform,
                            "url": url === null ? false : url[0],
                            "audio": audio === null ? false : audio[0],
                            "title": title === null ? false : title[0],
                            "content": content === null ? false : content[0],
                            "image": image === null ? false : image[0],
                            input: value,
                        });
                    } else {
                        CQObjects.push({
                            type: "music",
                            platform: platform,
                            "id": id === null ? false : id[0],
                            "style": style === null ? false : style[0], 
                            input: value,
                        });
                    }
                    break;
                case "share":
                    var url = value.match(/(?<=,url=).+?(?=[\],])/);
                    var title = value.match(/(?<=,title=).+?(?=[\],])/);
                    var content = value.match(/(?<=,content=).+?(?=[\],])/);
                    var image = value.match(/(?<=,image=).+?(?=[\],])/);
                    CQObjects.push({
                        type: "share",
                        "url": url === null ? false : url[0],
                        "title": title === null ? false : title[0],
                        "content": content === null ? false : content[0],
                        "image": image === null ? false : image[0],
                        input: value,
                    });
                    break;
                case "rich":
                    var url = value.match(/(?<=,url=).+?(?=[\],])/);
                    var text = value.match(/(?<=,text=).+?(?=[\],])/);
                    CQObjects.push({
                        type: "rich",
                        "url": url === null ? false : url[0],
                        "text": text === null ? false : text[0],
                        input: value
                    });
                    break;
                case "hb":
                    var title = value.match(/(?<=,title=).+?(?=[\],])/);
                    CQObjects.push({
                        type: "hb",
                        "title": title === null ? false : title[0],
                        input: value
                    });
                    break;
                case "show":
                    var id = value.match(/(?<=,id=).+?(?=[\],])/);
                    var qq = value.match(/(?<=,qq=).+?(?=[\],])/);
                    CQObjects.push({
                        type: "show",
                        "id": id === null ? false : id[0],
                        "qq": qq === null ? false : qq[0],
                        input: value
                    });
                    break;
                default:
                    log.write(`收到了未能解析的CQ码: ${value}`, "CQCode", "WARNING");
                    // GLOBAL_ADMINISTRATORS.forEach(function (item) {
                    //     message.send("private", item, `收到了未能解析的CQ码: ${value}`, true);
                    // });
                    break;
            }
        });
    }
    var returnObject = {};
    returnObject.CQObjects = CQObjects;
    returnObject.pureText = text.replace(/\[CQ:[\s\S]+?]/ig, "").replace(/^\s+|\s+$/ig, "");
    return returnObject;
}

module.exports = {
    at,
    face,
    image,
    record,
    decode
}