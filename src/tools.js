/********************************************************************************
 *   Ledger Node JS API
 *   (c) 2019 ZondaX GmbH
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
'use strict';

var crypto = require('crypto');
let Ripemd160 = require("ripemd160");
let bech32 = require("bech32");

function getBech32FromPK(hrp, pk) {
    if (pk.length !== 33) {
        throw new Error("expected compressed public key [31 bytes]");
    }
    const hash_sha256 = crypto.createHash('sha256').update(pk).digest();
    const hash_rip = new Ripemd160().update(hash_sha256).digest();
    return bech32.encode(hrp, bech32.toWords(hash_rip));
};


module.exports = {
    getBech32FromPK
};
