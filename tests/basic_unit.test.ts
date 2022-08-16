/** ******************************************************************************
 *  (c) 2018 - 2022 Zondax AG
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
 ******************************************************************************* */

 import { CosmosApp } from '../src/cosmosApp'

 describe('UnitTest', function () {
  test("check address conversion", async () => {
    const pkStr = "034fef9cd7c4c63588d3b03feb5281b9d232cba34d6f3d71aee59211ffbfe1fe87";
    const pk = Buffer.from(pkStr, "hex");
    const addr = CosmosApp.getBech32FromPK("cosmos", pk);
    expect(addr).toEqual("cosmos1w34k53py5v5xyluazqpq65agyajavep2rflq6h");
  })
 })
