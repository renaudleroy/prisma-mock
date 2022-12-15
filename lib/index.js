"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const runtime_1 = require("@prisma/client/runtime");
const jest_mock_extended_1 = require("jest-mock-extended");
const createPrismaMock = (data = {}, datamodel, client = (0, jest_mock_extended_1.mockDeep)()) => {
    if (!datamodel || typeof datamodel === "string") {
        datamodel = client_1.Prisma.dmmf.datamodel;
    }
    let autoincrement = {};
    const getCamelCase = (name) => {
        return name.substr(0, 1).toLowerCase() + name.substr(1);
    };
    const shallowCompare = (a, b) => {
        for (let key in b) {
            if (a[key] !== b[key])
                return false;
        }
        return true;
    };
    const removeMultiFieldIds = (model, data) => {
        var _a, _b;
        const c = getCamelCase(model.name);
        const idFields = model.idFields || ((_a = model.primaryKey) === null || _a === void 0 ? void 0 : _a.fields);
        const removeId = (ids) => {
            const id = ids.join('_');
            data = Object.assign(Object.assign({}, data), { [c]: data[c].map(item => {
                    const _a = item, _b = id, idVal = _a[_b], rest = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
                    return Object.assign(Object.assign({}, rest), idVal);
                }) });
        };
        if ((idFields === null || idFields === void 0 ? void 0 : idFields.length) > 1) {
            removeId(idFields);
        }
        if (((_b = model.uniqueFields) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            for (const uniqueField of model.uniqueFields) {
                removeId(uniqueField);
            }
        }
        return data;
    };
    const getFieldRelationshipWhere = (item, field) => {
        if (field.relationToFields.length === 0) {
            field = getJoinField(field);
            return {
                [field.relationFromFields[0]]: item[field.relationToFields[0]],
            };
        }
        return ({
            [field.relationToFields[0]]: item[field.relationFromFields[0]],
        });
    };
    const getJoinField = (field) => {
        const joinmodel = datamodel.models.find(model => {
            return model.name === field.type;
        });
        const joinfield = joinmodel === null || joinmodel === void 0 ? void 0 : joinmodel.fields.find(f => {
            return f.relationName === field.relationName;
        });
        return joinfield;
    };
    // @ts-ignore
    client["$transaction"].mockImplementation(async (actions) => {
        for (const action of actions) {
            await action;
        }
    });
    const Delegate = (prop, model) => {
        const sortFunc = (orderBy) => (a, b) => {
            const keys = Object.keys(orderBy);
            const incl = includes({ include: keys.reduce((acc, key) => (Object.assign(Object.assign({}, acc), { [key]: true })), {}) });
            for (const key of keys) {
                const dir = orderBy[key];
                if (typeof dir === "object") {
                    return sortFunc(dir)(incl(a)[key], incl(b)[key]);
                }
                if (a[key] > b[key]) {
                    return dir === "asc" ? 1 : -1;
                }
                else if (a[key] < b[key]) {
                    return dir === "asc" ? -1 : 1;
                }
            }
            return 0;
        };
        const nestedUpdate = (args, isCreating, item) => {
            let d = args.data;
            // Get field schema for default values
            const model = datamodel.models.find(model => {
                return getCamelCase(model.name) === prop;
            });
            model.fields.forEach(field => {
                if (d[field.name]) {
                    const c = d[field.name];
                    if (field.kind === 'object') {
                        if (c.connect) {
                            const _a = d, _b = field.name, { connect } = _a[_b], rest = __rest(_a, [typeof _b === "symbol" ? _b : _b + ""]);
                            let connectionValue = connect[field.relationToFields[0]];
                            const keyToMatch = Object.keys(connect)[0];
                            const keyToGet = field.relationToFields[0];
                            if (keyToMatch !== keyToGet) {
                                const valueToMatch = connect[keyToMatch];
                                const matchingRow = data[getCamelCase(field.type)].find(row => {
                                    return row[keyToMatch] === valueToMatch;
                                });
                                if (!matchingRow) {
                                    // PrismaClientKnownRequestError prototype changed in version 4.7.0
                                    // from: constructor(message: string, code: string, clientVersion: string, meta?: any)
                                    // to: constructor(message: string, { code, clientVersion, meta, batchRequestIdx }: KnownErrorParams)
                                    if (runtime_1.PrismaClientKnownRequestError.length === 2) {
                                        throw new runtime_1.PrismaClientKnownRequestError('An operation failed because it depends on one or more records that were required but not found. {cause}', { code: 'P2025', clientVersion: '1.2.3' });
                                    }
                                    // @ts-ignore
                                    throw new runtime_1.PrismaClientKnownRequestError('An operation failed because it depends on one or more records that were required but not found. {cause}', 'P2025', '1.2.3');
                                }
                                connectionValue = matchingRow[keyToGet];
                            }
                            d = Object.assign(Object.assign({}, rest), { [field.relationFromFields[0]]: connectionValue });
                        }
                        if (c.create || c.createMany) {
                            const _c = d, _d = field.name, create = _c[_d], rest = __rest(_c, [typeof _d === "symbol" ? _d : _d + ""]);
                            d = rest;
                            // @ts-ignore
                            const name = getCamelCase(field.type);
                            const delegate = Delegate(name, model);
                            const joinfield = getJoinField(field);
                            if (field.relationFromFields.length > 0) {
                                const item = delegate.create({
                                    data: create.create
                                });
                                d = Object.assign(Object.assign({}, rest), { [field.relationFromFields[0]]: item[field.relationToFields[0]] });
                            }
                            else {
                                const map = (val) => (Object.assign(Object.assign({}, val), { [joinfield.name]: {
                                        connect: joinfield.relationToFields.reduce((prev, cur, index) => {
                                            let val = d[cur];
                                            if (!isCreating && !val) {
                                                val = findOne(args)[cur];
                                            }
                                            return Object.assign(Object.assign({}, prev), { [cur]: val });
                                        }, {}),
                                    } }));
                                if (c.createMany) {
                                    delegate.createMany(Object.assign(Object.assign({}, c.createMany), { data: c.createMany.data.map(map) }));
                                }
                                else {
                                    if (Array.isArray(c.create)) {
                                        delegate.createMany(Object.assign(Object.assign({}, c.create), { data: c.create.map(map) }));
                                    }
                                    else {
                                        delegate.create(Object.assign(Object.assign({}, create.create), { data: map(create.create) }));
                                    }
                                }
                            }
                        }
                        const name = getCamelCase(field.type);
                        const delegate = Delegate(name, model);
                        if (c.updateMany) {
                            if (Array.isArray(c.updateMany)) {
                                c.updateMany.forEach(updateMany => {
                                    delegate.updateMany(updateMany);
                                });
                            }
                            else {
                                delegate.updateMany(c.updateMany);
                            }
                        }
                        if (c.update) {
                            if (Array.isArray(c.update)) {
                                c.update.forEach(update => {
                                    delegate.update(update);
                                });
                            }
                            else {
                                const item = findOne(args);
                                delegate.update({ data: c.update, where: getFieldRelationshipWhere(item, field) });
                            }
                        }
                        if (c.deleteMany) {
                            if (Array.isArray(c.deleteMany)) {
                                c.deleteMany.forEach(where => {
                                    delegate.deleteMany({ where });
                                });
                            }
                            else {
                                delegate.deleteMany({ where: c.deleteMany });
                            }
                        }
                        if (c.delete) {
                            if (Array.isArray(c.delete)) {
                                c.delete.forEach(where => {
                                    delegate.delete({ where });
                                });
                            }
                            else {
                                delegate.delete({ where: c.delete });
                            }
                        }
                        if (c.disconnect) {
                            if (field.relationFromFields.length > 0) {
                                d = Object.assign(Object.assign({}, d), { [field.relationFromFields[0]]: null });
                            }
                            else {
                                const joinfield = getJoinField(field);
                                delegate.update({
                                    data: {
                                        [joinfield.relationFromFields[0]]: null
                                    },
                                    where: {
                                        [joinfield.relationFromFields[0]]: item[joinfield.relationToFields[0]]
                                    }
                                });
                            }
                        }
                        const _e = d, _f = field.name, _update = _e[_f], rest = __rest(_e, [typeof _f === "symbol" ? _f : _f + ""]);
                        d = rest;
                    }
                    if (c.increment) {
                        d = Object.assign(Object.assign({}, d), { [field.name]: item[field.name] + c.increment });
                    }
                    if (c.decrement) {
                        d = Object.assign(Object.assign({}, d), { [field.name]: item[field.name] - c.decrement });
                    }
                    if (c.multiply) {
                        d = Object.assign(Object.assign({}, d), { [field.name]: item[field.name] * c.multiply });
                    }
                    if (c.divide) {
                        d = Object.assign(Object.assign({}, d), { [field.name]: item[field.name] / c.divide });
                    }
                    if (c.set) {
                        d = Object.assign(Object.assign({}, d), { [field.name]: c.set });
                    }
                }
                if ((isCreating || d[field.name] === null) &&
                    (d[field.name] === null || d[field.name] === undefined)) {
                    if (field.hasDefaultValue) {
                        if (typeof field.default === 'object' && !Array.isArray(field.default)) {
                            if (field.default.name === 'autoincrement') {
                                const key = `${prop}_${field.name}`;
                                let m = autoincrement === null || autoincrement === void 0 ? void 0 : autoincrement[key];
                                if (m === undefined) {
                                    m = 0;
                                    data[prop].forEach(item => {
                                        m = Math.max(m, item[field.name]);
                                    });
                                }
                                m += 1;
                                d = Object.assign(Object.assign({}, d), { [field.name]: m });
                                autoincrement = Object.assign(Object.assign({}, autoincrement), { [key]: m });
                            }
                        }
                        else {
                            d = Object.assign(Object.assign({}, d), { [field.name]: field.default });
                        }
                    }
                    else {
                        if (field.kind !== "object") {
                            d = Object.assign(Object.assign({}, d), { [field.name]: null });
                        }
                    }
                }
                // return field.name === key
            });
            return d;
        };
        const matchItem = (child, item, where) => {
            var _a, _b;
            const val = item[child];
            const filter = where[child];
            if (child === "OR") {
                return matchOr(item, filter);
            }
            if (child === "AND") {
                return matchAnd(item, filter);
            }
            if (child === "NOT") {
                return !matchOr(item, filter);
            }
            if (filter == null || filter === undefined) {
                if (filter === null) {
                    return val === null || val === undefined;
                }
                return true;
            }
            if (filter instanceof Date) {
                if (val === undefined) {
                    return false;
                }
                if (!(val instanceof Date) || val.getTime() !== filter.getTime()) {
                    return false;
                }
            }
            else {
                if (typeof filter === 'object') {
                    const info = model.fields.find(field => field.name === child);
                    if (info === null || info === void 0 ? void 0 : info.relationName) {
                        const childName = getCamelCase(info.type);
                        let childWhere = {};
                        if (filter.every) {
                            childWhere = filter.every;
                        }
                        else if (filter.some) {
                            childWhere = filter.some;
                        }
                        else if (filter.none) {
                            childWhere = filter.none;
                        }
                        else {
                            childWhere = filter;
                        }
                        const res = data[childName].filter(matchFnc(Object.assign(Object.assign({}, childWhere), getFieldRelationshipWhere(item, info))));
                        if (filter.every) {
                            if (res.length === 0)
                                return false;
                            const all = data[childName].filter(matchFnc(getFieldRelationshipWhere(item, info)));
                            return res.length === all.length;
                        }
                        else if (filter.some) {
                            return res.length > 0;
                        }
                        else if (filter.none) {
                            return res.length === 0;
                        }
                        return res.length > 0;
                    }
                    const idFields = model.idFields || ((_a = model.primaryKey) === null || _a === void 0 ? void 0 : _a.fields);
                    if ((idFields === null || idFields === void 0 ? void 0 : idFields.length) > 1) {
                        if (child === idFields.join('_')) {
                            return shallowCompare(item, filter);
                        }
                    }
                    if (((_b = model.uniqueFields) === null || _b === void 0 ? void 0 : _b.length) > 0) {
                        for (const uniqueField of model.uniqueFields) {
                            if (child === uniqueField.join('_')) {
                                return shallowCompare(item, filter);
                            }
                        }
                    }
                    if (val === undefined) {
                        return false;
                    }
                    let match = true;
                    if ('equals' in filter && match) {
                        match = filter.equals === val;
                    }
                    if ('startsWith' in filter && match) {
                        match = val.indexOf(filter.startsWith) === 0;
                    }
                    if ('endsWith' in filter && match) {
                        match =
                            val.indexOf(filter.endsWith) ===
                                val.length - filter.endsWith.length;
                    }
                    if ('contains' in filter && match) {
                        match = val.indexOf(filter.contains) > -1;
                    }
                    if ('gt' in filter && match) {
                        match = val > filter.gt;
                    }
                    if ('gte' in filter && match) {
                        match = val >= filter.gte;
                    }
                    if ('lt' in filter && match) {
                        match = val < filter.lt;
                    }
                    if ('lte' in filter && match) {
                        match = val <= filter.lte;
                    }
                    if ('in' in filter && match) {
                        match = filter.in.includes(val);
                    }
                    if ('not' in filter && match) {
                        match = val !== filter.not;
                    }
                    if ('notIn' in filter && match) {
                        match = !filter.notIn.includes(val);
                    }
                    if (!match)
                        return false;
                }
                else if (val !== filter) {
                    return false;
                }
            }
            return true;
        };
        const matchItems = (item, where) => {
            for (let child in where) {
                if (!matchItem(child, item, where)) {
                    return false;
                }
            }
            return true;
        };
        const matchAnd = (item, where) => {
            return where.filter((child) => matchItems(item, child)).length > 0;
        };
        const matchOr = (item, where) => {
            return where.some((child) => matchItems(item, child));
        };
        const matchFnc = where => item => {
            if (where) {
                return matchItems(item, where);
            }
            return true;
        };
        const findOne = args => {
            if (!data[prop])
                return null;
            const items = findMany(args);
            if (items.length === 0) {
                return null;
            }
            return items[0];
        };
        const findMany = args => {
            let res = data[prop].filter(matchFnc(args === null || args === void 0 ? void 0 : args.where)).map(includes(args));
            if (args === null || args === void 0 ? void 0 : args.distinct) {
                let values = {};
                res = res.filter(item => {
                    let shouldInclude = true;
                    args.distinct.forEach(key => {
                        const vals = values[key] || [];
                        if (vals.includes(item[key])) {
                            shouldInclude = false;
                        }
                        else {
                            vals.push(item[key]);
                            values[key] = vals;
                        }
                    });
                    return shouldInclude;
                });
            }
            if (args === null || args === void 0 ? void 0 : args.orderBy) {
                res.sort(sortFunc(args === null || args === void 0 ? void 0 : args.orderBy));
            }
            if (args === null || args === void 0 ? void 0 : args.select) {
                res = res.map(item => {
                    const newItem = {};
                    Object.keys(args.select).forEach(key => (newItem[key] = item[key]));
                    return newItem;
                });
            }
            if ((args === null || args === void 0 ? void 0 : args.skip) !== undefined || (args === null || args === void 0 ? void 0 : args.take) !== undefined) {
                const start = (args === null || args === void 0 ? void 0 : args.skip) !== undefined ? args === null || args === void 0 ? void 0 : args.skip : 0;
                const end = (args === null || args === void 0 ? void 0 : args.take) !== undefined ? start + args.take : undefined;
                res = res.slice(start, end);
            }
            return res;
        };
        const updateMany = args => {
            // if (!Array.isArray(data[prop])) {
            //   throw new Error(`${prop} not found in data`)
            // }
            const newItems = data[prop].map(e => {
                if (matchFnc(args.where)(e)) {
                    let data = nestedUpdate(args, false, e);
                    return Object.assign(Object.assign({}, e), data);
                }
                return e;
            });
            data = Object.assign(Object.assign({}, data), { [prop]: newItems });
            data = removeMultiFieldIds(model, data);
            return data;
        };
        const create = args => {
            const d = nestedUpdate(args, true, null);
            data = Object.assign(Object.assign({}, data), { [prop]: [...data[prop], d] });
            data = removeMultiFieldIds(model, data);
            let where = {};
            for (const field of model.fields) {
                if (field.default) {
                    where[field.name] = d[field.name];
                }
            }
            return findOne(Object.assign({ where }, args));
        };
        const deleteMany = args => {
            const model = datamodel.models.find(model => {
                return getCamelCase(model.name) === prop;
            });
            const deleted = [];
            data = Object.assign(Object.assign({}, data), { [prop]: data[prop].filter(e => {
                    const shouldDelete = matchFnc(args === null || args === void 0 ? void 0 : args.where)(e);
                    if (shouldDelete) {
                        deleted.push(e);
                    }
                    return !shouldDelete;
                }) });
            // Referential Actions
            deleted.forEach(item => {
                model.fields.forEach(field => {
                    const joinfield = getJoinField(field);
                    if (!joinfield)
                        return;
                    const delegate = Delegate(getCamelCase(field.type), model);
                    if (joinfield.relationOnDelete === "SetNull") {
                        delegate.update({
                            where: {
                                [joinfield.relationFromFields[0]]: item[joinfield.relationToFields[0]],
                            },
                            data: {
                                [joinfield.relationFromFields[0]]: null,
                            }
                        });
                    }
                    else if (joinfield.relationOnDelete === "Cascade") {
                        delegate.delete({
                            where: {
                                [joinfield.relationFromFields[0]]: item[joinfield.relationToFields[0]],
                            }
                        });
                    }
                });
            });
            return deleted;
        };
        const includes = args => item => {
            if ((!(args === null || args === void 0 ? void 0 : args.include) && !(args === null || args === void 0 ? void 0 : args.select)) || !item)
                return item;
            let newItem = item;
            const obj = (args === null || args === void 0 ? void 0 : args.select) || (args === null || args === void 0 ? void 0 : args.include);
            const keys = Object.keys(obj);
            keys.forEach(key => {
                // Get field schema for relation info
                const model = datamodel.models.find(model => {
                    return getCamelCase(model.name) === prop;
                });
                const schema = model.fields.find(field => {
                    return field.name === key;
                });
                if (!(schema === null || schema === void 0 ? void 0 : schema.relationName)) {
                    return;
                }
                // Get delegate for relation
                const delegate = Delegate(getCamelCase(schema.type), model);
                // Construct arg for relation query
                let subArgs = obj[key] === true ? {} : obj[key];
                subArgs = Object.assign(Object.assign({}, subArgs), { where: Object.assign(Object.assign({}, subArgs.where), getFieldRelationshipWhere(item, schema)) });
                if (schema.isList) {
                    // Add relation
                    newItem = Object.assign(Object.assign({}, newItem), { [key]: delegate.findMany(subArgs) });
                }
                else {
                    newItem = Object.assign(Object.assign({}, newItem), { [key]: delegate.findUnique(subArgs) });
                }
            });
            return newItem;
        };
        const update = (args) => {
            let updatedItem;
            const newItems = data[prop].map(e => {
                if (matchFnc(args.where)(e)) {
                    let data = nestedUpdate(args, false, e);
                    updatedItem = Object.assign(Object.assign({}, e), data);
                    return updatedItem;
                }
                return e;
            });
            data = Object.assign(Object.assign({}, data), { [prop]: newItems });
            data = removeMultiFieldIds(model, data);
            return findOne(Object.assign(Object.assign({}, args), { where: updatedItem }));
        };
        return {
            findOne,
            findUnique: findOne,
            findMany,
            findFirst: findOne,
            create,
            createMany: (args) => {
                args.data.forEach((data) => {
                    create(Object.assign(Object.assign({}, args), { data }));
                });
                return findMany(args);
            },
            delete: deleteMany,
            update,
            deleteMany,
            updateMany: (args) => {
                updateMany(args);
                return findMany(args);
            },
            upsert(args) {
                const res = findOne(args);
                if (res) {
                    return update(Object.assign(Object.assign({}, args), { data: args.update }));
                }
                else {
                    create(Object.assign(Object.assign({}, args), { data: Object.assign(Object.assign({}, args.where), args.create) }));
                    return findOne(args);
                }
            },
            count(args) {
                const res = findMany(args);
                return res.length;
            },
        };
    };
    datamodel.models.forEach(model => {
        if (!model)
            return;
        const c = getCamelCase(model.name);
        if (!data[c]) {
            data = Object.assign(Object.assign({}, (data || {})), { [c]: [] });
        }
        data = removeMultiFieldIds(model, data);
        const objs = Delegate(c, model);
        Object.keys(objs).forEach(fncName => {
            client[c][fncName].mockImplementation(async (...params) => {
                return objs[fncName](...params);
            });
        });
    });
    return client;
};
exports.default = createPrismaMock;
