const Template = require("../template")
const Database = require(".././database/actions")
const _ = require("lodash")


module.exports = {
    getVoucher: async function (ctx, voucherCode) {
        return await Database.getVoucherByCode(ctx.botInfo.id, voucherCode)
    },
    validateVoucher: async function (ctx, voucher) {
        const user = _.find(voucher.Users, function (user) {
            return user.telegramID === ctx.from.id
        })
        return user ? user.VoucherUser.createdAt : null
    },
    updateVoucherForUser: async function (userID, voucherID) {
        await Database.createVoucherUser(userID, voucherID)
    }
}