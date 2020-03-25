function handle(packet) {
    switch (packet.notice_type) {
        case "group_upload"://群文件

            break;
        case "group_admin"://管理员

            break;
        case "group_decrease"://退群

            break;
        case "group_increase"://进群

            break;
        case "group_ban"://禁言
            
            break;
        case "friend_add"://新好友
            
            break;
        default:
            
            break;
    }
}

module.exports = {
    handle
}