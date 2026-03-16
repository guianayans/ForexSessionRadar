const { RADAR_MAP } = require('../types/constants');

function getRadarForContext(contextKey) {
  return RADAR_MAP[contextKey] || RADAR_MAP.closed;
}

module.exports = {
  getRadarForContext
};
