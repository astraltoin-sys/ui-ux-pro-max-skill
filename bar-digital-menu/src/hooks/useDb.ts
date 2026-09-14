import { useSyncExternalStore } from "react";
import { db } from "../lib/database";

export function useDb() {
  useSyncExternalStore(db.subscribe, () => db.version, () => db.version);
  return db;
}
