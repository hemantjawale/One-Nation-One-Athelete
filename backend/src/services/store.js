import mongoose from "mongoose";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
export async function createStore(directory, uri) {
  let collection,
    data = [],
    queue = Promise.resolve();
  const file = path.join(directory, "database.json");
  await mkdir(directory, { recursive: true });
  if (uri) {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    collection = mongoose.connection.collection("records");
    await collection.createIndex({ kind: 1, id: 1 }, { unique: true });
  } else {
    try {
      data = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  }
  const persist = () => {
    const snapshot = JSON.stringify(data, null, 2);
    queue = queue
      .catch(() => {})
      .then(async () => {
        const temp = file + "." + randomUUID() + ".tmp";
        await writeFile(temp, snapshot);
        for (let i = 0; ; i++) {
          try {
            await rename(temp, file);
            break;
          } catch (e) {
            if (i >= 12 || !["EPERM", "EACCES", "EBUSY"].includes(e.code))
              throw e;
            await new Promise((r) => setTimeout(r, 50 * (i + 1)));
          }
        }
      });
    return queue;
  };
  return {
    mode: uri ? "MongoDB Atlas" : "Local persistent development",
    async list(kind, query = {}) {
      return collection
        ? collection
            .find({ kind, ...query }, { projection: { _id: 0 } })
            .toArray()
        : structuredClone(
            data.filter(
              (r) =>
                r.kind === kind &&
                Object.entries(query).every(([k, v]) => r[k] === v),
            ),
          );
    },
    async get(kind, id) {
      return (await this.list(kind, { id }))[0];
    },
    async put(kind, record) {
      const row = {
        ...record,
        kind,
        id: record.id || randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      if (collection)
        await collection.replaceOne({ kind, id: row.id }, row, {
          upsert: true,
        });
      else {
        data = data.filter((r) => !(r.kind === kind && r.id === row.id));
        data.push(row);
        await persist();
      }
      return structuredClone(row);
    },
    async insert(kind, record) {
      const row = {
        ...record,
        kind,
        id: record.id || randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      if (collection) {
        await collection.insertOne(row);
        delete row._id;
        return row;
      }
      if (data.some((r) => r.kind === kind && r.id === row.id)) {
        const e = new Error("Already exists");
        e.code = 11000;
        throw e;
      }
      return this.put(kind, row);
    },
    async remove(kind, id) {
      if (collection) await collection.deleteOne({ kind, id });
      else {
        data = data.filter((r) => !(r.kind === kind && r.id === id));
        await persist();
      }
    },
  };
}
