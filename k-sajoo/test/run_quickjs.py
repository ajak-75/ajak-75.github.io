#!/usr/bin/env python3
"""K-Sajoo — test/run_quickjs.py  (개발용 로컬 실행기)

Node 없이 엔진을 돌리기 위한 하네스. QuickJS 에는 Intl 타임존 데이터가 없으므로
파이썬 zoneinfo 로 formatToParts 를 흉내 내어 실제 엔진 코드를 그대로 실행한다.

    python3 test/run_quickjs.py

배포 대상이 아니며, 브라우저에서는 test/run.html 로 같은 검사를 돌린다.
"""
import json
import sys
import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import quickjs

HERE = Path(__file__).resolve().parent


def tz_parts(ms, tz):
    try:
        dt = datetime.datetime.fromtimestamp(ms / 1000.0, datetime.timezone.utc).astimezone(ZoneInfo(tz))
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"unknown timezone: {tz}") from exc
    return json.dumps([
        {"type": "year", "value": f"{dt.year:04d}"},
        {"type": "month", "value": f"{dt.month:02d}"},
        {"type": "day", "value": f"{dt.day:02d}"},
        {"type": "hour", "value": f"{dt.hour:02d}"},
        {"type": "minute", "value": f"{dt.minute:02d}"},
        {"type": "second", "value": f"{dt.second:02d}"},
    ])


SHIM = r"""
globalThis.Intl = {
  DateTimeFormat: function (locale, opts) { this.tz = (opts && opts.timeZone) || 'UTC'; }
};
globalThis.Intl.DateTimeFormat.prototype.formatToParts = function (date) {
  var raw = JSON.parse(__tzParts(date.getTime(), this.tz));
  var out = [];
  for (var i = 0; i < raw.length; i++) out.push({ type: raw[i].type, value: raw[i].value });
  return out;
};
"""


def main():
    ctx = quickjs.Context()
    ctx.add_callable("__tzParts", tz_parts)
    ctx.eval(SHIM)
    ctx.eval((HERE.parent / "engine.js").read_text(encoding="utf-8"))
    ctx.eval((HERE / "suite.js").read_text(encoding="utf-8"))
    result = json.loads(ctx.eval("JSON.stringify(KSajooTestSuite.run(KSajoo))"))

    for test in result["results"]:
        mark = "PASS" if test["pass"] else "FAIL"
        line = f"{mark}  {test['name']}"
        if not test["pass"]:
            line += f"   [{test['detail']}]"
        print(line)
    print()
    print(f"{result['passed']} / {result['total']} passed, {result['failed']} failed")
    return 0 if result["failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
