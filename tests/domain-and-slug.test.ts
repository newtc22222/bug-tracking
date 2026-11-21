import { describe, expect, it } from "vitest";
import { normalizeDomain } from "@/lib/domain";
import { slugify } from "@/lib/slug";

describe("normalizeDomain", () => {
  it("normalizes uppercase hostnames, protocols, ports, paths, and trailing dots", () => {
    expect(normalizeDomain("HTTPS://APP.Example.COM:8443/dashboard?tab=1#top")).toBe(
      "app.example.com",
    );
    expect(normalizeDomain("http://localhost:3000/projects")).toBe("localhost");
    expect(normalizeDomain("  sub.domain.co.uk.  ")).toBe("sub.domain.co.uk");
  });

  it("handles bare hostnames and invalid URL fallback safely", () => {
    expect(normalizeDomain("example.com")).toBe("example.com");
    expect(normalizeDomain("invalid host/path:8080.")).toBe("invalid host");
  });

  it("returns empty string for empty or whitespace input", () => {
    expect(normalizeDomain("")).toBe("");
    expect(normalizeDomain("   ")).toBe("");
  });
});

describe("slugify", () => {
  it("generates lowercase hyphenated slugs", () => {
    expect(slugify("My Awesome Project")).toBe("my-awesome-project");
    expect(slugify("  Bug Tracker v2.0!  ")).toBe("bug-tracker-v2-0");
  });

  it("strips leading and trailing hyphens and handles symbol-only input", () => {
    expect(slugify("---Hello---World---")).toBe("hello-world");
    expect(slugify("!!!")).toBe("");
  });
});
