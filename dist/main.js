'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _oboe = require('oboe');

var _oboe2 = _interopRequireDefault(_oboe);

var _progressStream = require('progress-stream');

var _progressStream2 = _interopRequireDefault(_progressStream);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var recLoop = function recLoop(dataObj, func, onDone) {

    var objLoop = function objLoop(obj, func, onDone) {
        var i = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];
        var keysArr = arguments[4];

        keysArr = keysArr || Object.keys(obj);
        var key = keysArr[i];
        func(obj[key], key, i);
        return i === keysArr.length - 1 ? onDone() : objLoop(obj, func, onDone, i + 1, keysArr);
    };
    var arrLoop = function arrLoop(arr, func, onDone) {
        var i = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

        func(arr[i], i);
        return i === arr.length - 1 ? onDone() : arrLoop(arr, func, onDone, i + 1);
    };

    if (_lodash2.default.isPlainObject(dataObj)) {
        return objLoop(dataObj, func, onDone);
    } else if (_lodash2.default.isArray(dataObj)) {
        return arrLoop(dataObj, func, onDone);
    } else {
        console.error(new Error('The data object passed into recLoop must be an Object or Array.'));
    }
};

var asyncRecLoop = function asyncRecLoop(dataObj, func, onDone) {

    var objLoop = function objLoop(obj, func, onDone) {
        var i = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];
        var keysArr = arguments[4];

        keysArr = keysArr || Object.keys(obj);
        var key = keysArr[i];
        func(obj[key], key, i).then(function () {
            i === keysArr.length - 1 ? onDone() : objLoop(obj, func, onDone, i + 1, keysArr);
        }, function (e) {
            return console.error(e);
        });
    };
    var arrLoop = function arrLoop(arr, func, onDone) {
        var i = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

        func(arr[i], i).then(function () {
            i === arr.length - 1 ? onDone() : arrLoop(arr, func, onDone, i + 1);
        }, function (e) {
            return console.error(e);
        });
    };

    if (_lodash2.default.isPlainObject(dataObj)) {
        return objLoop(dataObj, func, onDone);
    } else if (_lodash2.default.isArray(dataObj)) {
        return arrLoop(dataObj, func, onDone);
    } else {
        console.error(new Error('The data object passed into recLoop must be an Object or Array.'));
    }
};

var JSONStream = function JSONStream() {

    var progressInterval = 100;

    var filePath = undefined;

    var onProgress = undefined;

    var runFunc = undefined;

    var __streamFromFile = function __streamFromFile() {
        return new Promise(function (resolve, reject) {

            var stat = undefined;
            try {
                stat = _fs2.default.statSync(filePath);
            } catch (e) {
                reject(e);
            }

            var stream = undefined;

            if (onProgress) {
                var prog = (0, _progressStream2.default)({
                    length: stat.size,
                    time: progressInterval
                }).on('progress', function (p) {
                    onProgress(p.percentage.toFixed());
                });

                stream = _fs2.default.createReadStream(filePath).pipe(prog);
            } else {
                stream = _fs2.default.createReadStream(filePath);
            }

            (0, _oboe2.default)(stream).on('done', function (d) {
                setTimeout(function () {
                    resolve(d);
                }, 0);
            }).on('fail', function (e) {
                reject(e);
            });
        });
    };

    var streamToFileData = undefined;
    var streamToFilePath = undefined;
    var outerDepth = undefined;

    var recStringify = function recStringify(item) {
        var recDepth = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
        var depth = arguments.length <= 2 || arguments[2] === undefined ? 1 : arguments[2];

        if (recDepth === 0 || depth <= recDepth) {
            if (_lodash2.default.isArray(item)) {
                return '[' + item.map(function (d) {
                    return recStringify(d, recDepth, depth + 1);
                }).join(',') + ']';
            } else if (_lodash2.default.isPlainObject(item)) {
                return '{' + Object.keys(item).map(function (k) {
                    return JSON.stringify(k) + ':' + recStringify(item[k], recDepth, depth + 1);
                }).join(',') + '}';
            } else {
                return JSON.stringify(item);
            }
        } else {
            return JSON.stringify(item);
        }
    };

    var __streamToFile = function __streamToFile() {
        return new Promise(function (resolve, reject) {

            var stream = _fs2.default.createWriteStream(_path2.default.join(streamToFilePath));

            stream.on('finish', function () {
                return resolve();
            });

            if (_lodash2.default.isPlainObject(streamToFileData)) {
                (function () {
                    var totalLength = Object.keys(streamToFileData).length;
                    stream.write('{', function () {
                        asyncRecLoop(streamToFileData, function (val, key, idx) {
                            return new Promise(function (resolve) {
                                if (onProgress) {
                                    onProgress(((idx + 1) / totalLength * 100).toFixed());
                                }
                                if (idx === totalLength - 1) {
                                    stream.write('"' + key + '":' + recStringify(val, outerDepth), function () {
                                        resolve();
                                    });
                                } else {
                                    stream.write('"' + key + '":' + recStringify(val, outerDepth) + ',', function () {
                                        resolve();
                                    });
                                }
                            });
                        }, function () {
                            stream.write('}', function () {
                                stream.end();
                            });
                        });
                    });
                })();
            } else if (_lodash2.default.isArray(streamToFileData)) {
                (function () {
                    var totalLength = streamToFileData.length;
                    stream.write('[', function () {
                        asyncRecLoop(streamToFileData, function (val, idx) {
                            return new Promise(function (resolve) {
                                if (onProgress) {
                                    onProgress(((idx + 1) / totalLength * 100).toFixed());
                                }
                                if (idx === totalLength - 1) {
                                    stream.write('' + recStringify(val, outerDepth), function () {
                                        resolve();
                                    });
                                } else {
                                    stream.write(recStringify(val, outerDepth) + ',', function () {
                                        resolve();
                                    });
                                }
                            });
                        }, function () {
                            stream.write(']', function () {
                                stream.end();
                            });
                        });
                    });
                })();
            } else {
                stream.write(JSON.stringify(streamToFileData), function () {
                    stream.end();
                });
            }
        });
    };

    var origData = undefined;
    var __encode = function __encode() {
        return new Promise(function (resolve, reject) {

            var dataArr = [];

            if (_lodash2.default.isPlainObject(origData)) {
                (function () {
                    var totalLength = Object.keys(origData).length;

                    dataArr.push('{');

                    recLoop(origData, function (val, key, idx) {
                        if (onProgress) {
                            onProgress(((idx + 1) / totalLength * 100).toFixed());
                        }
                        if (idx === totalLength - 1) {
                            dataArr.push('"' + key + '":' + recStringify(val, outerDepth));
                        } else {
                            dataArr.push('"' + key + '":' + recStringify(val, outerDepth) + ',');
                        }
                    }, function () {
                        dataArr.push('}');
                        resolve(dataArr.join(''));
                    });
                })();
            } else if (_lodash2.default.isArray(origData)) {
                (function () {
                    var totalLength = origData.length;
                    dataArr.push('[');
                    recLoop(origData, function (val, idx) {
                        if (onProgress) {
                            onProgress(((idx + 1) / totalLength * 100).toFixed());
                        }
                        if (idx === totalLength - 1) {
                            dataArr.push('' + recStringify(val, outerDepth));
                        } else {
                            dataArr.push(recStringify(val, outerDepth) + ',');
                        }
                    }, function () {
                        dataArr.push(']');
                        resolve(dataArr.join(''));
                    });
                })();
            } else {
                resolve(JSON.stringify(origData));
            }
        });
    };

    return Object.create({
        streamFromFile: function streamFromFile(origFilePath) {
            if (!origFilePath) {
                throw new Error('You must pass in a file path string');
            }
            filePath = _path2.default.normalize(origFilePath);
            runFunc = __streamFromFile;
            return this;
        },
        streamToFile: function streamToFile(origFilePath, data) {
            var options = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

            if (!origFilePath) {
                throw new Error('You must pass in a file path string');
            }
            streamToFilePath = _path2.default.normalize(origFilePath);
            streamToFileData = data;
            outerDepth = options.depth;
            runFunc = __streamToFile;
            return this;
        },
        encode: function encode(data) {
            var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

            if (!data && data !== 0) {
                return '';
            }
            origData = data;
            outerDepth = options.depth;
            runFunc = __encode;
            return this;
        },
        progress: function progress(callback, interval) {

            if (interval && typeof interval === 'number') {
                progressInterval = interval;
            }

            if (!callback) {
                console.error('You must pass in a callback function to the progress method.');
            } else {
                onProgress = callback;
            }
            return this;
        },
        done: function done(callback) {
            if (!callback) {
                console.error('You must pass in a callback function to the done method.');
                return;
            }

            runFunc().then(function (res) {
                callback(null, res);
            }, function (err) {
                callback(err);
            });
        }
    });
};

exports.default = JSONStream;