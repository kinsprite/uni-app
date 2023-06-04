const t = require('@babel/types')
const babelTemplate = require('@babel/template').default

// const buildDynamicImport = babelTemplate(`var IMPORT_NAME = ()=>import(IMPORT_SOURCE)`, {
//   preserveComments: true,
//   plugins: [
//     'dynamicImport'
//   ]
// })
// 已废弃，@vue/cli-plugin-babel@4 增加了 dynamic import 转换
// var test = ()=>import(/* webpackChunkName: "components/test" */'../../components/test')
// function getDynamicImport (name, source, chunkName) {
//   const stringLiteral = t.stringLiteral(source)
//   const dynamicImportComment = {
//     type: 'CommentBlock',
//     value: `webpackChunkName: "${chunkName}"`
//   }
//   stringLiteral.leadingComments = [dynamicImportComment]
//   return buildDynamicImport({
//     IMPORT_NAME: t.identifier(name),
//     IMPORT_SOURCE: stringLiteral
//   })
// }
// var test = function(resolve) {require.ensure([], () => resolve(require('../../components/test')),'components/test')}
const buildRequireEnsure = babelTemplate(
  `var IMPORT_NAME = function(){
    __webpack_pap_remove_begin__;
    require.ensure([], function () { require(IMPORT_SOURCE) }, CHUNK_NAME);
    __webpack_pap_remove_end__;
  }`)

function getRequireEnsure (name, source, chunkName) {
  return buildRequireEnsure({
    IMPORT_NAME: t.identifier(name),
    IMPORT_SOURCE: t.stringLiteral(source),
    CHUNK_NAME: t.stringLiteral(chunkName)
  })
}

const buildAnonymousRequireEnsure = babelTemplate(
  `(function () {
    __webpack_pp_remove_begin__;
    require.ensure([], function () { require(IMPORT_SOURCE) }, CHUNK_NAME);
    __webpack_pp_remove_end__;
  })`)

function getAnonymousRequireEnsure (source, chunkName) {
  return buildAnonymousRequireEnsure({
    IMPORT_SOURCE: t.stringLiteral(source),
    CHUNK_NAME: t.stringLiteral(chunkName)
  })
}

module.exports = function ({
  types: t
}) {
  return {
    visitor: {
      ImportDeclaration (path, state) {
        const dynamicImport = state.opts.dynamicImports[path.node.source.value]
        if (dynamicImport) {
          path.insertBefore(
            getRequireEnsure(
              path.node.specifiers[0].local.name,
              dynamicImport.source,
              dynamicImport.chunkName
            )
          )
          path.remove()
        }
      },
      Import (path, state) {
        const parent = path.parent

        if (parent.arguments.length !== 1) {
          return
        }

        const importSource = parent.arguments[0].value
        const dynamicImport = state.opts.dynamicImports[importSource]

        if (!dynamicImport) {
          return
        }

        const statRequire = getAnonymousRequireEnsure(dynamicImport.source, dynamicImport.chunkName)

        // import('@/comp/b'),
        let parentPath = path.parentPath

        if (parentPath.parentPath && parentPath.parentPath.node.type === 'ArrowFunctionExpression') {
          // () => import('../d')
          parentPath = parentPath.parentPath
        } else {
          // function CompB() { return import('@/comp/b'); }
          const ppTypes = ['CallExpression', 'ReturnStatement', 'BlockStatement', 'FunctionExpression']

          let pp = parentPath
          let isOK = true

          for (let i = 0; i < ppTypes.length; i += 1) {
            const curType = pp.node.type

            if (curType !== ppTypes[i]) {
              isOK = false
              break
            }

            if (curType === 'BlockStatement' && pp.node.body.length !== 1) {
              isOK = false
              break
            }

            if (!pp.parentPath || i === ppTypes.length - 1) {
              break
            }

            pp = pp.parentPath
          }

          if (isOK) {
            parentPath = pp
          }
        }

        parentPath.replaceExpressionWithStatements(Array.isArray(statRequire) ? statRequire : [statRequire])
      }
    }
  }
}
