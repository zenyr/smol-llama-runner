import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout } from "node:timers/promises";
import sqlite3 from "sqlite3";
import { ulid } from "ulid";
import { dirs } from "./dirnames";
import { axios } from "./axios";

const TTL = 60 * 1000; // 1 minute
const MODEL_DIR = dirs.models;
const STARTING_PORT = 4000;
const SERVER_EXECUTABLE = resolve(dirs.repo, "./server");

type ProcessInfo = {
  proc?: ChildProcessWithoutNullStreams;
  procId: number;
  port: number;
  lastT: number;
  owner: string;
};
type DBProcessInfo = Omit<ProcessInfo, "proc"> & { modelPath: string };

const id = ulid();

const query = async (query: string, params: any[] = []): Promise<any[]> => {
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
const upsertManagerIds = async (sessionId: string) => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dirs.sql);
    db.run(
      "INSERT OR REPLACE INTO managers (sessionId, lastT) VALUES (?, ?)",
      [sessionId, Date.now()],
      (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(sessionId);
        }
      }
    );
    db.close();
  });
};

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
        await this.collectGarbage(true);
        await setTimeout(5000);
      }
    })();
  }

  private async primeTable() {
    try {
      await query(
        `CREATE TABLE IF NOT EXISTS processes (
          modelPath TEXT PRIMARY KEY,
          port INTEGER,
          lastT INTEGER,
          procId INTEGER,
          owner TEXT
      );`
      );
      await query(
        `CREATE TABLE IF NOT EXISTS managers (
          sessionId TEXT PRIMARY KEY,
          lastT INTEGER
      );`
      );
    } catch (e) {
      if (e instanceof Error) {
        console.error("Query error:", e.message);
      }
    }
  }

  private async loadFromDb() {
    const rows: DBProcessInfo[] = await query("SELECT * FROM processes");
    for (const { modelPath, port, lastT, owner, procId } of rows) {
      const org = this.processes[modelPath] || {};
      this.processes[modelPath] = { ...org, port, lastT, owner, procId };
    }
    await upsertManagerIds(id);
  }

  private async saveToDb() {
    const rows = Object.entries(this.processes).map(
      ([modelPath, { proc, ...rest }]) => ({ modelPath, ...rest })
    );
    try {
      for (const { modelPath, port, lastT, owner, procId } of rows) {
        await query(
          `INSERT INTO processes (modelPath, port, lastT, owner, procId)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT (modelPath)
          DO UPDATE SET port = excluded.port, lastT = excluded.lastT, owner = excluded.owner, procId = excluded.procId;`,
          [modelPath, port, lastT, owner, procId]
        );
      }
      await upsertManagerIds(id);
    } catch (e) {
      console.error("saveToDb Error:", e);
    }
  }

  private async healthCheck(port: number, skipDb = false) {
    if (!port) return false;
    const url = `http://localhost:${port}/`;

    try {
      const response = await axios.get(url);
      if (response.status === 200) {
        // Server is alive
        return true;
      }
    } catch (error) {
      return false;
    }

    return false;
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
        .map(async (f) => {
          const port = await this.getPortByModelPath(f, true);
          const portAlive = (port && this.healthCheck(port, true)) || false;
          return {
            filename: f,
            size: (await stat(resolve(MODEL_DIR, f))).size,
            port: portAlive ? port : void 0,
          };
        })
    );
  }

  public async getPortByModelPath(modelPath: string, skipDb = false) {
    if (!skipDb) await this.loadFromDb();
    if (process.env.NODE_ENV !== "production") {
      if (modelPath === "WizardLM-7B-uncensored.ggmlv3.q4_0.bin") {
        return 8080;
      }
    }
    const port = this.processes[modelPath]?.port;
    if (port) {
      this.healthCheck(port, skipDb);
    }
    return this.processes[modelPath]?.port;
  }

  public async getMemoryUsageByModelPath(modelPath: string) {
    await this.loadFromDb();
    const item = this.processes[modelPath];
    if (!item) return 0;
    const { proc } = item;
    const pid = proc?.pid ?? item.procId;
    if (!pid) return 0;
    const command =
      process.platform === "win32"
        ? `tasklist /FI "PID eq ${pid}" /FO CSV`
        : `ps -o pid=,rss=,vsz= -p ${pid}`;

    const platformCommand = process.platform === "win32" ? "cmd.exe" : "sh";
    const commandArgs =
      process.platform === "win32" ? ["/c", command] : ["-c", command];

    const tasklist = spawn(platformCommand, commandArgs);

    return await new Promise<number>((res) => {
      let output = "";
      tasklist.stdout.on("data", (data) => {
        output += data.toString();
      });

      tasklist.on("error", (error) => {
        console.error(
          `Failed to execute the memory measurement command: ${error}`
        );
        res(0);
      });

      tasklist.on("close", (code) => {
        if (code === 0) {
          const lines = output.split(/\r?\n/);
          if (lines.length >= 2) {
            const headers = lines[0]
              .trim()
              .split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
            const values = lines[1].trim().split(/\s+/);

            const rssIndex = headers.indexOf("rss");

            if (rssIndex !== -1) {
              const rss = parseInt(values[rssIndex]);

              res(rss * 1024);
            }
          }
          console.error("Failed to parse memory usage output.");
        } else {
          res(0);
          console.error(`Memory measurement command exited with code ${code}.`);
        }
      });
    });
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
    const oldPort = await this.getPortByModelPath(modelPath);
    if (oldPort) {
      await this.updateT(modelPath);
      return oldPort;
    }
    console.log("startProcess", { modelPath, id });
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
        "-ngl",
        "1",
      ]);
      const procId = proc.pid;
      if (!procId) throw new Error("Failed to get process id");
      proc.on("exit", () => this.stopOrForgetProcess(modelPath));
      const lastT = Date.now();
      this.processes[modelPath] = {
        proc: proc,
        port,
        lastT,
        owner: id,
        procId,
      };
      await this.saveToDb();
      return port;
    } catch (e) {
      console.error(e);
    }
    return 0;
  }
  private async stopOrForgetProcess(modelPath: string, skipDb = false) {
    console.log("stopOrForgetProcess", { modelPath, id });
    if (!skipDb) await this.loadFromDb();
    const info = this.processes[modelPath];
    if (info) {
      const { proc, owner, procId, lastT } = info;
      const isMine = owner === id;
      const wayTooOld = lastT + 2 * TTL < Date.now();
      if (isMine || wayTooOld) {
        console.log("stopProcess.owner", { modelPath, id, isMine, wayTooOld });
        // Kill process <<<
        try {
          if (!proc) throw new Error("Failed to find process from owner");
          proc.kill(9);
        } catch (e) {
          console.error(
            `Failed to kill process ${modelPath}, trying to kill by pid`
          );
          console.error("proc.kill failed:", e);
          try {
            process.kill(procId, 9);
          } catch (e2) {
            console.error(
              `Failed to kill process ${modelPath} by pid ${procId}`
            );
            console.error(`process.kill(${procId}) failed`, e2);
          }
          // >>> Kill process
        } finally {
          console.log("forgetting process", { modelPath });
          delete this.processes[modelPath];
          if (!skipDb)
            await query("DELETE FROM processes WHERE modelPath = ?", [
              modelPath,
            ]);
        }
      }
    }
  }
  private findAvailablePort() {
    const ports = Object.values(this.processes).map(({ port }) => port);
    let port = STARTING_PORT;
    while (ports.includes(port)) {
      port++;
    }
    return port;
  }

  private async collectGarbage(skipDb = false) {
    if (!skipDb) await this.loadFromDb();
    if (this._dead) return;
    const now = Date.now();
    const toDelete = Object.entries(this.processes).filter(
      ([_, { lastT }]) => now - lastT > TTL
    );
    for (const [modelPath] of toDelete) {
      await this.stopOrForgetProcess(modelPath, skipDb);
    }
    await this.saveToDb();
  }

  public async stopByPort(port: number) {
    await this.loadFromDb();
    const entry = Object.entries(this.processes).find(
      ([, { port: p }]) => p === port
    );
    if (!entry) throw new Error(`Port ${port} not found.`);
    const [modelPath, item] = entry;
    if (item.owner !== id) throw new Error(`Port ${port} not owned by ${id}`);
    await this.stopOrForgetProcess(modelPath);
    return true;
  }

  public async stopAll() {
    console.log("Stopping all processes...", id);
    if (this._dead) return;
    await query("DELETE FROM managers WHERE sessionId = ?", [id]);
    this._dead = true;
    for (const modelPath of Object.keys(this.processes)) {
      await this.stopOrForgetProcess(modelPath, true);
    }
    await this.saveToDb();
    return true;
  }
}
