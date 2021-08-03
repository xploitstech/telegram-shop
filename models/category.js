const { Sequelize, DataTypes, Deferrable } = require("sequelize")
const db = require("../db")
const Shop = require("./shop")


const Category = db.define(
	"Category",
	{
		id: {
			type: DataTypes.UUID,
			defaultValue: Sequelize.UUIDV4,
			primaryKey: true,
			allowNull: false,
		},
		name: {
			type: DataTypes.STRING(120),
			allowNull: false,
		},
		shopID: {
			type: DataTypes.INTEGER,
			references: {
				model: Shop,
				key: "botID",
				deferrable: Deferrable.INITIALLY_IMMEDIATE,
			},
		},
	},
	{
		timestamps: true,
	}
)

module.exports = Category
