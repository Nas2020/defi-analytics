// src/services/blockchain.ts
import { AddressInfo, TokenBalance, Transaction, TokenTransfer, APIResponse } from '../types/blockchain';
import { networkService } from './networkService';

export class BlockchainService {
  // Instead of storing baseUrl as a property, use a getter
  private get baseUrl(): string {
    const network = networkService.getCurrentNetwork();
    return network === 'mainnet'
      ? process.env.VSC_MAINNET_API || 'https://explorer.vscblockchain.org/api'
      : process.env.VSC_TESTNET_API || 'https://testnet-scan.vsgofficial.com/api';
  }

  private async fetchJson<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    console.log('📡 Fetching:', url);
    console.log('🌍 Current Network:', networkService.getCurrentNetwork());

    try {
      const response = await fetch(url);
      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          contentType,
          network: networkService.getCurrentNetwork()
        });
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      if (!contentType?.includes('application/json')) {
        console.warn('⚠️ Warning: Response is not JSON:', contentType);
      }

      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;
    } catch (error) {
      console.error('🔥 Fetch Error:', error);
      throw error;
    }
  }

  async getAddressInfo(address: string): Promise<APIResponse<AddressInfo>> {
    return this.fetchJson(`/addresses/${address}`);
  }

  async getAddressTokens(address: string): Promise<APIResponse<TokenBalance[]>> {
    return this.fetchJson(`/addresses/${address}/token-balances`);
  }

  async getAddressTransactions(
    address: string,
    page: number = 1,
    limit: number = 50
  ): Promise<APIResponse<Transaction[]>> {
    return this.fetchJson(
      `/addresses/${address}/transactions?page=${page}&limit=${limit}`
    );
  }

  async getAddressTokenTransfers(
    address: string,
    page: number = 1,
    limit: number = 50
  ): Promise<APIResponse<TokenTransfer[]>> {
    return this.fetchJson(
      `/addresses/${address}/token-transfers?page=${page}&limit=${limit}`
    );
  }

  async testConnection(): Promise<{ connected: boolean; network: string; apiUrl: string }> {
    try {
      await fetch(this.baseUrl);
      return {
        connected: true,
        network: networkService.getCurrentNetwork(),
        apiUrl: this.baseUrl
      };
    } catch (error) {
      console.error('🔥 API Connection Test Failed:', error);
      return {
        connected: false,
        network: networkService.getCurrentNetwork(),
        apiUrl: this.baseUrl
      };
    }
  }
}

// Export singleton instance
export const blockchainService = new BlockchainService();