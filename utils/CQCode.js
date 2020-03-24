function at(uin) {
    return `[CQ:at,qq=${uin}]`;
}

function face(code) {
    return `[CQ:face,id=${code}]`;
}

function image(src) {
    return `[CQ:CQ:image,file=${src}]`;
}

function decode(message) {
    var CQObjects = message.match(/\[CQ:.+?]/ig);
    var returnObject = {};
    returnObject.CQObjects = CQObjects;
    returnObject.pureText = message.replace(/\[CQ:.+?]/ig, "").replace(/^\s+|\s+$/ig, "");
    return returnObject;
}

module.exports = {
    at,
    face,
    image,
    decode
}