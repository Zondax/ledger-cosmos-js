/********************************************************************************
 *   Ledger Node JS Tests
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
let assert = require('assert');
let expect = require('chai').expect;
let Q = require('q');

const TIMEOUT = 2;

browser = true;
comm = ledger.comm_u2f;

function runExample() {
    return comm.create_async(TIMEOUT, true).then(
        function (comm) {
            try {
                let dev = new ledger.App(comm);
                return dev.get_version().then(function (result) {
                    console.log(result);
                })
            }
            catch (e) {
                console.log(e)
            }
        });
}

module.exports = runExample;
