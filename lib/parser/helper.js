
exports.findSubstr = function(haystack, needle, offset) {
    var found = 0
    var start = 0
    for(var i = offset;i<haystack.length;i++) {
        if(haystack[i] === needle[found]) {
            if(found === 0) {
                start = i
            }
            found++;
            if(found == needle.length) {
                return start
            }
        }
        else {
            found = 0
            start = 0
        }
    }
    return false
}

exports.find = function(haystack, needle, offset) {
    offset = offset || 0
    for(var i = offset;i<haystack.length;i++) {
        if(haystack[i] === needle) {
            return i
        }
    }
    return false
}

exports.toString = function(buffer) {
    var end = exports.find(buffer, 0x00)
    return buffer.slice(0x00, end).toString('utf-8')
}

exports.allZero = function(buffer) {
    for(var i=0;i<buffer.length;i++) {
        if(buffer[i] !== 0x00) return false
    }
    return true
}

exports.parseLeBo = function(buffer) {
    var value = 1
    var total = 0
    for(var i=0;i<buffer.length;i++) {
        total += buffer[i] * value
        value *= 256
    }
    return total
}
