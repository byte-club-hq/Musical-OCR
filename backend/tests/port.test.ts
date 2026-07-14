import { describe, expect, it } from "vitest";

import { resolvePort } from "../src/port.ts";

describe("resolvePort", () => {
  it("uses port 3000 when PORT is not set", () => {
    expect(resolvePort(undefined)).toBe(3000);
  });

  it.each(["1", "3001", "65535"])("accepts port %s", (value) => {
    expect(resolvePort(value)).toBe(Number(value));
  });

  it.each(["", "0", "65536", "3.5", "3000x", " 3000 "])(
    "rejects invalid PORT value %j",
    (value) => {
      expect(() => resolvePort(value)).toThrow(
        "PORT must be an integer between 1 and 65535",
      );
    },
  );
});
