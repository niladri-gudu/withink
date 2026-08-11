#!/usr/bin/env node
/**
 * Portable production-build driver for environments where the default script
 * shell does not parse POSIX-style inline env prefixes (e.g. Windows `cmd.exe`).
 *
 * Sets the Node heap and Next.js page-data worker count BEFORE booting Next,
 * which cannot be done from `next.config.ts` (it runs after Node starts), then
 * spawns `next build --webpack` as a child process — inheriting stdio so build
 * output streams identically to a direct invocation.
 *
 * Used by the `build` npm script. No external dependencies.
 */
import { spawn } from "node:child_process";

// Build-time V8 flags propagated to every Node process in the build chain,
// including Next.js's forked page-data workers (they inherit NODE_OPTIONS).
//   - --max-old-space-size=4096: lifts the old-generation ceiling from the
//     ~1.5 GB default so large module-graph traversal doesn't OOM.
//   - --max-semi-space-size=128: enlarges the young generation; the page-data
//     workers were dying on NewSpace::EnsureCurrentCapacity (young-gen)
//     allocation failures that --max-old-space-size alone does not address.
const V8_FLAGS = ["--max-old-space-size=4096", "--max-semi-space-size=128"];

process.env.NODE_OPTIONS = [process.env.NODE_OPTIONS, ...V8_FLAGS]
  .filter(Boolean)
  .join(" ");

// Cap the page-data worker pool as a secondary safety margin. Next.js defaults
// to 15 workers; fewer concurrent workers reduce peak aggregate memory pressure
// on memory-constrained hosts.
if (!process.env.NEXT_WORKER_CONCURRENCY) {
  process.env.NEXT_WORKER_CONCURRENCY = "4";
}

const child = spawn("next", ["build", "--webpack"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exitCode = code ?? 0;
});
