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

var expect = require('chai').expect;
const secp256k1 = require('secp256k1/elliptic');
const crypto = require('crypto');

ledger = require('../src');
comm = ledger.comm_node;
browser = false;

const Timeout = 1000;
const TimeoutLong = 45000;
const ExpectedVersionMajor = 1;
const ExpectedVersionMinor = 5;
const ExpectedVersionPatch = 0;

describe('get_version', function () {
    let response;
// call API
    before(function () {
        return comm.create_async(Timeout, true).then(
            function (comm) {
                let app = new ledger.App(comm);
                return app.get_version().then(function (result) {
                    response = result;
                    console.log(response);
                });
            });
    });
    it('return_code is 0x9000', function () {
        console.log("Error code 0x%s: %s ", response.return_code.toString(16), response.error_message);
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
    it('test_mode is disabled', function () {
        expect(response.test_mode).to.be.false;
    });
    it('app has matching version', function () {
        expect(response.major).to.equal(ExpectedVersionMajor);
        expect(response.minor).to.equal(ExpectedVersionMinor);
        expect(response.patch).to.equal(ExpectedVersionPatch);
    });
});

describe('get_pk', function () {
    let response;
// call API
    before(function () {
        this.timeout(TimeoutLong);
        return comm.create_async(TimeoutLong, true).then(
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
    it('has no errors', function () {
        expect(response.error_message).to.equal(`No errors`);
    });
    it('has 65 bytes', function () {
        expect(response.pk).to.have.lengthOf(65);
    });
    it('has property compressed_pk', function () {
        expect(response).to.have.a.property('compressed_pk');
    });
    it('compressed_pk is 33 bytes', function () {
        expect(response.compressed_pk).to.have.lengthOf(33);
    });
    it('pk and compressed_pk match', function () {
        let expected_compressed_pk = secp256k1.publicKeyConvert(response.pk, true);
        expect(response.compressed_pk.toString('hex')).to.equal(expected_compressed_pk.toString('hex'));
    });
});

describe('create ledger object', function () {
    exception_raised = false;
    try {
        let app = new ledger.App(null);
    } catch (e) {
        it('raises an exception', function () {
            expect(e.message).to.equal("comm object was not set or invalid");
        });
        exception_raised = true;
    }
    it('raises an exception', function () {
        expect(exception_raised).to.be.true;
    });
});

describe('compress_pk', function () {
    let response;

// Use a fake comm object
    let comm = {
        'setScrambleKey': function (dummy) {
        }
    };

    let app = new ledger.App(comm);

    let some_pk = Buffer.from([4, 228, 114, 95, 12, 248, 233, 150, 121, 120, 108, 215, 35, 230, 147, 188,
        25, 67, 15, 209, 28, 190, 133, 163, 176, 205, 91, 131, 112, 190, 111, 120, 229, 35, 85, 207,
        82, 109, 65, 22, 237, 67, 55, 19, 171, 79, 225, 208, 53, 24, 254, 23, 97, 58, 0, 18, 18, 212,
        152, 188, 87, 18, 47, 249, 17]);

    compressed_pk = app.compressPublicKey(some_pk);

    it('decompressed_pk is 65 bytes', function () {
        expect(some_pk.length).to.equal(65);
    });

    it('compressed_pk is 33 bytes', function () {
        expect(compressed_pk.length).to.equal(33);
    });

    it('compressed_pk[0] is 33 bytes', function () {
        expect(compressed_pk[0]).to.equal(3);
    });
    it('pk and compressed_pk match', function () {
        let expected_compressed_pk = secp256k1.publicKeyConvert(some_pk, true);
        expect(compressed_pk.toString('hex')).to.equal(expected_compressed_pk.toString('hex'));
    });
});

describe('sign_get_chunks', function () {
    let chunks;

// call API
    before(function () {
        return comm.create_async(Timeout, true).then(
            function (comm) {
                let app = new ledger.App(comm);
                let path = [44, 118, 0, 0, 0];           // Derivation path. First 3 items are automatically hardened!
                let message = `{"account_number": 1,"chain_id": "some_chain","fee": {"amount": [{"amount": 10, "denom": "DEN"}],"gas": 5},"memo": "MEMO","msgs": ["SOMETHING"],"sequence": 3}`;

                chunks = app.sign_get_chunks(path, message);
            });
    });
    it('number of chunks 2', function () {
        expect(chunks.length).to.equal(2);
    });
    it('chunk 1 is derivation path', function () {
        expect(chunks[0].length).to.equal(1 + 5 * 4);
    });
    it('chunk 2 is message', function () {
        expect(chunks[1].length).to.equal(158);
    });
});

describe('sign_get_chunks_big', function () {
    let chunks;

// call API
    before(function () {
        return comm.create_async(Timeout, true).then(
            function (comm) {
                let app = new ledger.App(comm);
                let path = [44, 118, 0, 0, 0];           // Derivation path. First 3 items are automatically hardened!
                let message = Buffer.alloc(1234);

                chunks = app.sign_get_chunks(path, message);
            });
    });
    it('number of chunks 6', function () {
        expect(chunks.length).to.equal(6);
    });
    it('chunk 1 is derivation path', function () {
        expect(chunks[0].length).to.equal(1 + 5 * 4);
    });
    it('chunk 2 is message', function () {
        expect(chunks[1].length).to.equal(250);
    });
    it('chunk 3 is message', function () {
        expect(chunks[2].length).to.equal(250);
    });
    it('chunk 4 is message', function () {
        expect(chunks[3].length).to.equal(250);
    });
    it('chunk 5 is message', function () {
        expect(chunks[4].length).to.equal(250);
    });
    it('chunk 6 is message', function () {
        expect(chunks[5].length).to.equal(234);
    });
});

describe('sign_send_chunk', function () {
    let response;

// call API
    before(function () {
        this.timeout(TimeoutLong);
        return comm.create_async(Timeout, true).then(
            function (comm) {
                let app = new ledger.App(comm);
                let path = [44, 118, 0, 0, 0];           // Derivation path. First 3 items are automatically hardened!
                let message = `{"account_number": 1,"chain_id": "some_chain","fee": {"amount": [{"amount": 10, "denom": "DEN"}],"gas": 5},"memo": "MEMO","msgs": ["SOMETHING"],"sequence": 3}`;
                let chunks = app.sign_get_chunks(path, message);

                return app.sign_send_chunk(1, 2, chunks[0]).then(function (result) {
                    response = result;
                    console.log(response);
                });
            });
    });

    it('return_code is 0x9000', function () {
        console.log("Error code 0x%s: %s ", response.return_code.toString(16), response.error_message);
        expect(response.return_code).to.equal(0x9000);
    });
});

describe('sign', function () {
    let response;
    let message = `{"account_number":1,"chain_id":"some_chain","fee":{"amount":[{"amount":10,"denom":"DEN"}],"gas":5},"memo":"MEMO","msgs":["SOMETHING"],"sequence":3}`;

// call API
    before(function () {
        this.timeout(TimeoutLong);
        return comm.create_async(TimeoutLong, true).then(
            async function (comm) {
                let app = new ledger.App(comm);
                let path = [44, 118, 0, 0, 0];           // Derivation path. First 3 items are automatically hardened!

                response = await app.sign(path, message);
                console.log(response);
            });
    });
    it('return_code is 0x9000', function () {
        console.log("Error code 0x%s: %s ", response.return_code.toString(16), response.error_message);
        expect(response.return_code).to.equal(0x9000);
    });
    it('has no errors', function () {
        expect(response.error_message).to.equal(`No errors`);
    });
    it('signature has 71 bytes', function () {
        expect(response.signature).to.have.lengthOf(70);
    });
});

describe('sign_and_verify', function () {
    let response_sign;
    let response_pk;
    let message = `{"account_number":1,"chain_id":"some_chain","fee":{"amount":[{"amount":10,"denom":"DEN"}],"gas":5},"memo":"MEMO","msgs":["SOMETHING"],"sequence":3}`;

// call API
    before(function () {
        this.timeout(TimeoutLong);
        return comm.create_async(TimeoutLong, true).then(
            async function (comm) {
                let app = new ledger.App(comm);
                let path = [44, 118, 0, 0, 0];           // Derivation path. First 3 items are automatically hardened!

                response_pk = await app.publicKey(path);
                response_sign = await app.sign(path, message);

                console.log(response_sign);
                console.log(response_pk);
            });
    });
    it('signature is valid when using non-compressed pk', function () {
        const hash = crypto.createHash('sha256');
        let msg_hash = hash.update(message).digest();

        let signature_der = response_sign.signature;
        let signature = secp256k1.signatureImport(signature_der);

        let signature_ok = secp256k1.verify(msg_hash, signature, response_pk.pk);
        expect(signature_ok).to.be.true;
    });

    it('signature is valid when using compressed pk', function () {
        const hash = crypto.createHash('sha256');
        let msg_hash = hash.update(message).digest();

        let signature_der = response_sign.signature;
        let signature = secp256k1.signatureImport(signature_der);

        let signature_ok = secp256k1.verify(msg_hash, signature, response_pk.compressed_pk);
        expect(signature_ok).to.be.true;
    });
});

describe('sign_2', function () {
    let response;

// call API
    before(function () {
        this.timeout(TimeoutLong);
        return comm.create_async(TimeoutLong, true).then(
            async function (comm) {
                let app = new ledger.App(comm);
                let path = [44, 118, 0, 0, 0];           // Derivation path. First 3 items are automatically hardened!
                let message = `{"account_number":"2","chain_id":"local-testnet","fee":{"amount":[],"gas":"500000"},"memo":"","msgs":[{"description":"test","initial_deposit":[{"amount":"1","denom":"stake"}],"proposal_type":"Text","proposer":"cosmos13xzqf9re68eeqfjaxhqh6g5rqfvhzpfkm8tuhh","title":"test"}],"sequence":"0"}`;

                response = await app.sign(path, message);
                console.log(response);
            });
    });
    it('return_code is 0x9000', function () {
        console.log("Error code 0x%s: %s ", response.return_code.toString(16), response.error_message);
        expect(response.return_code).to.equal(0x9000);
    });
    it('has no errors', function () {
        expect(response.error_message).to.equal(`No errors`);
    });
    it('signature has 71 bytes', function () {
        expect(response.signature).to.have.lengthOf(71);
    });
});

describe('sign_parsing_error_message', function () {
    let response;

// call API
    before(function () {
        this.timeout(TimeoutLong);
        return comm.create_async(TimeoutLong, true).then(
            async function (comm) {
                let app = new ledger.App(comm);
                let path = [44, 118, 0, 0, 0];           // Derivation path. First 3 items are automatically hardened!
                let message = `{"chain_id":"local-testnet","fee":{"amount":[],"gas":"500000"},"memo":"","msgs":[{"delegator_addr":"cosmos1qpd4xgtqmxyf9ktjh757nkdfnzpnkamny3cpzv","validator_addr":"cosmosvaloper1zyp0axz2t55lxkmgrvg4vpey2rf4ratcsud07t","value":{"amount":"1","denom":"stake"}}],"sequence":"0"}`;

                response = await app.sign(path, message);
                console.log(response);
            });
    });
    it('return_code is 0x9000', function () {
        console.log("Error code 0x%s: %s ", response.return_code.toString(16), response.error_message);
        expect(response.return_code).to.equal(0x6A80);
    });
    it('has no errors', function () {
        expect(response.error_message).to.equal(`JSON Missing account_number`);
    });
});

describe('serialize_hrp cosmos', function () {
// Use a fake comm object
    let comm = {
        'setScrambleKey': function (dummy) {
        }
    };

    let app = new ledger.App(comm);

    let hrp = app.serializeHRP("cosmos");
    it('length is 7', function () {
        expect(hrp.length).to.equal(7);
    });
    it('length is in byte 0 and equal 6', function () {
        expect(hrp[0]).to.equal(6);
    });
});

// cosmos1wkd9tfm5pqvhhaxq77wv9tvjcsazuaykwsld65
describe('getAddressAndPubKey', function () {
    let response;
// call API
    before(function () {
        this.timeout(TimeoutLong);
        return comm.create_async(TimeoutLong, true).then(
            function (comm) {
                let app = new ledger.App(comm);

                let path = [44, 118, 5, 0, 3];
                return app.getAddressAndPubKey("cosmos", path).then(function (result) {
                    response = result;
                    console.log(response);
                });

            });
    });
    it('return_code is 0x9000', function () {
        console.log("Error code 0x%s: %s ", response.return_code.toString(16), response.error_message);
        expect(response.return_code).to.equal(0x9000);
    });
});

describe('appInfo', function () {
    let response;
// call API
    before(function () {
        this.timeout(TimeoutLong);
        return comm.create_async(TimeoutLong, true).then(
            function (comm) {
                let app = new ledger.App(comm);
                return app.appInfo().then(function (result) {
                    response = result;
                    console.log(response);
                });

            });
    });
    it('return_code is 0x9000', function () {
        console.log("Error code 0x%s: %s ", response.return_code.toString(16), response.error_message);
        expect(response.return_code).to.equal(0x9000);
    });
});

describe("getBech32FromPK", () => {
    it("get address from pk", () => {
        const pkStr = "034fef9cd7c4c63588d3b03feb5281b9d232cba34d6f3d71aee59211ffbfe1fe87";
        const pk = Buffer.from(pkStr, "hex");
        let addr = ledger.Tools.getBech32FromPK("cosmos", pk);
        expect(addr).to.equal("cosmos1w34k53py5v5xyluazqpq65agyajavep2rflq6h");
    });
});
