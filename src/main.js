import fs from 'fs';
import path from 'path';
import oboe from 'oboe';
import progress from 'progress-stream';
import _ from 'lodash';

const recLoop = (dataObj, func, onDone) => {

    const objLoop = (obj, func, onDone, i = 0, keysArr) => {
        keysArr = keysArr || Object.keys(obj);
        const key = keysArr[i];
        func(obj[key], key, i);
        return (i === keysArr.length - 1) ? onDone() : objLoop(obj, func, onDone, i + 1, keysArr);
    };
    const arrLoop = (arr, func, onDone, i = 0) => {
        func(arr[i], i);
        return (i === arr.length - 1) ? onDone() : arrLoop(arr, func, onDone, i + 1);
    };

    if(_.isPlainObject(dataObj)) {
        return objLoop(dataObj, func, onDone);
    } else if(_.isArray(dataObj)) {
        return arrLoop(dataObj, func, onDone);
    } else {
        console.error(new Error('The data object passed into recLoop must be an Object or Array.'));
    }
};

const asyncRecLoop = (dataObj, func, onDone) => {

    const objLoop = (obj, func, onDone, i = 0, keysArr) => {
        keysArr = keysArr || Object.keys(obj);
        const key = keysArr[i];
        func(obj[key], key, i).then(
            () => {
                (i === keysArr.length - 1) ? onDone() : objLoop(obj, func, onDone, i + 1, keysArr);
            },
            e => console.error(e)
        );
    };
    const arrLoop = (arr, func, onDone, i = 0) => {
        func(arr[i], i).then(
            () => {
                (i === arr.length - 1) ? onDone() : arrLoop(arr, func, onDone, i + 1);
            },
            e => console.error(e)
        );
    };

    if(_.isPlainObject(dataObj)) {
        return objLoop(dataObj, func, onDone);
    } else if(_.isArray(dataObj)) {
        return arrLoop(dataObj, func, onDone);
    } else {
        console.error(new Error('The data object passed into recLoop must be an Object or Array.'));
    }
};

const JSONStream = function() {

    let progressInterval = 100;

    let filePath;

    let onProgress;

    let runFunc;

    const __streamFromFile = () => {
        return new Promise((resolve, reject) => {

            let stat;
            try {
                stat = fs.statSync(filePath);
            } catch(e) {
                reject(e);
            }

            let stream;

            if(onProgress) {
                const prog = progress({
                    length: stat.size,
                    time: progressInterval
                }).on('progress', p => {
                    onProgress(p.percentage.toFixed());
                });

                stream = fs.createReadStream(filePath).pipe(prog);
            } else{
                stream = fs.createReadStream(filePath);
            }

            oboe(stream)
                .on('done', d => {
                    setTimeout(() => {
                        resolve(d);
                    }, 0);
                })
                .on('fail', e => {
                    reject(e);
                });

        });
    };

    let streamToFileData;
    let streamToFilePath;
    let outerDepth;

    const recStringify = (item, recDepth = 0, depth = 1) => {
        if(recDepth === 0 || depth <= recDepth) {
            if(_.isArray(item)) {
                return '[' + item.map(d => recStringify(d, recDepth, depth + 1)).join(',') + ']';
            } else if(_.isPlainObject(item)) {
                return '{' + Object.keys(item).map(k => `${JSON.stringify(k)}:` + recStringify(item[k], recDepth, depth + 1)).join(',') + '}';
            } else {
                return JSON.stringify(item);
            }
        } else {
            return JSON.stringify(item);
        }
    };

    const __streamToFile = () => {
        return new Promise((resolve, reject) => {

            let stream = fs.createWriteStream(path.join(streamToFilePath));

            stream.on('finish', () => resolve());

            if(_.isPlainObject(streamToFileData)) {
                const totalLength = Object.keys(streamToFileData).length;
                stream.write('{', () => {
                    asyncRecLoop(
                        streamToFileData,
                        (val, key, idx) => {
                            return new Promise(resolve => {
                                if(onProgress) {
                                    onProgress((((idx + 1)/totalLength)*100).toFixed());
                                }
                                if(idx === totalLength - 1) {
                                    stream.write(`"${key}":${recStringify(val, outerDepth)}`, () => {
                                        resolve();
                                    });
                                } else {
                                    stream.write(`"${key}":${recStringify(val, outerDepth)},`, () => {
                                        resolve();
                                    });
                                }
                            });
                        },
                        () => {
                            stream.write('}', () => {
                                stream.end();
                            });
                        }
                    );
                });
            } else if(_.isArray(streamToFileData)) {
                const totalLength = streamToFileData.length;
                stream.write('[', () => {
                    asyncRecLoop(
                        streamToFileData,
                        (val, idx) => {
                            return new Promise(resolve => {
                                if(onProgress) {
                                    onProgress((((idx + 1)/totalLength)*100).toFixed());
                                }
                                if(idx === totalLength - 1) {
                                    stream.write(`${recStringify(val, outerDepth)}`, () => {
                                        resolve();
                                    });
                                } else {
                                    stream.write(`${recStringify(val, outerDepth)},`, () => {
                                        resolve();
                                    });
                                }
                            });
                        },
                        () => {
                            stream.write(']', () => {
                                stream.end();
                            });
                        }
                    );
                });
            } else {
                stream.write(JSON.stringify(streamToFileData), () => {
                    stream.end();
                });
            }


        });

    };

    let origData;
    const __encode = () => {
        return new Promise((resolve, reject) => {

            let dataArr = [];

            if(_.isPlainObject(origData)) {
                const totalLength = Object.keys(origData).length;

                dataArr.push('{');

                recLoop(
                    origData,
                    (val, key, idx) => {
                        if(onProgress) {
                            onProgress((((idx + 1)/totalLength)*100).toFixed());
                        }
                        if(idx === totalLength - 1) {
                            dataArr.push(`"${key}":${recStringify(val, outerDepth)}`);
                        } else {
                            dataArr.push(`"${key}":${recStringify(val, outerDepth)},`);
                        }
                    },
                    () => {
                        dataArr.push('}');
                        resolve(dataArr.join(''));
                    }
                );

            } else if(_.isArray(origData)) {
                const totalLength = origData.length;
                dataArr.push('[');
                recLoop(
                    origData,
                    (val, idx) => {
                        if(onProgress) {
                            onProgress((((idx + 1)/totalLength)*100).toFixed());
                        }
                        if(idx === totalLength - 1) {
                            dataArr.push(`${recStringify(val, outerDepth)}`);

                        } else {
                            dataArr.push(`${recStringify(val, outerDepth)},`);
                        }
                    },
                    () => {
                        dataArr.push(']');
                        resolve(dataArr.join(''));
                    }
                );
            } else {
                resolve(JSON.stringify(origData));
            }

        });
    };

    return Object.create({
        streamFromFile(origFilePath) {
            if(!origFilePath) {
                throw new Error('You must pass in a file path string');
            }
            filePath = path.normalize(origFilePath);
            runFunc = __streamFromFile;
            return this;
        },
        streamToFile(origFilePath, data, options = {}) {
            if(!origFilePath) {
                throw new Error('You must pass in a file path string');
            }
            streamToFilePath = path.normalize(origFilePath);
            streamToFileData = data;
            outerDepth = options.depth;
            runFunc = __streamToFile;
            return this;
        },
        encode(data, options = {}) {
            if(!data && data !== 0) {
                return '';
            }
            origData = data;
            outerDepth = options.depth;
            runFunc = __encode;
            return this;
        },
        progress(callback, interval) {

            if(interval && typeof interval === 'number') {
                progressInterval = interval;
            }

            if(!callback) {
                console.error('You must pass in a callback function to the progress method.');
            } else {
                onProgress = callback;
            }
            return this;
        },
        done(callback) {
            if(!callback) {
                console.error('You must pass in a callback function to the done method.');
                return;
            }

            runFunc().then(
                res => {
                    callback(null, res);
                },
                err => {
                    callback(err);
                }
            );
        }
    });

};

export default JSONStream;
