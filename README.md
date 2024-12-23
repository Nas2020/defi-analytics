# VSG DeFi Analytics API

Backend API service for the Vector Smart Chain DeFi Analytics platform, built with Bun, Hono, and SQLite.

## Features

- **Blockchain Integration**
  - Real-time balance checking
  - Transaction history
  - Token balances
  - NFT analytics

- **Data Caching**
  - SQLite database for caching responses
  - Optimized query performance
  - Reduced blockchain RPC calls

- **Network Support**
  - Mainnet and Testnet support
  - Dynamic network switching
  - Environment-based configuration

## Tech Stack

- [Bun](https://bun.sh/) - JavaScript runtime & toolkit
- [Hono](https://hono.dev/) - Fast web framework
- [SQLite](https://www.sqlite.org/) - Embedded database
- [Ethers.js](https://docs.ethers.org/) - Ethereum library
- TypeScript for type safety

## Prerequisites

- Bun >= 1.0.0
- Node.js >= 18.x (for development tools)
- Basic understanding of blockchain concepts

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Nas2020/defi-analytics.git
cd defi-analytics
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file in the root directory:
```env
VSC_MAINNET_API=https://explorer.vscblockchain.org/api
VSC_RPC_MAINNET_API=https://rpc.vscblockchain.org
VSC_TESTNET_API=https://testnet-scan.vsgofficial.com/api
NETWORK=mainnet
PORT=3002
NODE_ENV=development
```

4. Start the development server:
```bash
bun run dev
```

The API will be available at `http://localhost:3002`

## Project Structure

```
defi-analytics/
├── src/
│   ├── db/           # Database configuration
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── types/        # TypeScript types
│   └── index.ts      # Entry point
├── .env              # Environment variables
└── package.json      # Project configuration
```

## API Endpoints

### Network Configuration
- `GET /api/network` - Get current network status
- `POST /api/network` - Update network configuration

### Blockchain Data
- `GET /api/balance/:address` - Get address balance
- `GET /api/transactions/:address` - Get transaction history
- `GET /api/token-balances/:address` - Get token balances
- `GET /api/address/:address` - Get address information
- `GET /api/address/:address/tokens` - Get address tokens

### DeFi Analytics
- `GET /api/nft-info` - Get NFT statistics and analysis
- `GET /api/vsg-info` - Get VSG token information

## Database Schema

The SQLite database includes tables for:
- VSG information caching
- Account balances
- Token data
- Transaction history
- Address information

Optimized with indices for faster queries.


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
