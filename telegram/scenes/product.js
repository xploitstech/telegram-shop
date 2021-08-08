const { Scenes } = require("telegraf")
const Product = require("../commands/product")
const Cart = require("../commands/cart")
const Utils = require("../utils")
const _ = require("lodash")
const Database = require("../../database/actions")
const Template = require("../template")


const productScene = new Scenes.BaseScene("PRODUCT_SCENE")

/**
 * cleanUpState: [
 *      { id: 1234, type: "cart" },             // Cart message
 *      { id: 2445, productName: "Bike" },      // Product messages
 *      { id: 1231, type: "user" }              // User text messages,
 *      { id: 1892, type: "system" }            // System messages
 * ]
 */

productScene.enter(async (ctx) => {
    const cart = await Database.getPendingCartByCategory(ctx.botInfo.id, ctx.scene.state.category, ctx.from.id)

    const productMessageID = await Product.sendCatalogue(ctx, ctx.scene.state.category, cart)
    ctx.session.cleanUpState = productMessageID

    const message = await Cart.sendMessage(ctx, cart)
    Utils.updateCleanUpState(ctx, { id: message.message_id, type: "cart" })       // Append cart message into session clean up state
})

productScene.on("callback_query", async (ctx) => {
    const [method, data] = Utils.getRouteData(ctx)
    const pathData = Utils.getPathData(data)

    switch (method) {
        case "GET":
            if (pathData[0] === "category") {           // i.e GET /category
                ctx.scene.enter("CATEGORY_SCENE")
            } else if (pathData[0] === "checkout") {    // i.e GET /checkout
                ctx.scene.enter("CART_SCENE")
            }
            break
        case "POST":
            const categoryName = pathData[1]
            const productName = pathData[2]
            const action = pathData[3]
            const inlineKeyboardData = _.flatten(ctx.callbackQuery.message.reply_markup.inline_keyboard)
            const currentQuantity = inlineKeyboardData[2].text.split(" ")[1]        // i.e. Quantity: 23

            try {
                if (action === "add") {                 // i.e. POST /cart/category/product/add
                    await Cart.addProduct(ctx, productName, 1)
                    await Product.editMessage(ctx, categoryName, productName, parseInt(currentQuantity) + 1)
                    await Cart.editMessageByID(ctx, categoryName, getCartMessageID(ctx))
                } else if (action === "remove") {
                    if (currentQuantity > 0) {          // i.e. POST /cart/category/product/remove
                        await Cart.removeProduct(ctx, productName, 1)
                        await Product.editMessage(ctx, categoryName, productName, parseInt(currentQuantity) - 1)
                        await Cart.editMessageByID(ctx, categoryName, getCartMessageID(ctx))
                    }
                } else if (action === "edit") {     // i.e. POST /cart/category/product/edit/?available=XXX&?current=YYY
                    const parameters = Utils.getQueryParameters(pathData[4])        // i.e. ["?available", 10, "?current", 8]
                    ctx.session.isWaiting = {
                        status: true,
                        available: parameters[1],
                        current: parameters[3],
                        productName: productName,
                        categoryName: categoryName,
                    }
                    const inputMessage = await ctx.replyWithHTML(Template.inputQuantityMessage(parameters[1], parameters[3], productName))
                    Utils.updateCleanUpState(ctx, { id: inputMessage.message_id, type: "system" })
                }
            } catch (error) {
                await ctx.replyWithHTML(error)
            }
            break
        default:
            break
    }
    await ctx.answerCbQuery().catch(err => console.log(err))
})

// Listener to clear message after scene ends
productScene.on("message", async (ctx) => {
    Utils.updateCleanUpState(ctx, {       // Append normal messages into session clean up state
        id: ctx.message.message_id,
        type: "user"
    })

    if (ctx.session.isWaiting && ctx.session.isWaiting.status) {       // Checks if user enters text input option
        if (ctx.message.text.toLowerCase() === "cancel") {
            disableWaitingStatus(ctx)
            return await ctx.replyWithHTML(Template.cancelInputMessage())
        }

        const available = parseInt(ctx.session.isWaiting.available)
        const current = parseInt(ctx.session.isWaiting.current)
        const productName = ctx.session.isWaiting.productName
        const categoryName = ctx.session.isWaiting.categoryName
        const messageID = getProductMessageID(ctx, productName)

        try {
            const quantity = parseInt(ctx.message.text)
            if (isNaN(quantity)) {
                throw "Please enter a <b>number</b>!"
            } else if (quantity > available) {
                throw `Kindly enter a number smaller than <b>${available}</b>!`
            }

            if (quantity === current) { }
            else if (quantity > current) {
                await Cart.addProduct(ctx, productName, quantity - current)
                await Product.editMessageByID(ctx, categoryName, productName, quantity, messageID)
            } else {
                const difference = current - quantity       // Prevent quantity from becoming negative
                await Cart.removeProduct(ctx, productName, difference < 0 ? 0 : difference)
                await Product.editMessageByID(ctx, categoryName, productName, quantity, messageID)
            }

            // REFACTOR CODE
            disableWaitingStatus(ctx)          // Reset session data after completion

            // Clean up text messages after 3 seconds
            const success = await ctx.replyWithHTML(Template.inputSuccessMessage(productName, current, quantity))
            Utils.updateCleanUpState(ctx, { id: success.message_id, type: "system" })

            setTimeout(() => {
                Utils.cleanUpMessage(ctx, true, ["system", "user"], true)
            }, 10 * 1000)

            const cart = await Database.getPendingCartByCategory(ctx.botInfo.id, categoryName, ctx.from.id)
            const message = await Cart.sendMessage(ctx, cart)
            replaceCartMessageInState(ctx, { id: message.message_id, type: "cart" })
        } catch (error) {
            await ctx.replyWithHTML(error)
        }
    }
})

const getCartMessageID = (ctx) => {
    return _.find(ctx.session.cleanUpState, function (o) {
        return o.type === "cart"
    }).id
}

const getProductMessageID = (ctx, productName) => {
    return _.find(ctx.session.cleanUpState, function (o) { return o.productName === productName }).id
}

const disableWaitingStatus = (ctx) => {
    ctx.session.isWaiting.status = false
}

const replaceCartMessageInState = (ctx, data) => {
    ctx.session.cleanUpState = _.map(ctx.session.cleanUpState, function (message) {         // Convert old cart message ID into text to prune
        if (message.type === "cart") {
            message.type = "user"
        }
        return message
    })
    Utils.updateCleanUpState(ctx, data)
}

productScene.leave(async (ctx) => {
    console.log("Clearing product scene")
    await Utils.cleanUpMessage(ctx, true)
})

module.exports = {
    productScene
}