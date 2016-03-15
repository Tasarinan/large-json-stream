import fs from 'fs';
import path from 'path';
import oboe from 'oboe';
import progress from 'progress-stream';

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

    return {
        streamFromFile(origFilePath) {
            if(!origFilePath) {
                throw new Error('You must pass in a file path string');
            }
            filePath = path.normalize(origFilePath);
            runFunc = __streamFromFile;
            return this;
        },
        parse() {

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
