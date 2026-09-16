const { Sale, SaleSchema } = require('./Sale.model');
const { Client, ClientSchema } = require('./Client.model');
const { Product, ProductSchema } = require('./Product.model');
const { WeighingSlip, WeighingSlipSchema } = require('./WeighingSlip.model');
const { Purchase, PurchaseSchema } = require('./Purchase.model');
const { User, UserSchema } = require('./User.model');
const { Counter, CounterSchema } = require('./Counter.model');
const { FinancialSummary, FinancialSummarySchema } = require('./FinancialSummary.model');

module.exports = {
  Sale,
  SaleSchema,
  Client,
  ClientSchema,
  Product,
  ProductSchema,
  WeighingSlip,
  WeighingSlipSchema,
  Purchase,
  PurchaseSchema,
  User,
  UserSchema,
  Counter,
  CounterSchema,
  FinancialSummary,
  FinancialSummarySchema
};
