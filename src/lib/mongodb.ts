import { MongoClient, type Db } from "mongodb";
import { getEnv } from "@/lib/env";

type MongoCache = {
  client?: MongoClient;
  promise?: Promise<MongoClient>;
};

const globalForMongo = globalThis as typeof globalThis & {
  _mongoCache?: MongoCache;
};

const cache = globalForMongo._mongoCache ?? {};

if (!globalForMongo._mongoCache) {
  globalForMongo._mongoCache = cache;
}

export async function getMongoClient() {
  if (cache.client) {
    return cache.client;
  }

  if (!cache.promise) {
    cache.promise = new MongoClient(getEnv("MONGODB_URI")).connect();
  }

  cache.client = await cache.promise;
  return cache.client;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getEnv("MONGODB_DB"));
}
