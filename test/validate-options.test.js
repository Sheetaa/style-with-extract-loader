import { getCompiler, compile } from "./helpers";

describe("validate options", () => {
  const tests = {
    injectType: {
      success: [
        "styleTag",
        "singletonStyleTag",
        "autoStyleTag",
        "lazyStyleTag",
        "lazySingletonStyleTag",
        "lazyAutoStyleTag",
        "linkTag",
      ],
      failure: ["unknown"],
    },
    attributes: {
      success: [{}, { id: "id" }],
      failure: [true],
    },
    insert: {
      success: ["selector", require.resolve("./fixtures/insertFn.js")],
      failure: [true],
    },
    esModule: {
      success: [true, false],
      failure: ["true"],
    },
    styleTagTransform: {
      // eslint-disable-next-line func-names
      success: [require.resolve("./fixtures/styleTagTransform")],
      failure: [true, []],
    },
    extract: {
      success: [true, false],
      failure: ["true"],
    },
    attributesKey: {
      success: ["foo", "bar"],
      failure: [true, 1, /test/, []],
    },
    publicPath: {
      success: ["/", "URL_ADDRESS"],
      failure: [true, 1, /test/, []],
    },
    filename: {
      success: ["/[id].[contenthash:8].css"],
      failure: [1, /test/, []],
    },
    unknown: {
      success: [],
      failure: [1, true, false, "test", /test/, [], {}, { foo: "bar" }],
    },
  };

  function stringifyValue(value) {
    if (
      Array.isArray(value) ||
      (value && typeof value === "object" && value.constructor === Object)
    ) {
      return JSON.stringify(value);
    }

    return value;
  }

  async function createTestCase(key, value, type) {
    it(`should ${
      type === "success" ? "successfully validate" : "throw an error on"
    } the "${key}" option with "${stringifyValue(value)}" value`, async () => {
      const compiler = getCompiler("simple.js", { [key]: value });

      let stats;

      try {
        stats = await compile(compiler);
      } finally {
        if (type === "success") {
          // const errors = stats.toJson().errors;
          // console.log(errors);
          expect(stats.hasErrors()).toBe(false);
        } else if (type === "failure") {
          const {
            compilation: { errors },
          } = stats;

          expect(errors).toHaveLength(2);
          expect(() => {
            throw new Error(errors[0].error.message);
          }).toThrowErrorMatchingSnapshot();
        }
      }
    });
  }

  for (const [key, values] of Object.entries(tests)) {
    for (const type of Object.keys(values)) {
      for (const value of values[type]) {
        createTestCase(key, value, type);
      }
    }
  }
});
