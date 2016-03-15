import fs from 'fs';
import path from 'path';
import oboe from 'oboe';
import progress from 'progress-stream';
import _ from 'lodash';

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

    const __streamToFile = () => {
        return new Promise((resolve, reject) => {

            const stream = fs.createWriteStream(path.join(streamToFilePath));

            const objLoop = (obj, func, done, i = 0, keysArr) => {
                keysArr = keysArr || Object.keys(obj);
                const key = keysArr[i];
                func(key, obj[key], keysArr.length - 1 - i);
                return (i === keysArr.length - 1) ? done() : objLoop(obj, func, done, i + 1, keysArr);
            };

            stream.write('{');

            const recStringify = (item, recDepth = 0, depth = 1) => {
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

            objLoop(
                streamToFileData,
                (key, val, remaining) => {
                    if(remaining > 0) {
                        stream.write(`"${key}":${recStringify(val, outerDepth)},`);
                    } else {
                        stream.write(`"${key}":${recStringify(val, outerDepth)}`);
                    }
                },
                () => {
                    stream.write('}');
                    resolve();
                }
            );

        });

    };

    return {
        streamFromFile(origFilePath) {
            if(!origFilePath) {
                throw new Error('You must pass in a file path string');
            }
            filePath = path.normalize(origFilePath);
            runFunc = __streamFromFile;
            return this;
        },
        parse(filePath, data, options = {}) {
            streamToFilePath = path.normalize(filePath);
            outerDepth = options.depth;
            runFunc = __streamToFile;
            return this;
        },
        streamToFile() {

        },
        encode() {

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
    };

};

export default JSONStream;
