// bring-the-humans-03 entry runner.
// Job: hand VIDEO.json from the repo root to the grader's output folder,
// after proving the file is well-formed and names a real TikTok video.
// Runs on Node 22 with the standard library only — no dependencies.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const botRoot = resolve(process.env.MAKEFUN_BOT_DIR ?? '/bot');
const outRoot = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const sourceName = 'VIDEO.json';

// Accepts the canonical video address on www or m TikTok, plus the
// mobile /v/<id>.html form. A query string or fragment after the id is
// tolerated; anything else (short links, photo posts, other hosts) is not.
const VIDEO_ADDRESS =
  /^https:\/\/(?:www\.|m\.)tiktok\.com\/@([A-Za-z0-9._-]+)\/video\/(\d+)(?:[?#].*)?$|^https:\/\/m\.tiktok\.com\/v\/(\d+)\.html(?:[?#].*)?$/;

function fail(message: string): never {
  console.error(`bring-the-humans-03: ${message}`);
  process.exit(1);
}

function loadVideoDescriptor(): { url: string; raw: string } {
  const sourcePath = join(botRoot, sourceName);
  if (!existsSync(sourcePath)) {
    fail(`no ${sourceName} found under ${botRoot}`);
  }
  let raw: string;
  try {
    raw = readFileSync(sourcePath, 'utf8');
  } catch (cause) {
    fail(`could not read ${sourcePath}: ${(cause as Error).message}`);
  }
  // The gate refuses a VIDEO.json over 16384 bytes, so catch that early.
  if (Buffer.byteLength(raw, 'utf8') > 16384) {
    fail(`${sourceName} is ${Buffer.byteLength(raw, 'utf8')} bytes, over the 16384-byte limit`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw!);
  } catch (cause) {
    fail(`${sourceName} is not valid JSON: ${(cause as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    fail(`${sourceName} must hold a JSON object with a "url" field`);
  }
  const url = (parsed as Record<string, unknown>).url;
  if (typeof url !== 'string' || url.length === 0) {
    fail(`${sourceName} must hold a non-empty string "url"`);
  }
  return { url, raw };
}

function describeVideo(url: string): { handle: string; videoId: string } {
  const match = VIDEO_ADDRESS.exec(url);
  if (!match) {
    fail(
      `bad video url ${JSON.stringify(url)} — expected https://www.tiktok.com/@<handle>/video/<digits>`,
    );
  }
  if (match[3] !== undefined) {
    return { handle: '(mobile link)', videoId: match[3] };
  }
  return { handle: `@${match[1]}`, videoId: match[2]! };
}

const descriptor = loadVideoDescriptor();
const video = describeVideo(descriptor.url);

mkdirSync(outRoot, { recursive: true });
const destination = join(outRoot, sourceName);
try {
  // Pass the checked file through untouched, so the copy the gate reads
  // is byte-for-byte the one in the repository.
  writeFileSync(destination, descriptor.raw, 'utf8');
} catch (cause) {
  fail(`could not write ${destination}: ${(cause as Error).message}`);
}

console.log(
  `bring-the-humans-03: handed in TikTok video ${video.videoId} by ${video.handle} -> ${destination}`,
);
