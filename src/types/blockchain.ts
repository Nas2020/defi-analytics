export interface AddressInfo {
    address: string
    balance: string
    tokens: TokenBalance[]
    transactions: Transaction[]
    token_transfers: TokenTransfer[]
}

export interface TokenBalance {
    token_address: string
    token_symbol: string
    token_decimals: string
    balance: string
}

export interface Transaction {
    hash: string
    block_number: string
    from: string
    to: string
    value: string
    gas_price: string
    timestamp: string
}

export interface TokenTransfer {
    token_address: string
    from_address: string
    to_address: string
    amount: string
    transaction_hash: string
    block_number: string
    timestamp: string
}

/**
 * Describes a single NFT group with its aggregated data.
 */
export interface NftDetail {
    name: string     
    symbol: string    
    totalSupply: number
    holders: number
    imageUrl: string
}

/**
 * Describes the shape of the entire NFT response body.
 */
export interface NftInfoResponse {
    totalNftTypes: number
    data: NftDetail[]
}

export interface APIResponse<T> {
    status: string
    message: string
    result: T
}