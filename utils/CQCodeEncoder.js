function at(uin) {
    return `[CQ:at,qq=${uin}]`;
}

function face(code) {
    return `[CQ:face,id=${code}]`;
}

function image(src) {
    return `[CQ:CQ:image,file=${src}]`;
}

module.exports = {
    at,
    face,
    image
}