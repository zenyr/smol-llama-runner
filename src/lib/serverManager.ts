import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { resolve } from "node:path";
import { dirs } from "./dirnames";
import { readdir } from "node:fs/promises";
import { existsSync, statSync } from "fs";
import { ulid } from "ulid";
import sqlite3 from "sqlite3";

type ServerInfo = {
  process?: ChildProcessWithoutNullStreams;
  port: number;
  ttl?: NodeJS.Timeout;
  deadline: number;
};
type SerializedInfo = Omit<ServerInfo, "process"> & { modelPath: string };

const DEFAULT_CTX_SIZE = 2048;
const STARTING_PORT = 4000;
const TTL = 1 * 60 * 1000; // 1 minute
const SERVER_EXECUTABLE = resolve(dirs.repo, "./server");
const MODEL_DIR = dirs.models;

const executeQuery = (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dirs.sql);

    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });

    db.close();
  });
};

const sessionId = ulid();

let initialized = false;
// initialize table
const initTable = async () => {
  try {
    await executeQuery(
      "CREATE TABLE IF NOT EXISTS servers (modelPath TEXT PRIMARY KEY, port INTEGER, deadline INTEGER)"
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(e);
    }
  }
  console.log('ServerManager initialized with session id "' + sessionId + '"');
};
if (!initialized) initTable();

class ServerManager {
  private processes: Map<string, ServerInfo>;
  private usedPorts: Set<number>;

  constructor() {
    this.processes = new Map<string, ServerInfo>();
    this.usedPorts = new Set<number>();
  }

  private async loadFromDb(): Promise<void> {
    try {
      const rows = await executeQuery(
        "SELECT modelPath, port, deadline FROM servers"
      );
      const modelPaths = new Set<string>();
      for (const { modelPath, ...row } of rows) {
        const old = this.processes.get(modelPath);
        this.processes.set(modelPath, { ...old, ...row });
        modelPaths.add(modelPath);
      }
      this.processes.forEach((_, modelPath) => {
        if (!modelPaths.has(modelPath)) {
          this.processes.delete(modelPath);
        }
      });
    } catch (e) {
      if (e instanceof Error) {
        console.error(e);
      }
    }
  }

  private async saveToDb(): Promise<void> {
    try {
      await executeQuery("DELETE FROM servers");

      const serializedProcesses: SerializedInfo[] = [];
      this.processes.forEach(({ port, deadline }, modelPath) =>
        serializedProcesses.push({ modelPath, port, deadline })
      );

      for (const { modelPath, port, deadline } of serializedProcesses) {
        await executeQuery(
          "INSERT INTO servers (modelPath, port, deadline) VALUES (?, ?, ?)",
          [modelPath, port, deadline]
        );
      }
    } catch (e) {
      if (e instanceof Error) {
        console.error(e);
      }
    }
  }

  public async startServer(
    modelPath: string,
    ctxSize: number = DEFAULT_CTX_SIZE
  ): Promise<number> {
    await this.loadFromDb();

    const existingServer = this.processes.get(modelPath);
    if (existingServer) {
      this.resetTTL(modelPath);
      return existingServer.port;
    }
    const modelFilePath = resolve(MODEL_DIR, modelPath);
    if (!existsSync(modelFilePath))
      throw new Error("Model not found: '" + modelFilePath + "'");

    const port = this.findAvailablePort(STARTING_PORT);
    console.log("Starting...", {
      SERVER_EXECUTABLE,
      modelFilePath,
      port,
    });
    try {
      const process = spawn(SERVER_EXECUTABLE, [
        "-m",
        modelFilePath,
        "--ctx_size",
        ctxSize.toString(),
        "--port",
        port.toString(),
      ]);
      const deadline = Date.now() + TTL;
      const ttl = setTimeout(
        () => this.stopServer(modelPath),
        deadline - Date.now()
      );

      this.processes.set(modelPath, { process, port, ttl, deadline });
      this.usedPorts.add(port);
      console.log(`Server started on port ${port}`);
      return port;
    } catch (e) {
      if (e instanceof Error) {
        console.error(e);
      }
      return 0;
    } finally {
      await this.saveToDb();
    }
  }

  public stopAll(): void {
    this.processes.forEach(({ process }) => process?.kill());
    this.processes.clear();
    this.usedPorts.clear();
    this.saveToDb();
    console.log(`All servers stopped`);
  }

  public stopServer(modelPath: string): void {
    const server = this.processes.get(modelPath);
    if (server && server.process) {
      clearTimeout(server.ttl);
      server.process?.kill();
      this.processes.delete(modelPath);
      this.usedPorts.delete(server.port);
      console.log(`Server for model ${modelPath} stopped`);
    }
  }

  public resetTTL(modelPath: string): void {
    const server = this.processes.get(modelPath);
    if (server && server.process) {
      clearTimeout(server.ttl);
      server.deadline = Date.now() + TTL;
      server.ttl = setTimeout(
        () => this.stopServer(modelPath),
        server.deadline - Date.now()
      );
      console.log(`TTL reset for server of model ${modelPath}`);
    }
  }

  public async getAvailableModels(): Promise<
    { filename: string; size: number }[]
  > {
    const files = await readdir(MODEL_DIR);
    return files
      .filter((f) => {
        const filename = f.toLowerCase();
        return filename.includes("ggml") && filename.endsWith(".bin");
      })
      .map((f) => ({
        filename: f,
        size: statSync(resolve(MODEL_DIR, f)).size,
      }));
  }

  public async getPortByModelPath(
    modelPath: string
  ): Promise<number | undefined> {
    await this.loadFromDb();

    if (process.env.NODE_ENV !== "production") {
      if (modelPath === "WizardLM-7B-uncensored.ggmlv3.q4_0.bin") {
        return 8080;
      }
    }

    const server = this.processes.get(modelPath);
    return server ? server.port : undefined;
  }

  public async getActiveProcesses(): Promise<SerializedInfo[]> {
    await this.loadFromDb();

    const activeProcesses: SerializedInfo[] = [];
    this.processes.forEach(({ port, deadline }, modelPath) =>
      activeProcesses.push({ modelPath, port, deadline })
    );
    return activeProcesses;
  }

  private findAvailablePort(startingPort: number): number {
    let port = startingPort;
    while (this.usedPorts.has(port)) {
      port++;
    }
    return port;
  }
}

process.on("beforeExit", () => serverManager.stopAll());

export const serverManager = new ServerManager();
