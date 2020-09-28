import { build } from './build'
import config from './config'
import prepareCache from './prepare-cache'

const version = 3;

// Docs: https://github.com/zeit/now/blob/master/DEVELOPING_A_RUNTIME.md
module.exports = {
  version,
  build,
  config,
  prepareCache
}
