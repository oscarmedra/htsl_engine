import { describe, expect, it } from "vitest";
import { compile } from "../src/index.js";
import { describeObject, resolvePath } from "../src/objects/registry.js";

describe("media — images", () => {
  it("renders an image with src/alt", () => {
    expect(compile(`{img[src="a.png", alt="x"]/}`)).toBe('<img src="a.png" alt="x">');
  });

  it("renders a figure with a caption", () => {
    expect(compile(`{figure:{img[src="a.png", alt="x"]/}{figcaption:Légende}}`)).toBe(
      '<figure><img src="a.png" alt="x"><figcaption>Légende</figcaption></figure>',
    );
  });

  it("registers img/figure/figcaption in the palette", () => {
    expect(describeObject("img")).not.toBeNull();
    expect(describeObject("figure")).not.toBeNull();
    expect(describeObject("figcaption")).not.toBeNull();
  });
});

describe("media — video / audio / iframe", () => {
  it("renders a video with nested source", () => {
    expect(compile(`{video[controls]:{source[src="f.mp4", type="video/mp4"]/}}`)).toBe(
      '<video controls><source src="f.mp4" type="video/mp4"></video>',
    );
  });

  it("renders audio with a direct src", () => {
    expect(compile(`{audio[src="s.mp3", controls]:}`)).toBe('<audio src="s.mp3" controls></audio>');
  });

  it("renders an iframe embed (self-closing → paired tag)", () => {
    expect(compile(`{iframe[src="https://e.fr/x", width="560"]/}`)).toBe(
      '<iframe src="https://e.fr/x" width="560"></iframe>',
    );
  });

  it("registers video/audio/source/iframe in the palette", () => {
    for (const n of ["video", "audio", "source", "iframe"]) {
      expect(describeObject(n), n).not.toBeNull();
    }
  });
});

describe("boolean attributes", () => {
  it("emits a bare boolean attribute when present", () => {
    expect(compile(`{video[controls]:}`)).toBe("<video controls></video>");
  });

  it("treats `=true` the same as bare", () => {
    expect(compile(`{video[controls=true]:}`)).toBe("<video controls></video>");
  });

  it("omits a boolean attribute set to false", () => {
    expect(compile(`{video[controls=false]:}`)).toBe("<video></video>");
  });

  it("keeps non-boolean attributes as name=value", () => {
    expect(compile(`{video[width="320"]:}`)).toBe('<video width="320"></video>');
  });

  it("does not collide with media element paths", () => {
    expect(resolvePath("iframe")).toBe("iframe");
  });
});
