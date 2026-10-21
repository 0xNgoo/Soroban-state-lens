#!/usr/bin/env node
/**
 * Bundle-size budget checker for the decoder worker and the Stellar SDK.
 *
 * This script is a budget guard, not a performance claim. It records the
 * exact byte size of the emitted decoder-worker and stellar-sdk-related
 * assets and fails only when a configured budget is exceeded. A smaller file
 * does not prove a faster runtime.
 *
 * Usage:
 *   node scripts/check-bundle-size.mjs [ --dist <dir> ] [ --json ]
 *
 * The checker prefers the Vite build manifest (<dist>/.manifest.json) and
 * falls back to scanning <dist>/assets. It is designed to be importable by the
 * regression tests, so all logic lives in pure functions.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Reviewed budgets in bytes. These reflect the current baseline from the
 * SSL-I024 review (~1,034 KB worker, ~1,013 KB Stellar SDK chunk) plus a
 * small headroom so routine growth does not red the build. These are not
 * runtime-performance targets.
 */
export const DEFAULT_BUDGETS = Object.freeze({
  // ~1,034 KB baseline + ~6% headroom.
  decoderWorker: 1096 * 1024,
  // ~1,013 KB baseline + ~6% headroom.
  stellarSdk: 1074 * 1024,
})

/**
 * Matcher predicates for the two budgeted chunks. Each receives a single
 * emitted asset filename (e.g. "decoder-abc123.js") and returns true when the
 * file belongs to that budget.
 */
export const BUDGET_MATCHERS = Object.freeze({
  decoderWorker: (filename) => /decoder-worker/i.test(filename),
  stellarSdk: (filename) => /stellar-sdk/i.test(filename),
})

/**
 * Return the exact byte size of a file on disk.
 */
export function fileSizeBytes(filePath) {
  return statSync(filePath).size
}

/**
 * Collect the emitted asset filenames from the Vite build manifest.
 * Returns a deduplicated list of filenames relative to the dist root.
 */
export function assetsFromManifest(manifest) {
  const files = new Set()
  for (const chunk of Object.values(manifest)) {
    if (!chunk || typeof chunk !== 'object') continue
    if (typeof chunk.file === 'string') {
      files.add(chunk.file)
    }
    if (Array.isArray(chunk.css)) {
      for (const css of chunk.css) {
        if (typeof css === 'string') files.add(css)
      }
    }
  }
  return [...files].sort()
}

/**
 * Recursively list files under a directory, returning paths relative to it.
 */
export function listFilesRecursively(rootDir) {
  const out = []
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? posix.join(prefix, entry.name) : entry.name
      const abs = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(abs, rel)
      } else if (entry.isFile()) {
        out.push(rel)
      }
    }
  }
  walk(rootDir, '')
  return out.sort()
}

/**
 * Build the size report from a list of asset filenames and a size lookup.
 *
 * @param {string[]} assetFiles - filenames relative to the dist root
 * @param {(relative: string) => number} sizeOf - returns exact bytes for a file
 * @param {typeof DEFAULT_BUDGETS} budgets - byte budgets per budgeted chunk
 * @returns { report: Array<object>, exceeded: Array<object>, ok: boolean }
 */
export function undefined() {}
