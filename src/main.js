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

    // __parse = () => {
    //     return new Promise((resolve, reject) => {
    //
    //         let stream;
    //
    //         // if(onProgress) {
    //         //     const prog = progress({
    //         //         length: stat.size,
    //         //         time: progressInterval
    //         //     }).on('progress', p => {
    //         //         onProgress(p.percentage.toFixed());
    //         //     });
    //         //
    //         //     stream = fs.createReadStream(filePath).pipe(prog);
    //         // } else{
    //         //     stream = fs.createReadStream(filePath);
    //         // }
    //
    //         stream =
    //
    //         oboe(stream)
    //             .on('done', d => {
    //                 setTimeout(() => {
    //                     resolve(d);
    //                 }, 0);
    //             })
    //             .on('fail', e => {
    //                 reject(e);
    //             });
    //     });
    // };

    let streamToFileData;
    let streamToFilePath;
    let outerDepth;

    const recStringify = (item, recDepth = 0, depth = 1) => {
        // console.log(`item is ${item}`);
        if(recDepth === 0 || depth <= recDepth) {
            if(_.isArray(item)) {
                return '[' + item.map(d => recStringify(d, recDepth, depth + 1)).join(',') + ']';
            } else if(_.isPlainObject(item)) {
                return '{' + Object.keys(item).map(k => `"${k}":` + recStringify(item[k], recDepth, depth + 1)).join(',') + '}';
            } else {
                return JSON.stringify(item);
            }
        } else {
            return JSON.stringify(item);
        }
    };

    const __streamToFile = () => {
        return new Promise((resolve, reject) => {

            const stream = fs.createWriteStream(path.join(streamToFilePath));
            stream.on('finish', () => resolve());

            if(_.isPlainObject(streamToFileData)) {
                const totalLength = Object.keys(streamToFileData).length;
                stream.write('{');
                recLoop(
                    streamToFileData,
                    (val, key, idx) => {
                        if(idx === totalLength - 1) {
                            stream.write(`"${key}":${recStringify(val, outerDepth)}`);
                        } else {
                            stream.write(`"${key}":${recStringify(val, outerDepth)},`);
                        }
                    },
                    () => {
                        stream.write('}');
                        stream.end();
                    }
                );
            } else if(_.isArray(streamToFileData)) {
                const totalLength = streamToFileData.length;
                stream.write('[');
                recLoop(
                    streamToFileData,
                    (val, idx) => {
                        if(idx === totalLength - 1) {
                            stream.write(`${recStringify(val, outerDepth)}`);
                        } else {
                            stream.write(`${recStringify(val, outerDepth)},`);
                        }
                    },
                    () => {
                        stream.write(']');
                        stream.end();
                    }
                );
            } else {
                stream.write(JSON.stringify(streamToFileData));
                stream.end();
            }


        });

    };

    let origData;

    // const __encode = () => {
    //     return new Promise((resolve, reject) => {
    //
    //         let jsonData = [];
    //
    //         if(_.isPlainObject(origData)) {
    //
    //             const totalLength = Object.keys(origData).length;
    //             jsonData.push('{');
    //             recLoop(
    //                 origData,
    //                 (val, key, idx) => {
    //                     if(idx === totalLength - 1) {
    //                         jsonData.push(`"${key}":${recStringify(val, outerDepth)}`);
    //                     } else {
    //                         jsonData.push(`"${key}":${recStringify(val, outerDepth)},`);
    //                     }
    //                 },
    //                 () => {
    //                     jsonData.push('}');
    //                     resolve(jsonData.join(''));
    //                 }
    //             );
    //
    //         } else if(_.isArray(origData)) {
    //
    //             const totalLength = origData.length;
    //             jsonData.push('[');
    //             recLoop(
    //                 origData,
    //                 (val, idx) => {
    //                     if(idx === totalLength - 1) {
    //                         jsonData.push(`${recStringify(val, outerDepth)}`);
    //                     } else {
    //                         jsonData.push(`${recStringify(val, outerDepth)},`);
    //                     }
    //                 },
    //                 () => {
    //                     jsonData.push(']');
    //                     resolve(jsonData.join(''));
    //                 }
    //             );
    //
    //         } else {
    //             resolve(JSON.stringify(origData));
    //         }
    //     });
    // };

    return Object.create({
        streamFromFile(origFilePath) {
            if(!origFilePath) {
                throw new Error('You must pass in a file path string');
            }
            filePath = path.normalize(origFilePath);
            runFunc = __streamFromFile;
            return this;
        },
        // parse() {
        //
        // },
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
        // encode(data, options = {}) {
        //     outerDepth = options.depth;
        //     origData = data;
        //     runFunc = __encode;
        //     return this;
        // },
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
