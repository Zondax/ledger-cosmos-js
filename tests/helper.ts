export const COSMOS_HRP = 'cosmos'
export const INJ_HRP = 'inj'
export const ETH_PATH = "m/44'/60'/0'/0/0"
export const COSMOS_PATH = "m/44'/118'/0'/0/0"

export const GET_ADDRESS_PUBKEY_RESPONSE =
  '035c986b9ae5fbfb8e1e9c12c817f5ef8fdb821cdecaa407f1420ec4f8f1d766bf636f736d6f7331776b643974666d357071766868617871373777763974766a6373617a7561796b77736c6436359000'

export const INVALID_HRP_RESPONSE = '6986'

export const GET_ETH_ADDRESS_RESPONSE =
  '022374f2dacd71042b5a888e3839e4ba54752ad6a51d35b54f6abb899c4329d4bf696e6a31356e3268306c7a76666763387834666d366664796138396e37387836656532663368377a33669000'

export const INVALID_ADDR_RESPONSE = '0x6984'

export const SIGN_BASIC_AMINO_RESPONSE =
  '304402206687b768c2971c973a990f7d64d3b97e2fbd8b7ccbeed3b323182a1b1350c17b022048d671283a3fa33148b8f0c4dfcc7051c1141e038763cecfec6b2f2f3006de8f9000'

export const example_tx_str_basic = {
  account_number: '108',
  chain_id: 'cosmoshub-4',
  fee: {
    amount: [
      {
        amount: '600',
        denom: 'uatom',
      },
    ],
    gas: '200000',
  },
  memo: '',
  msgs: [
    {
      type: 'cosmos-sdk/MsgWithdrawDelegationReward',
      value: {
        delegator_address: 'cosmos1w34k53py5v5xyluazqpq65agyajavep2rflq6h',
        validator_address: 'cosmosvaloper1kn3wugetjuy4zetlq6wadchfhvu3x740ae6z6x',
      },
    },
    {
      type: 'cosmos-sdk/MsgWithdrawDelegationReward',
      value: {
        delegator_address: 'cosmos1w34k53py5v5xyluazqpq65agyajavep2rflq6h',
        validator_address: 'cosmosvaloper1sjllsnramtg3ewxqwwrwjxfgc4n4ef9u2lcnj0',
      },
    },
  ],
  sequence: '106',
}

export const SIGN_MLTISEND_AMINO_RESPONSE =
  '3045022100f3f3b094717136dc7a9d85af87c75fd1c3b0b68a5025123cac645bb5a7f76c530220184cc26659cb19b814d91359276e80db93c30daae76a285e6a4487047e3d14df9000'

export const example_tx_str_msgMultiSend = {
  account_number: '10',
  chain_id: 'chain-WiONzW',
  fee: {
    amount: [],
    gas: '200000',
  },
  memo: '',
  msgs: [
    {
      type: 'cosmos-sdk/MsgMultiSend',
      value: {
        inputs: [
          {
            address: 'cosmos1w4efqfklkezgyt6lncjdwxncrzyzpr2efzcqal',
            coins: [
              {
                amount: '30',
                denom: 'stake',
              },
            ],
          },
        ],
        outputs: [
          {
            address: 'cosmos184hgxlzat3qhm7p28563w4jyw4aa3wcgnj6gtv',
            coins: [
              {
                amount: '10',
                denom: 'stake',
              },
            ],
          },
          {
            address: 'cosmos1pfyz36qx8z8dm8ktd75mwx5j5vsmkzfn7wrgp9',
            coins: [
              {
                amount: '10',
                denom: 'stake',
              },
            ],
          },
          {
            address: 'cosmos1xu388ml6krya3ysmlrup2ylxjtzhl4hlaem3ng',
            coins: [
              {
                amount: '10',
                denom: 'stake',
              },
            ],
          },
        ],
      },
    },
  ],
  sequence: '16',
}

export const SIGN_BASIC_TEXTUAL_RESPONSE =
  '3045022100e5e33eeaa83e5a5ecc5960e27689f7508b5541ef5c42cc7aeaa229793a2d1c7c022049d93b1835c2bed9857bbbf00ccccbf5152bfef05b9ab6c0cc05fc76bf96cc7a9000'
export const example_tx_sign_textual =
  'a10192a20168436861696e20696402686d792d636861696ea2016e4163636f756e74206e756d626572026131a2016853657175656e6365026132a301674164647265737302782d636f736d6f7331756c6176336873656e7570737771666b77327933737570356b677471776e767161386579687304f5a3016a5075626c6963206b657902781f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657904f5a3026d5075624b6579206f626a656374030104f5a401634b657902785230324542204444374620453446442045423736204443384120323035452046363544203739304320443330452038413337203541354320323532382045423341203932334120463146422034443739203444030204f5a102781e54686973207472616e73616374696f6e206861732031204d657373616765a3016d4d6573736167652028312f312902781c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e640301a2026e4d736753656e64206f626a6563740302a3016c46726f6d206164647265737302782d636f736d6f7331756c6176336873656e7570737771666b77327933737570356b677471776e76716138657968730303a3016a546f206164647265737302782d636f736d6f7331656a726634637572327779366b667572673966326a707070326833616665356836706b6835740303a30166416d6f756e74026731302041544f4d0303a1026e456e64206f66204d657373616765a201644d656d6f0278193e20e29a9befb88f5c7532363942e29a9befb88f2020202020a2016446656573026a302e3030322041544f4da30169476173206c696d697402673130302730303004f5a3017148617368206f66207261772062797465730278403963303433323930313039633237306232666661396633633066613535613039306330313235656265663838316637646135333937386462663933663733383504f5'
