import { existsSync, readdirSync, statSync, statfsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { loadavg } from "os";
import {
  HEALTH_DISK_FREE_WARN_BYTES,
  HEALTH_HEAP_WARN_MB,
  HEALTH_RSS_WARN_MB,
  HEALTH_UPLOADS_DIR_WARN_BYTES,
} from "@/lib/infra/production-limits";
import {
  sampleEventLoopLagMs,
  sampleEventLoopLagMaxMs,
} from "@/lib/infra/event-loop-monitor";
import { getRequestMetricsSummary } from "@/lib/infra/request-metrics";

export type HealthOpsSnapshot = {
  process: {
    heapUsedMb: number;
    rssMb: number;
    uptimeSec: number;
  };
  warnings: string[];
  cpu?: {
    load1: number;
    load5: number;
    load15: number;
  };
  eventLoop?: {
    meanLagMs: number;
    maxLagMs: number;
  };
  requests?: {
    sampleCount: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
  };
  disk?: {
    path: string;
    freeBytes: number;
    freeGb: number;
  };
  uploads?: {
    path: string;
    exists: boolean;
    totalBytes: number;
    totalGb: number;
  };
  temp?: {
    path: string;
    totalBytes: number;
    totalMb: number;
  };
};

function dirSizeBytes(root: string, depth = 0, maxDepth = 8): number {
  if (depth > maxDepth || !existsSync(root)) return 0;
  let total = 0;
  try {
    for (const name of readdirSync(root)) {
      const p = join(root, name);
      try {
        const st = statSync(p);
        if (st.isDirectory()) {
          total += dirSizeBytes(p, depth + 1, maxDepth);
        } else if (st.isFile()) {
          total += st.size;
        }
      } catch {
        // skip unreadable entries
      }
    }
  } catch {
    return total;
  }
  return total;
}

function diskFreeForPath(path: string): { freeBytes: number } | null {
  try {
    const s = statfsSync(path);
    const freeBytes = Number(s.bfree) * Number(s.bsize);
    if (!Number.isFinite(freeBytes) || freeBytes < 0) return null;
    return { freeBytes };
  } catch {
    return null;
  }
}

/** Only when ENABLE_PRODUCTION_HEALTH_OPS=1 — extended diagnostics for operators. */
export function isProductionHealthOpsEnabled(): boolean {
  return process.env.ENABLE_PRODUCTION_HEALTH_OPS === "1";
}

/**
 * Lightweight ops metrics for /api/health — no secrets, no env values.
 * Call only when {@link isProductionHealthOpsEnabled} is true.
 */
export function getHealthOpsSnapshot(options?: {
  includeDisk?: boolean;
  includeUploadsDir?: boolean;
  includeTemp?: boolean;
}): HealthOpsSnapshot {
  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);
  const rssMb = Math.round(mem.rss / 1024 / 1024);
  const warnings: string[] = [];

  if (heapUsedMb >= HEALTH_HEAP_WARN_MB) {
    warnings.push("node_heap_high");
  }
  if (rssMb >= HEALTH_RSS_WARN_MB) {
    warnings.push("node_rss_high");
  }

  const snapshot: HealthOpsSnapshot = {
    process: {
      heapUsedMb,
      rssMb,
      uptimeSec: Math.round(process.uptime()),
    },
    warnings,
  };

  const [l1, l5, l15] = loadavg();
  snapshot.cpu = {
    load1: Math.round(l1 * 100) / 100,
    load5: Math.round(l5 * 100) / 100,
    load15: Math.round(l15 * 100) / 100,
  };
  if (l1 > 4) warnings.push("cpu_load_high");

  const meanLag = sampleEventLoopLagMs(true);
  const maxLag = sampleEventLoopLagMaxMs();
  if (meanLag != null && maxLag != null) {
    snapshot.eventLoop = { meanLagMs: meanLag, maxLagMs: maxLag };
    if (meanLag > 100) warnings.push("event_loop_lag_high");
  }

  const reqSummary = getRequestMetricsSummary();
  if (reqSummary) snapshot.requests = reqSummary;

  if (options?.includeDisk) {
    const root = process.cwd();
    const disk = diskFreeForPath(root);
    if (disk) {
      snapshot.disk = {
        path: root,
        freeBytes: disk.freeBytes,
        freeGb: Math.round((disk.freeBytes / 1024 ** 3) * 10) / 10,
      };
      if (disk.freeBytes < HEALTH_DISK_FREE_WARN_BYTES) {
        warnings.push("disk_free_low");
      }
    }
  }

  if (options?.includeUploadsDir) {
    const uploadsPath = join(process.cwd(), "public", "uploads");
    const exists = existsSync(uploadsPath);
    const totalBytes = exists ? dirSizeBytes(uploadsPath) : 0;
    snapshot.uploads = {
      path: uploadsPath,
      exists,
      totalBytes,
      totalGb: Math.round((totalBytes / 1024 ** 3) * 100) / 100,
    };
    if (totalBytes >= HEALTH_UPLOADS_DIR_WARN_BYTES) {
      warnings.push("uploads_dir_large");
    }
  }

  if (options?.includeTemp) {
    const tempPath = tmpdir();
    const tempBytes = dirSizeBytes(tempPath, 0, 3 /* shallow scan — avoid blocking health */);
    snapshot.temp = {
      path: tempPath,
      totalBytes: tempBytes,
      totalMb: Math.round((tempBytes / 1024 ** 2) * 10) / 10,
    };
    if (tempBytes > 512 * 1024 * 1024) {
      warnings.push("temp_dir_large");
    }
  }

  return snapshot;
}
