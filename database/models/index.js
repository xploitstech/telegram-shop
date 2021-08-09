const Shop = require("./shop")
const Category = require("./category")
const Product = require("./product")
const User = require("./user")
const Address = require("./address")
const Order = require("./order")
const Cart = require("./cart")
const Payment = require("./payment")
const Voucher = require("./voucher")
const VoucherUser = require("./voucherUser")


User.hasMany(Shop, { sourceKey: "telegramID", foreignKey: "ownerID" })
User.hasMany(Address, { sourceKey: "telegramID", foreignKey: "userID" })
User.hasMany(Order, { sourceKey: "telegramID", foreignKey: "userID" })
User.belongsToMany(Voucher, { through: "VoucherUser", sourceKey: "telegramID", foreignKey: "userID" })

Shop.belongsTo(User, { foreignKey: "ownerID" })
Shop.hasMany(Category, { sourceKey: "botID", foreignKey: "shopID" })
Shop.hasMany(Order, { sourceKey: "botID", foreignKey: "shopID" })
Shop.hasMany(Voucher, { sourceKey: "botID", foreignKey: "shopID" })

Voucher.belongsTo(Shop, { foreignKey: "shopID" })
Voucher.belongsToMany(User, { through: "VoucherUser", sourceKey: "id", foreignKey: "voucherID" })

Category.belongsTo(Shop, { foreignKey: "shopID" })
Category.hasMany(Product, { sourceKey: "id", foreignKey: "categoryID" })

Product.belongsTo(Category, { foreignKey: "categoryID" })
Product.belongsToMany(Order, { through: "Cart", sourceKey: "id", foreignKey: "productID" })

Order.belongsTo(Shop, { foreignKey: "shopID" })
Order.belongsToMany(Product, { through: "Cart", sourceKey: "id", foreignKey: "orderID" })
Order.hasOne(Payment, { sourceKey: "id", foreignKey: "orderID" })

Payment.belongsTo(Order, { foreignKey: "orderID" })
Payment.belongsTo(Address, { foreignKey: "addressID" })

Address.belongsTo(User, { foreignKey: "userID" })
Address.hasMany(Payment, { sourceKey: "id", foreignKey: "addressID" })

module.exports = { Shop, Category, Product, User, Address, Order, Cart, Payment, Voucher, VoucherUser }