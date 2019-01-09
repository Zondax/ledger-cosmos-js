/********************************************************************************
 *   Ledger Node JS App Tests
 *   (c) 2018 ZondaX GmbH
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 ********************************************************************************/

var assert = require('assert');
var expect = require('chai').expect;
var Q = require('q');

ledger = require('../src');
comm = ledger.comm_node;
browser = false;

const TIMEOUT = 1000;
const LONG_TIMEOUT = 15000;
const EXPECTED_MAJOR = 1;
const EXPECTED_MINOR = 0;
const EXPECTED_PATCH = 0;

describe('get_version', function () {
    let response;
    // call API
    before(function () {
        return comm.create_async(TIMEOUT, true).then(
            function (comm) {
                let app = new ledger.App(comm);
                return app.get_version().then(function (result) {
                    response = result;
                    console.log(response);
                });
            });
    });
    it('return_code is 0x9000', function () {
        expect(response.return_code).to.equal(0x9000);
    });
    it('has property test_mode', function () {
        expect(response).to.have.a.property('test_mode');
    });
    it('has property major', function () {
        expect(response).to.have.a.property('major');
    });
    it('has property minor', function () {
        expect(response).to.have.a.property('minor');
    });
    it('has property patch', function () {
        expect(response).to.have.a.property('patch');
    });
    it('test_mode is enabled', function () {
        expect(response.test_mode).to.be.false;
    });
    it('app has matching version', function () {
        expect(response.major).to.equal(EXPECTED_MAJOR);
        expect(response.minor).to.equal(EXPECTED_MINOR);
        expect(response.patch).to.equal(EXPECTED_PATCH);
    });
});

describe('get_pk', function () {
    let response;
    // call API
    before(function () {
        return comm.create_async(TIMEOUT, true).then(
            function (comm) {
                let app = new ledger.App(comm);

                let path = [44, 118, 0, 0, 0];           // Derivation path. First 3 items are automatically hardened!
                return app.publicKey(path).then(function (result) {
                    response = result;
                    console.log(response);
                });

            });
    });
    it('return_code is 0x9000', function () {
        expect(response.return_code).to.equal(0x9000);
    });
    it('has property pk', function () {
        expect(response).to.have.a.property('pk');
    });
});
