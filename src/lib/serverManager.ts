import { ServerManager2 } from "./serverManager2";

const isServer = typeof window === "undefined";
export const serverManager = isServer ? new ServerManager2() : void 0;
