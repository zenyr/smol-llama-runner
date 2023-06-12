import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { statSync } from "fs";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import sqlite3 from "sqlite3";
import { dirs } from "./dirnames";
import { stat } from "fs/promises";
import { ulid } from "ulid";

const TTL = 60 * 1000; // 1 minute
const MODEL_DIR = dirs.models;
const STARTING_PORT = 4000;
const SERVER_EXECUTABLE = resolve(dirs.repo, "./server");

type ProcessInfo = {
  process?: ChildProcessWithoutNullStreams;
  port: number;
  lastT: number;
};

const id = ulid();

export class ServerManager2 {
  private processes: Record<string, ProcessInfo> = {};
  private _dead = false;
  constructor() {
    process.on("beforeExit", () => this.stopAll());
    process.on("SIGINT", () => this.stopAll());
    console.log("initialized", { id });
    (async () => {
      await this.primeTable();
      await this.loadFromDb();
      while (!this._dead) {
        await this.collectGarbage();
        await setTimeout(10000);
      }
    })();
  }
  private async primeTable() {
    try {
      await this.query(
        "CREATE TABLE IF NOT EXISTS processes (modelPath TEXT PRIMARY KEY, port INTEGER, lastT INTEGER)"
      );
    } catch (e) {
      if (e instanceof Error) {
        console.error("Query error:", e.message);
      }
    }
  }

  private async query(query: string, params: any[] = []): Promise<any[]> {
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
  }

  private async loadFromDb() {
    const rows = await this.query("SELECT * FROM processes");
    for (const { modelPath, port, lastT } of rows) {
      this.processes[modelPath] = {
        port,
        lastT,
      };
    }
  }

  private async saveToDb() {
    const rows = Object.entries(this.processes).map(
      ([modelPath, { port, lastT }]) => ({ modelPath, port, lastT })
    );
    try {
      await this.query("DELETE FROM processes");
      for (const { modelPath, port, lastT } of rows) {
        await this.query(
          "INSERT INTO processes (modelPath, port, lastT) VALUES (?, ?, ?)",
          [modelPath, port, lastT]
        );
      }
    } catch (e) {
      console.error("saveToDb Error:", e);
    }
  }

  private cleanseModelPath(modelPath: string) {
    return modelPath.replace(/[/\\]/g, "");
  }

  public async getModelPaths() {
    await this.loadFromDb();
    const files = await readdir(MODEL_DIR);
    return await Promise.all(
      files
        .filter((f) => {
          const filename = f.toLowerCase();
          return filename.includes("ggml") && filename.endsWith(".bin");
        })
        .map(async (f) => ({
          filename: f,
          size: (await stat(resolve(MODEL_DIR, f))).size,
          port: await this.getPortByModelPath(f, true),
        }))
    );
  }

  public async getPortByModelPath(modelPath: string, skipDb = false) {
    if (!skipDb) await this.loadFromDb();
    if (process.env.NODE_ENV !== "production") {
      if (modelPath === "WizardLM-7B-uncensored.ggmlv3.q4_0.bin") {
        return 8080;
      }
    }
    return this.processes[modelPath]?.port;
  }

  public async updateT(modelPath: string) {
    await this.loadFromDb();
    const process = this.processes[modelPath];
    if (process) {
      process.lastT = Date.now();
      await this.saveToDb();
    }
  }

  public async startProcess(
    _modelPath: string,
    ctxSize = 2048
  ): Promise<number> {
    const modelPath = this.cleanseModelPath(_modelPath);
    console.log("startProcess", { modelPath, id });
    const oldPort = await this.getPortByModelPath(modelPath);
    if (oldPort) {
      await this.updateT(modelPath);
      return oldPort;
    }
    const port = this.findAvailablePort();
    const modelFilePath = resolve(MODEL_DIR, modelPath);
    try {
      const proc = spawn(SERVER_EXECUTABLE, [
        "-m",
        modelFilePath,
        "--ctx_size",
        ctxSize.toString(),
        "--port",
        port.toString(),
      ]);
      proc.on("exit", () => this.stopProcess(modelPath));
      const lastT = Date.now();
      this.processes[modelPath] = { process: proc, port, lastT };
      await this.saveToDb();
      return port;
    } catch (e) {
      console.error(e);
    }
    return 0;
  }
  private async stopProcess(modelPath: string) {
    const { process } = this.processes[modelPath];
    console.log("stopProcess", { modelPath, id });
    try {
      if (process) {
        process.kill();
      }
    } catch {
      // meh
    }
    delete this.processes[modelPath];
    await this.saveToDb();
  }
  private findAvailablePort() {
    const ports = Object.values(this.processes).map(({ port }) => port);
    let port = STARTING_PORT;
    while (ports.includes(port)) {
      port++;
    }
    return port;
  }

  private async collectGarbage() {
    await this.loadFromDb();
    if (this._dead) return;
    const now = Date.now();
    const toDelete = Object.entries(this.processes).filter(
      ([_, { lastT }]) => now - lastT > TTL
    );
    for (const [modelPath] of toDelete) {
      await this.stopProcess(modelPath);
    }
    await this.saveToDb();
  }

  public async stopAll() {
    console.log("Stopping all processes...");
    if (this._dead) return;
    this._dead = true;
    for (const { process } of Object.values(this.processes)) {
      process?.kill();
    }
  }
}
