export interface ResponseAddress {
  bech32_address: string
  compressed_pk: Buffer
}

export interface ResponsePubkey {
  bech32_address: string
  compressed_pk: Buffer
}

export interface ResponseSign {
  signature: Buffer
}
