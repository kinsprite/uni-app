
/**
 * 1. 需定义 process.env.UNI_MP_FEATURE_ASYNC 才生效
 * 2. 需nodejs版本>=16
 * 3. babel.config.js 中 presets '@vue/app'需配置 modules 等于 false. 使用 webpack 构建import()模块关系
 *
 */

const UniMpModifyMiniCssExtractPlugin = require('./modify-mini-css-extract-plugin')
const UniMpJsonpScriptPlugin = require('./jsonp-script-plugin')
const UniMpRuntimeTemplatePlugin = require('./runtime-template-plugin')
const UniMpAppJsonAsyncPackagePlugin = require('./app-json-async-package-plugin')
const UniMpAsyncComponentWebpackPlugin = require('./async-component-webpack-plugin')

const createAsyncPkgPlugins = () => {
  if (!process.env.UNI_MP_FEATURE_ASYNC) {
    return []
  }

  const isProduction = process.env.NODE_ENV === 'production'
  let params = {}

  if (typeof process.env.UNI_MP_FEATURE_ASYNC === 'object') {
    params = process.env.UNI_MP_FEATURE_ASYNC
  }

  return [
    new UniMpModifyMiniCssExtractPlugin(),
    new UniMpJsonpScriptPlugin(),
    new UniMpRuntimeTemplatePlugin(),
    new UniMpAppJsonAsyncPackagePlugin({
      appendSubPackages: params.appendSubPackages || [],
      deleteComponents: params.deleteComponents || [],
      lazyCodeLoading: isProduction ? 'requiredComponents' : ''
    }),
    new UniMpAsyncComponentWebpackPlugin()
  ]
}

const updateAsyncSplitChunks = (webpackConfig) => {
  if (!process.env.UNI_MP_FEATURE_ASYNC) {
    return
  }

  let params = {}

  if (typeof process.env.UNI_MP_FEATURE_ASYNC === 'object') {
    params = process.env.UNI_MP_FEATURE_ASYNC
  }

  webpackConfig.optimization.splitChunks = require('./helper/split-chunks')(params.strictSplitChunks || false)
}

module.exports = {
  createAsyncPkgPlugins,
  updateAsyncSplitChunks
}
