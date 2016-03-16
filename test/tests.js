/* global describe, it */
/* eslint no-unused-vars:0 */

import path from 'path';
import should from 'should';
import jsonStream from '../src/main';

describe('JSONStream', function() {

    this.timeout(10000);

    it('should be a function', () => {
        jsonStream.should.be.a.Function();
    });

    it('should return an object', () => {
        jsonStream().should.be.an.Object();
    });

    describe('the object', () => {
        it('should have a streamFromFile method', () => {
            jsonStream().streamFromFile.should.be.a.Function();
        });
        it('should have a parse method', () => {
            jsonStream().parse.should.be.a.Function();
        });
        it('should have a streamToFile method', () => {
            jsonStream().streamToFile.should.be.a.Function();
        });
        it('should have a encode method', () => {
            jsonStream().encode.should.be.a.Function();
        });
        it('should have a progress method', () => {
            jsonStream().progress.should.be.a.Function();
        });
        it('should have a done method', () => {
            jsonStream().done.should.be.a.Function();
        });
    });

    describe('streamFromFile', function() {
        const filePath = path.join('test', 'data', 'test.json');

        it('should throw an error if no file path passed in', () => {
            (() => jsonStream().streamFromFile)().should.throw();
        });

        it('should begin the streaming process & register a callback which is run when the streaming is finished', (done) => {
            jsonStream()
                .streamFromFile(filePath)
                .done(() => {
                    done();
                });
        });
        it('should pass any error out as the first parameter of the callback', (done) =>{
            jsonStream()
                .streamFromFile('badpath')
                .done(e => {
                    if(e) {
                        done();
                    }
                });
        });
        it('should pass in the parsed data as the second parameter of the callback', (done) => {
            jsonStream()
                .streamFromFile(filePath)
                .done((e, data) => {
                    if(data) {
                        done();
                    }
                });
        });

    });

    describe('streamToFile', function() {

        it('should JSON encode an Object and stream to a file', (done) => {

            const filePath = path.join('test', 'data', 'obj-output.json');

            const data = {
                name: 'Ryan',
                gender: 'male',
                favoriteBooks: [
                    {title: 'Ethics of Liberty', author: 'Murray Rothbard'},
                    {title: 'Bible', author: 'God'}
                ],
                other: {
                    some: 'value',
                    another: 'thing',
                    myArr: [12, 13, 14, 15]
                },
                last: 'str'
            };

            jsonStream()
                .streamToFile(filePath, data)
                .done((e, res) => {
                    if(e) {
                        console.error(e);
                    }
                    done();
                });
        });

        it('should JSON encode an Array and stream to a file', (done) => {

            const filePath = path.join('test', 'data', 'arr-output.json');

            const data = [
                'something',
                'else',
                431432421,
                46432432,
                {name: 'Ryan', age: 31},
                ['Ryan', 'Hannah']
            ];

            jsonStream()
                .streamToFile(filePath, data)
                .done((e, res) => {
                    if(e) {
                        console.error(e);
                    }
                    done();
                });
        });

        it('should JSON encode other and stream to a file', (done) => {

            const filePath = path.join('test', 'data', 'other-output.json');

            const data = 'Hello! My name is Ryan.';

            jsonStream()
                .streamToFile(filePath, data)
                .done((e, res) => {
                    if(e) {
                        console.error(e);
                    }
                    done();
                });
        });

    });









    // describe('the progress method', () => {
    //     it('should register a callback which is run on streaming progress', done => {
    //
    //         let wasRun = false;
    //
    //         ReadJSONStream(filePath)
    //             .progress(p => {
    //                 if(p) {
    //                     wasRun = true;
    //                 }
    //             })
    //             .done(() => {});
    //
    //         setTimeout(() => {
    //             if(wasRun) {
    //                 done();
    //             }
    //         }, 200);
    //     });
    // });

    // describe('the done method', () => {
    //     it('should begin the streaming process & register a callback which is run when the streaming is finished', (done) => {
    //         ReadJSONStream(filePath)
    //             .done(() => {
    //                 done();
    //             });
    //     });
    //     it('should pass any error out as the first parameter of the callback', (done) =>{
    //         ReadJSONStream('badpath')
    //             .done(e => {
    //                 if(e) {
    //                     done();
    //                 }
    //             });
    //     });
    //     it('should pass in the parsed data as the second parameter of the callback', (done) => {
    //         ReadJSONStream(filePath)
    //             .done((e, data) => {
    //                 if(data) {
    //                     done();
    //                 }
    //             });
    //     });
    // });

});
