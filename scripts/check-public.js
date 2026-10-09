import { readdir, readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const denied = /(?:陆狰|青瓶|茧中|愁铃|醉星入梦|倾白|棠尸|衫上|一夜飘零|桓云宴|luzheng|qingping|jianzhong|choulingke|w[x][a-f0-9]{16}|\/(?:Users|home)\/[^/\s]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|lh-play-yysls)/i;
let failures = [];
async function scan(dir, prefix = '') {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(item.name)) continue;
    const name = prefix + item.name;
    if (name === 'scripts/check-public.js') continue;
    const url = new URL(item.name + (item.isDirectory() ? '/' : ''), dir);
    if (item.isDirectory()) await scan(url, name + '/');
    else if (/\.(key|pem|mp4|wav|m4a|png|jpg)$/i.test(name) || item.name.startsWith('.env') || denied.test(await readFile(url, 'utf8'))) failures.push(name);
  }
}
await scan(root);
if (failures.length) { console.error('Public export check failed:', failures); process.exitCode = 1; }
else console.log('Public export check passed (current tree only; manual review still required).');
