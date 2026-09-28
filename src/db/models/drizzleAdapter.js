import {
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  inArray,
  notInArray,
  like,
  isNull,
  isNotNull,
  and,
  or,
  asc,
  desc,
  sql,
} from "drizzle-orm";
import { getDb } from "../index.js";

// Sequelize compatibility symbols for Op
export const Op = {
  eq: Symbol("eq"),
  ne: Symbol("ne"),
  gt: Symbol("gt"),
  gte: Symbol("gte"),
  lt: Symbol("lt"),
  lte: Symbol("lte"),
  in: Symbol("in"),
  notIn: Symbol("notIn"),
  like: Symbol("like"),
  or: Symbol("or"),
  and: Symbol("and"),
};

/**
 * Build Drizzle WHERE condition from Sequelize-style where object
 */
export function buildWhereClause(table, whereObj) {
  if (!whereObj || Object.keys(whereObj).length === 0) {
    return undefined;
  }

  const conditions = [];

  for (const [key, value] of Object.entries(whereObj)) {
    // Top-level Op.or / Op.and
    if (key === "or" || key === Op.or.toString()) {
      if (Array.isArray(value)) {
        const sub = value.map((w) => buildWhereClause(table, w)).filter(Boolean);
        if (sub.length > 0) conditions.push(or(...sub));
      }
      continue;
    }
    if (key === "and" || key === Op.and.toString()) {
      if (Array.isArray(value)) {
        const sub = value.map((w) => buildWhereClause(table, w)).filter(Boolean);
        if (sub.length > 0) conditions.push(and(...sub));
      }
      continue;
    }

    const column = table[key];
    if (!column) continue;

    if (value === null || value === undefined) {
      conditions.push(isNull(column));
    } else if (typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
      // Operator object
      const syms = Object.getOwnPropertySymbols(value);
      const strKeys = Object.keys(value);

      for (const sym of syms) {
        const val = value[sym];
        const desc = sym.description || String(sym).replace(/^Symbol\(|\)$/g, "");
        if (sym === Op.eq || desc === "eq") conditions.push(val === null ? isNull(column) : eq(column, val));
        else if (sym === Op.ne || desc === "ne") conditions.push(val === null ? isNotNull(column) : ne(column, val));
        else if (sym === Op.gt || desc === "gt") conditions.push(gt(column, val instanceof Date ? val.toISOString() : val));
        else if (sym === Op.gte || desc === "gte") conditions.push(gte(column, val instanceof Date ? val.toISOString() : val));
        else if (sym === Op.lt || desc === "lt") conditions.push(lt(column, val instanceof Date ? val.toISOString() : val));
        else if (sym === Op.lte || desc === "lte") conditions.push(lte(column, val instanceof Date ? val.toISOString() : val));
        else if (sym === Op.in || desc === "in") conditions.push(inArray(column, val));
        else if (sym === Op.notIn || desc === "notIn") conditions.push(notInArray(column, val));
        else if (sym === Op.like || desc === "like") conditions.push(like(column, val));
      }

      // Check string versions of operators if any
      for (const k of strKeys) {
        const val = value[k];
        if (k === "ne") conditions.push(val === null ? isNotNull(column) : ne(column, val));
        else if (k === "in") conditions.push(inArray(column, val));
        else if (k === "notIn") conditions.push(notInArray(column, val));
        else if (k === "lte") conditions.push(lte(column, val instanceof Date ? val.toISOString() : val));
        else if (k === "gte") conditions.push(gte(column, val instanceof Date ? val.toISOString() : val));
        else if (k === "lt") conditions.push(lt(column, val instanceof Date ? val.toISOString() : val));
        else if (k === "gt") conditions.push(gt(column, val instanceof Date ? val.toISOString() : val));
      }
    } else if (Array.isArray(value)) {
      conditions.push(inArray(column, value));
    } else {
      // Normal scalar comparison
      const formattedVal = value instanceof Date ? value.toISOString() : value;
      conditions.push(eq(column, formattedVal));
    }
  }

  // Also check symbol properties on whereObj itself (e.g. { [Op.or]: [...] })
  const topSymbols = Object.getOwnPropertySymbols(whereObj);
  for (const sym of topSymbols) {
    const desc = sym.description || String(sym).replace(/^Symbol\(|\)$/g, "");
    if (sym === Op.or || desc === "or") {
      const arr = whereObj[sym];
      if (Array.isArray(arr)) {
        const sub = arr.map((w) => buildWhereClause(table, w)).filter(Boolean);
        if (sub.length > 0) conditions.push(or(...sub));
      }
    } else if (sym === Op.and || desc === "and") {
      const arr = whereObj[sym];
      if (Array.isArray(arr)) {
        const sub = arr.map((w) => buildWhereClause(table, w)).filter(Boolean);
        if (sub.length > 0) conditions.push(and(...sub));
      }
    }
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

/**
 * Build Drizzle ORDER BY clause
 */
export function buildOrderBy(table, orderSpec) {
  if (!orderSpec || !Array.isArray(orderSpec) || orderSpec.length === 0) {
    return undefined;
  }

  const clauses = [];
  for (const item of orderSpec) {
    if (Array.isArray(item)) {
      const [colName, dir = "ASC"] = item;
      const col = table[colName];
      if (col) {
        clauses.push(dir.toUpperCase() === "DESC" ? desc(col) : asc(col));
      }
    } else if (typeof item === "string") {
      const col = table[item];
      if (col) clauses.push(asc(col));
    }
  }

  return clauses.length > 0 ? clauses : undefined;
}

/**
 * Active Record Model Instance
 */
export class ModelInstance {
  constructor(model, data) {
    this._model = model;
    this._data = { ...data };

    for (const [key, value] of Object.entries(data)) {
      this[key] = value;
    }
  }

  toJSON() {
    const res = {};
    for (const key of Object.keys(this._model.table)) {
      if (this[key] !== undefined) {
        res[key] = this[key];
      }
    }
    // Also include any relations
    for (const key of Object.keys(this)) {
      if (!key.startsWith("_") && !(key in res)) {
        res[key] = this[key];
      }
    }
    return res;
  }

  async save() {
    const pk = this._model.primaryKey;
    const pkVal = this[pk];
    const db = getDb();
    const table = this._model.table;

    const valuesToUpdate = {};
    for (const col of Object.keys(table)) {
      if (col === pk) continue;
      if (this[col] !== undefined) {
        const val = this[col];
        valuesToUpdate[col] = val instanceof Date ? val.toISOString() : val;
      }
    }

    if ("updated_at" in table && !valuesToUpdate.updated_at) {
      valuesToUpdate.updated_at = new Date().toISOString();
      this.updated_at = valuesToUpdate.updated_at;
    }

    if (pkVal !== undefined && pkVal !== null) {
      await db.update(table).set(valuesToUpdate).where(eq(table[pk], pkVal)).run();
    } else {
      // Insert if no PK yet
      const payload = {};
      for (const [k, v] of Object.entries(this.toJSON())) {
        payload[k] = v instanceof Date ? v.toISOString() : v;
      }
      const res = await db.insert(table).values(payload).returning().get();
      if (res) {
        Object.assign(this, res);
      }
    }

    return this;
  }

  async destroy() {
    const pk = this._model.primaryKey;
    const pkVal = this[pk];
    const db = getDb();
    const table = this._model.table;

    if (pkVal !== undefined && pkVal !== null) {
      await db.delete(table).where(eq(table[pk], pkVal)).run();
      return 1;
    }
    return 0;
  }

  async increment(field, options = { by: 1 }) {
    const by = options.by || 1;
    this[field] = (Number(this[field]) || 0) + by;
    await this.save();
    return this;
  }

  async decrement(field, options = { by: 1 }) {
    const by = options.by || 1;
    this[field] = (Number(this[field]) || 0) - by;
    await this.save();
    return this;
  }
}

/**
 * Drizzle Model Definition / Adapter
 */
export function createModel(name, table, primaryKey = "id", options = {}) {
  class ModelClass {
    static modelName = name;
    static table = table;
    static primaryKey = primaryKey;
    static associations = new Map();

    static hasMany(targetModel, { foreignKey, as }) {
      this.associations.set(as || targetModel.modelName, {
        type: "hasMany",
        targetModel,
        foreignKey,
        as: as || targetModel.modelName,
      });
    }

    static belongsTo(targetModel, { foreignKey, as }) {
      this.associations.set(as || targetModel.modelName, {
        type: "belongsTo",
        targetModel,
        foreignKey,
        as: as || targetModel.modelName,
      });
    }

    static hasOne(targetModel, { foreignKey, as }) {
      this.associations.set(as || targetModel.modelName, {
        type: "hasOne",
        targetModel,
        foreignKey,
        as: as || targetModel.modelName,
      });
    }

    static async findByPk(pk, queryOpts = {}) {
      if (pk === undefined || pk === null) return null;
      const db = getDb();
      const whereCond = eq(table[primaryKey], String(pk));
      let query = db.select().from(table).where(whereCond);
      const row = await query.get();
      if (!row) return null;

      const instance = new ModelInstance(ModelClass, row);
      if (queryOpts.include && Array.isArray(queryOpts.include)) {
        await ModelClass._populateIncludes([instance], queryOpts.include);
      }
      return instance;
    }

    static async findOne(queryOpts = {}) {
      const db = getDb();
      let query = db.select().from(table);

      if (queryOpts.where) {
        const whereClause = buildWhereClause(table, queryOpts.where);
        if (whereClause) query = query.where(whereClause);
      }

      if (queryOpts.order) {
        const orderClause = buildOrderBy(table, queryOpts.order);
        if (orderClause) query = query.orderBy(...orderClause);
      }

      const row = await query.get();
      if (!row) return null;

      const instance = new ModelInstance(ModelClass, row);
      if (queryOpts.include && Array.isArray(queryOpts.include)) {
        await ModelClass._populateIncludes([instance], queryOpts.include);
      }
      return instance;
    }

    static async findAll(queryOpts = {}) {
      const db = getDb();
      let query = db.select().from(table);

      if (queryOpts.where) {
        const whereClause = buildWhereClause(table, queryOpts.where);
        if (whereClause) query = query.where(whereClause);
      }

      if (queryOpts.order) {
        const orderClause = buildOrderBy(table, queryOpts.order);
        if (orderClause) query = query.orderBy(...orderClause);
      }

      if (queryOpts.limit) {
        query = query.limit(queryOpts.limit);
      }

      if (queryOpts.offset) {
        query = query.offset(queryOpts.offset);
      }

      const rows = await query.all();
      const instances = rows.map((r) => new ModelInstance(ModelClass, r));

      if (queryOpts.include && Array.isArray(queryOpts.include) && instances.length > 0) {
        await ModelClass._populateIncludes(instances, queryOpts.include);
      }

      return instances;
    }

    static async findOrCreate({ where, defaults = {} }) {
      const existing = await ModelClass.findOne({ where });
      if (existing) {
        return [existing, false];
      }

      const createData = { ...defaults, ...where };
      const created = await ModelClass.create(createData);
      return [created, true];
    }

    static async create(data) {
      const db = getDb();
      const values = { ...data };

      // Convert any Date objects to ISO string
      for (const [k, v] of Object.entries(values)) {
        if (v instanceof Date) {
          values[k] = v.toISOString();
        }
      }

      // Ensure string Snowflake IDs
      if (primaryKey in values && typeof values[primaryKey] === "number") {
        values[primaryKey] = String(values[primaryKey]);
      }

      if ("created_at" in table && !values.created_at) {
        values.created_at = new Date().toISOString();
      }
      if ("updated_at" in table && !values.updated_at) {
        values.updated_at = new Date().toISOString();
      }

      const inserted = await db.insert(table).values(values).returning().get();
      return new ModelInstance(ModelClass, inserted || values);
    }

    static async bulkCreate(records) {
      if (!Array.isArray(records) || records.length === 0) return [];
      const db = getDb();
      const formatted = records.map((r) => {
        const row = { ...r };
        for (const [k, v] of Object.entries(row)) {
          if (v instanceof Date) {
            row[k] = v.toISOString();
          }
        }
        if ("created_at" in table && !row.created_at) row.created_at = new Date().toISOString();
        if ("updated_at" in table && !row.updated_at) row.updated_at = new Date().toISOString();
        return row;
      });

      const inserted = await db.insert(table).values(formatted).returning().all();
      return (inserted || formatted).map((r) => new ModelInstance(ModelClass, r));
    }

    static async update(values, { where }) {
      const db = getDb();
      const whereClause = buildWhereClause(table, where);
      const updateValues = { ...values };

      for (const [k, v] of Object.entries(updateValues)) {
        if (v instanceof Date) {
          updateValues[k] = v.toISOString();
        }
      }

      if ("updated_at" in table && !updateValues.updated_at) {
        updateValues.updated_at = new Date().toISOString();
      }

      let query = db.update(table).set(updateValues);
      if (whereClause) {
        query = query.where(whereClause);
      }

      const res = await query.run();
      const changes = res?.changes ?? (Array.isArray(res) ? res.length : 1);
      return [changes];
    }

    static async destroy({ where }) {
      const db = getDb();
      const whereClause = buildWhereClause(table, where);
      let query = db.delete(table);
      if (whereClause) {
        query = query.where(whereClause);
      }
      const res = await query.run();
      return res?.changes ?? (Array.isArray(res) ? res.length : 1);
    }

    static async upsert(data) {
      const pkVal = data[primaryKey];
      if (pkVal === undefined || pkVal === null) {
        return [await ModelClass.create(data), true];
      }

      const existing = await ModelClass.findByPk(pkVal);
      if (existing) {
        for (const [k, v] of Object.entries(data)) {
          existing[k] = v;
        }
        await existing.save();
        return [existing, false];
      }

      const created = await ModelClass.create(data);
      return [created, true];
    }

    static async count({ where } = {}) {
      const db = getDb();
      let query = db.select({ count: sql`count(*)` }).from(table);
      if (where) {
        const whereClause = buildWhereClause(table, where);
        if (whereClause) query = query.where(whereClause);
      }
      const res = await query.get();
      return Number(res?.count || 0);
    }

    static async _populateIncludes(instances, includes) {
      for (const inc of includes) {
        const targetModel = inc.model;
        const as = inc.as || targetModel.modelName;
        const assoc = this.associations.get(as) || {
          foreignKey: primaryKey,
        };

        const fKey = assoc.foreignKey || primaryKey;
        const ids = instances.map((inst) => inst[primaryKey]).filter(Boolean);

        if (ids.length === 0) continue;

        const children = await targetModel.findAll({
          where: {
            [fKey]: ids.length === 1 ? ids[0] : { [Op.in]: ids },
          },
        });

        const childMap = new Map();
        for (const child of children) {
          const parentId = String(child[fKey]);
          if (!childMap.has(parentId)) childMap.set(parentId, []);
          childMap.get(parentId).push(child);
        }

        for (const inst of instances) {
          const parentId = String(inst[primaryKey]);
          inst[as] = childMap.get(parentId) || [];
        }
      }
    }
  }

  return ModelClass;
}
