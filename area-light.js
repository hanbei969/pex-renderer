const Signal = require('signals')
const Mat4 = require('pex-math/Mat4')
const AreaLightsData = require('./local_modules/area-light-data')

function AreaLight (opts) {
  const ctx = opts.ctx

  this.type = 'AreaLight'
  this.changed = new Signal()
  this.color = [1, 1, 1, 1]
  this.intensity = 1

  this.set(opts)

  // TODO: area light textures
  if (!AreaLight.areaLightTextures) {
    AreaLight.ltc_mat_texture = ctx.texture2D({ data: AreaLightsData.mat, width: 64, height: 64, format: ctx.PixelFormat.RGBA32F })
    AreaLight.ltc_mag_texture = ctx.texture2D({ data: AreaLightsData.mag, width: 64, height: 64, format: ctx.PixelFormat.R32F })
    AreaLight.areaLightTextures = true
  }
  this.ltc_mat_texture = AreaLight.ltc_mat_texture
  this.ltc_mag_texture = AreaLight.ltc_mag_texture
}

AreaLight.prototype.init = function (entity) {
  this.entity = entity
}

AreaLight.prototype.set = function (opts) {
  Object.assign(this, opts)
  Object.keys(opts).forEach((prop) => this.changed.dispatch(prop))

  if (opts.color !== undefined || opts.intensity !== undefined) {
    this.color[3] = this.intensity;
  }
}

module.exports = function (opts) {
  return new AreaLight(opts)
}