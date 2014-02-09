module.exports = {
    Observer: require('./lib/observer'),
    Game:     require('./lib/game'),
    Chunk:    require('./lib/chunk'),
    Keyframe: require('./lib/keyframe'),
    parser: {
        Keyframe: require('./lib/parser/keyframe')
    }
}
