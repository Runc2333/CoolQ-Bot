/* 通用常量 */
const processPath = process.cwd().replace(/\\/g, "/");//程序运行路径
/* 模块 */
const request = require("sync-request");//同步网络请求
const async_request = require('request');//异步网络请求
const fs = require('fs');//fs
const sharp = require("sharp");//图形库
const gifencoder = require('gifencoder'); // gif encoder
const { createCanvas, loadImage } = require('canvas'); // canvas
const config = require(`${processPath}/utils/configApi.js`);//设置
const log = require(`${processPath}/utils/logger.js`);//日志
const message = require(`${processPath}/utils/messageApi.js`);//消息接口
const cqcode = require(`${processPath}/utils/CQCode.js`);//CQ码编解码器
const tool = require(`${processPath}/utils/toolbox.js`);
const text2svg = require(`text-to-svg`).loadSync(`${processPath}/fonts/FZMingSTJW.TTF`);// text-to-svg

var token = null;
function init(t) {
    token = t;
}

function qnmd(packet, [target, nickname] = []) {
    if (target == '814537405') {
        target = packet.user_id;
    }
    if (!nickname) {
        var user = message.getGroupMemberInfo(packet.group_id, target).nickname;
    } else {
        var user = nickname;
    }
    var nicknameSVG = Buffer.from(text2svg.getSVG(user, {
        x: 0,
        y: 0,
        fontSize: 32,
        anchor: 'top',
        attributes: {
            fill: 'black',
            stroke: 'black'
        }
    }));
    async_request({
        url: `http://q1.qlogo.cn/g?b=qq&nk=${target}&s=640`,
        encoding: null
    }, (_e, _r, avatarRAW) => {
        sharp(avatarRAW).png().rotate(50, {
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }).resize(60, 60).toBuffer((_e, avatar) => {
            sharp(`${processPath}/data/sticker/qnmd/qnmd.png`).composite([{
                input: avatar,
                top: 45,
                left: 175
            },
            {
                input: nicknameSVG,
                top: 5,
                left: 180
            }]).toBuffer().then((result) => {
                var imageBase64 = `base64://${result.toString("base64")}`;
                message.prepare(packet, `${cqcode.image(imageBase64)}`, false).send();
            });
        });
    });
}

function wdnmd(packet, [target] = []) {
    if (target == '814537405') {
        target = packet.user_id;
    }
    async_request({
        url: `http://q1.qlogo.cn/g?b=qq&nk=${target}&s=640`,
        encoding: null
    }, async (_e, _r, avatar) => {
        var imageToComposite = [
            { target: `${processPath}/data/sticker/wdnmd/qnmdg0.png`, width: 70, height: 70, top: 70, left: 20, rotate: 0, },
            { target: `${processPath}/data/sticker/wdnmd/qnmdg1.png`, width: 70, height: 70, top: 70, left: 20, rotate: 0, },
            { target: `${processPath}/data/sticker/wdnmd/qnmdg2.png`, width: 70, height: 70, top: 70, left: 20, rotate: 0, },
            { target: `${processPath}/data/sticker/wdnmd/qnmdg3.png`, width: 70, height: 70, top: 70, left: 20, rotate: 0, },
            { target: `${processPath}/data/sticker/wdnmd/qnmdg4.png`, width: 60, height: 60, top: 62, left: 2, rotate: -25, },
            { target: `${processPath}/data/sticker/wdnmd/qnmdg5.png`, width: 45, height: 45, top: 17, left: 0, rotate: 121, },
            { target: `${processPath}/data/sticker/wdnmd/qnmdg6.png`, width: 40, height: 40, top: 0, left: 0, rotate: 157, }
        ];
        var imageForGif = [];
        for (key in imageToComposite) {
            var tmpResult = await compositeAvatarToImage({
                avatar: avatar,
                target: imageToComposite[key].target,
                width: imageToComposite[key].width,
                height: imageToComposite[key].height,
                top: imageToComposite[key].top,
                left: imageToComposite[key].left,
                rotate: imageToComposite[key].rotate,
            });
            imageForGif.push(tmpResult);
        }
        imageForGif.push(`${processPath}/data/sticker/wdnmd/qnmdg7.png`);
        imageForGif.push(`${processPath}/data/sticker/wdnmd/qnmdg8.png`);
        var result = await pngSequenceToGif(imageForGif);
        var imageBase64 = `base64://${result.toString("base64")}`;
        message.prepare(packet, `${cqcode.image(imageBase64)}`, false).send();
    });
}

async function ddw(packet, sentences) {
    if (sentences.length !== 8) {
        message.prepare(packet, `此生成器要求提供[8]条语句，当前提供了[${sentences.length}]条语句。`, true).send();
        return true;
    }
    for (key in sentences) {
        if (sentences[key].length > 10) {
            message.prepare(packet, `[语句0${key + 1}](${sentences[key]})的字符数超过了[10]个，请控制你的表达。`, true).send();
            return true;
        }
    }
    var sourceImages = fs.readdirSync(`${processPath}/data/sticker/ddw`);
    var imageForGif = [];
    for (image of sourceImages) {
        if (/ddw\d{2}_t\d/.test(image)) {
            var tmpResult = await compositeSentenceToImage({
                sentence: sentences[parseInt(image.match(/(?<=ddw\d{2}_t)\d/)[0])],
                target: `${processPath}/data/sticker/ddw/${image}`,
                fontSize: 16,
                top: 15 + Math.floor(Math.random() * (5 + 5 + 1) - 5),
                left: 10 + Math.floor(Math.random() * (5 + 5 + 1) - 5),
            });
            imageForGif.push(tmpResult);
        } else if (/ddw\d{2}/.test(image)) {
            imageForGif.push(`${processPath}/data/sticker/ddw/${image}`);
        }
    };
    var result = await pngSequenceToGif(imageForGif);
    var imageBase64 = `base64://${result.toString("base64")}`;
    message.prepare(packet, `${cqcode.image(imageBase64)}`, false).send();
}

// 合成文字到底板
function compositeSentenceToImage({ sentence, target, fontSize, top, left } = {}) {
    return new Promise((resolve, reject) => {
        // 文字转SVG
        var sentenceSVG = Buffer.from(text2svg.getSVG(sentence, {
            x: 0,
            y: 0,
            fontSize: fontSize,
            anchor: 'top',
            attributes: {
                fill: 'black',
                stroke: 'black'
            }
        }));
        // 合并SVG到图片
        sharp(target).png().composite([{
            input: sentenceSVG,
            top: top,
            left: left
        }]).toBuffer((e, result) => {
            if (e) {
                reject(e);
            }
            resolve(result);
        });
    });
}

// 合成头像到底板
function compositeAvatarToImage({ avatar, target, width, height, top, left, rotate } = {}) {
    return new Promise((resolve, reject) => {
        sharp(avatar).png().resize(width, height).rotate(rotate, {
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }).toBuffer((_e, resizedAvatar) => {
            sharp(target).composite([{
                input: resizedAvatar,
                top: top,
                left: left
            }]).toBuffer((e, result) => {
                if (e) {
                    reject(e);
                }
                resolve(result);
            });
        });
    });

}

// PNG sequence 2 GIF
function pngSequenceToGif(pngBufferArray) {
    return new Promise((resolve, reject) => {
        sharp(pngBufferArray[0]).metadata().then(async (metadata) => {
            // 创建匹配图片大小的canvas
            const canvas = createCanvas(metadata.width, metadata.height);
            const ctx = canvas.getContext('2d');
            // 创建GIF Encoder
            const encoder = new gifencoder(metadata.width, metadata.height);
            var stream = encoder.createWriteStream(); // 创建写入流
            encoder.start(); // 启动encoder
            encoder.setRepeat(0); // 重复 0启用 1禁用
            encoder.setDelay(100); // 轮播时间
            encoder.setQuality(10); // GIF质量
            for (key in pngBufferArray) {
                let image = await loadImage(pngBufferArray[key]); // 把Buffer读入canvas
                ctx.drawImage(image, 0, 0); // 绘制
                encoder.addFrame(ctx); // 添加帧
            }
            encoder.finish(); // 输出GIF到流
            var result = await streamToBuffer(stream); // 流转为buffer
            resolve(result); // 返回结果
        });
    });
}

// stream 2 buffer
function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        let buffers = [];
        stream.on('error', reject);
        stream.on('data', (data) => buffers.push(data))
        stream.on('end', () => resolve(Buffer.concat(buffers)));
    });
}

module.exports = {
    init,
    qnmd,
    wdnmd,
    ddw,
}