/* K-Sajoo — test/run.mjs
   실행: node test/run.mjs   (엔진과 같은 폴더 기준)

   Intl 타임존 데이터가 필요하므로 Node 16 이상에서 실행한다.
   브라우저에서 돌릴 때는 test/run.html 을 연다. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const context = vm.createContext({ console, Intl, Date, Math, JSON });
for (const file of ['../engine.js', './suite.js']) {
  vm.runInContext(readFileSync(join(here, file), 'utf8'), context, { filename: file });
}
const result = vm.runInContext('KSajooTestSuite.run(KSajoo)', context);
console.log(`${result.passed} / ${result.total} passed`);
for (const t of result.results) {
  console.log(`${t.pass ? 'PASS' : 'FAIL'}  ${t.name}${t.pass ? '' : '   [' + t.detail + ']'}`);
}
process.exit(result.failed === 0 ? 0 : 1);
