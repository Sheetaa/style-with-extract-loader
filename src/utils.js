import path from "path";

import isEqualLocals from "./runtime/isEqualLocals";

function stringifyRequest(loaderContext, request) {
  return JSON.stringify(
    loaderContext.utils.contextify(loaderContext.context, request),
  );
}

function getImportLinkAPICode(esModule, loaderContext) {
  const modulePath = stringifyRequest(
    loaderContext,
    `!${path.join(__dirname, "runtime/injectStylesIntoLinkTag.js")}`,
  );

  return esModule
    ? `import API from ${modulePath};`
    : `var API = require(${modulePath});`;
}

function getImportLinkContentCode(esModule, loaderContext, request) {
  const modulePath = stringifyRequest(loaderContext, `!!${request}`);

  return esModule
    ? `import content from ${modulePath};`
    : `var content = require(${modulePath});`;
}

function getImportStyleAPICode(esModule, loaderContext) {
  const modulePath = stringifyRequest(
    loaderContext,
    `!${path.join(__dirname, "runtime/injectStylesIntoStyleTag.js")}`,
  );

  return esModule
    ? `import API from ${modulePath};`
    : `var API = require(${modulePath});`;
}

function getImportStyleDomAPICode(
  esModule,
  loaderContext,
  isSingleton,
  isAuto,
) {
  const styleAPI = stringifyRequest(
    loaderContext,
    `!${path.join(__dirname, "runtime/styleDomAPI.js")}`,
  );
  const singletonAPI = stringifyRequest(
    loaderContext,
    `!${path.join(__dirname, "runtime/singletonStyleDomAPI.js")}`,
  );

  if (isAuto) {
    return esModule
      ? `import domAPI from ${styleAPI};
        import domAPISingleton from ${singletonAPI};`
      : `var domAPI = require(${styleAPI});
        var domAPISingleton = require(${singletonAPI});`;
  }

  return esModule
    ? `import domAPI from ${isSingleton ? singletonAPI : styleAPI};`
    : `var domAPI = require(${isSingleton ? singletonAPI : styleAPI});`;
}

function getImportStyleContentCode(esModule, loaderContext, request) {
  const modulePath = stringifyRequest(loaderContext, `!!${request}`);

  return esModule
    ? `import content, * as namedExport from ${modulePath};`
    : `var content = require(${modulePath});`;
}

function getImportInsertBySelectorCode(
  esModule,
  loaderContext,
  insertType,
  options,
) {
  if (insertType === "module-path") {
    const modulePath = stringifyRequest(loaderContext, `${options.insert}`);

    loaderContext.addBuildDependency(options.insert);

    return esModule
      ? `import insertFn from ${modulePath};`
      : `var insertFn = require(${modulePath});`;
  }

  const modulePath = stringifyRequest(
    loaderContext,
    `!${path.join(__dirname, "runtime/insertBySelector.js")}`,
  );

  return esModule
    ? `import insertFn from ${modulePath};`
    : `var insertFn = require(${modulePath});`;
}

function getInsertOptionCode(insertType, options) {
  if (insertType === "module-path") {
    return `options.insert = insertFn;`;
  }

  const insert = options.insert ? JSON.stringify(options.insert) : '"head"';

  return `options.insert = insertFn.bind(null, ${insert});`;
}

function getImportInsertStyleElementCode(esModule, loaderContext) {
  const modulePath = stringifyRequest(
    loaderContext,
    `!${path.join(__dirname, "runtime/insertStyleElement.js")}`,
  );

  return esModule
    ? `import insertStyleElement from ${modulePath};`
    : `var insertStyleElement = require(${modulePath});`;
}

function getStyleHmrCode(esModule, loaderContext, request, lazy) {
  const modulePath = stringifyRequest(loaderContext, `!!${request}`);

  return `
if (module.hot) {
  if (!content.locals || module.hot.invalidate) {
    var isEqualLocals = ${isEqualLocals.toString()};
    var isNamedExport = ${esModule ? "!content.locals" : false};
    var oldLocals = isNamedExport ? namedExport : content.locals;

    module.hot.accept(
      ${modulePath},
      function () {
        ${
          esModule
            ? `if (!isEqualLocals(oldLocals, isNamedExport ? namedExport : content.locals, isNamedExport)) {
                module.hot.invalidate();

                return;
              }

              oldLocals = isNamedExport ? namedExport : content.locals;

              ${
                lazy
                  ? `if (update && refs > 0) {
                      update(content);
                    }`
                  : `update(content);`
              }`
            : `content = require(${modulePath});

              content = content.__esModule ? content.default : content;

              ${
                lazy
                  ? ""
                  : `if (typeof content === 'string') {
                      content = [[module.id, content, '']];
                    }`
              }

              if (!isEqualLocals(oldLocals, content.locals)) {
                module.hot.invalidate();

                return;
              }

              oldLocals = content.locals;

              ${
                lazy
                  ? `if (update && refs > 0) {
                        update(content);
                      }`
                  : `update(content);`
              }`
        }
      }
    )
  }

  module.hot.dispose(function() {
    ${
      lazy
        ? `if (update) {
            update();
          }`
        : `update();`
    }
  });
}
`;
}

function getLinkHmrCode(esModule, loaderContext, request) {
  const modulePath = stringifyRequest(loaderContext, `!!${request}`);

  return `
if (module.hot) {
  module.hot.accept(
    ${modulePath},
    function() {
     ${
       esModule
         ? "update(content);"
         : `content = require(${modulePath});

           content = content.__esModule ? content.default : content;

           update(content);`
     }
    }
  );

  module.hot.dispose(function() {
    update();
  });
}`;
}

function getdomAPI(isAuto) {
  return isAuto ? "isOldIE() ? domAPISingleton : domAPI" : "domAPI";
}

function getImportIsOldIECode(esModule, loaderContext) {
  const modulePath = stringifyRequest(
    loaderContext,
    `!${path.join(__dirname, "runtime/isOldIE.js")}`,
  );

  return esModule
    ? `import isOldIE from ${modulePath};`
    : `var isOldIE = require(${modulePath});`;
}

function getStyleTagTransformFnCode(
  esModule,
  loaderContext,
  options,
  isSingleton,
) {
  if (isSingleton) {
    return "";
  }

  if (typeof options.styleTagTransform !== "undefined") {
    const modulePath = stringifyRequest(
      loaderContext,
      `${options.styleTagTransform}`,
    );

    loaderContext.addBuildDependency(options.styleTagTransform);

    return esModule
      ? `import styleTagTransformFn from ${modulePath};`
      : `var styleTagTransformFn = require(${modulePath});`;
  }

  const modulePath = stringifyRequest(
    loaderContext,
    `!${path.join(__dirname, "runtime/styleTagTransform.js")}`,
  );

  return esModule
    ? `import styleTagTransformFn from ${modulePath};`
    : `var styleTagTransformFn = require(${modulePath});`;
}

function getStyleTagTransformFn(options, isSingleton) {
  return isSingleton ? "" : `options.styleTagTransform = styleTagTransformFn`;
}

function getExportStyleCode(esModule, loaderContext, request) {
  const modulePath = stringifyRequest(loaderContext, `!!${request}`);

  return esModule
    ? `export * from ${modulePath};
       export default content && content.locals ? content.locals : undefined;`
    : "module.exports = content && content.locals || {};";
}

function getExportLazyStyleCode(esModule, loaderContext, request) {
  const modulePath = stringifyRequest(loaderContext, `!!${request}`);

  return esModule
    ? `export * from ${modulePath};
       export default exported;`
    : "module.exports = exported;";
}

function getSetAttributesCode(
  esModule,
  loaderContext,
  options,
  idWithAttributes = [],
) {
  let modulePath;

  if (typeof options.attributes !== "undefined" || idWithAttributes.length) {
    modulePath =
      options.attributes && options.attributes.nonce !== "undefined"
        ? stringifyRequest(
            loaderContext,
            `!${path.join(
              __dirname,
              "runtime/setAttributesWithAttributesAndNonce.js",
            )}`,
          )
        : stringifyRequest(
            loaderContext,
            `!${path.join(__dirname, "runtime/setAttributesWithAttributes.js")}`,
          );
  } else {
    modulePath = stringifyRequest(
      loaderContext,
      `!${path.join(__dirname, "runtime/setAttributesWithoutAttributes.js")}`,
    );
  }

  return esModule
    ? `import setAttributes from ${modulePath};`
    : `var setAttributes = require(${modulePath});`;
}

function getContentUpdatingCode(idWithAttributes) {
  return `var idWithAttributes = ${JSON.stringify(idWithAttributes)};
content.forEach(function (item) {
  var targetValue = idWithAttributes.find(value => value[0] === item[0]);
  if (targetValue) {
    item.attributes = targetValue[1];
  }
});`;
}

function getIdWithAttributes(id, attributesKey, filename, publicPath) {
  const attributes = {
    [attributesKey]: publicPath + filename,
  };

  return [id, attributes];
}

// eslint-disable-next-line import/prefer-default-export
export {
  stringifyRequest,
  getImportInsertStyleElementCode,
  getImportInsertBySelectorCode,
  getImportStyleContentCode,
  getImportStyleDomAPICode,
  getImportStyleAPICode,
  getImportLinkContentCode,
  getImportLinkAPICode,
  getStyleHmrCode,
  getLinkHmrCode,
  getdomAPI,
  getImportIsOldIECode,
  getStyleTagTransformFn,
  getExportStyleCode,
  getExportLazyStyleCode,
  getSetAttributesCode,
  getInsertOptionCode,
  getStyleTagTransformFnCode,
  getContentUpdatingCode,
  getIdWithAttributes,
};
