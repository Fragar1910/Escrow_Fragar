# Escrow DApp - Secure ERC20 Token Swaps

A complete decentralized application (DApp) for performing secure ERC20 token swaps using an escrow smart contract on Ethereum.

## Features

- **Trustless Token Swaps**: Exchange ERC20 tokens without intermediaries
- **Secure Smart Contract**: Built with OpenZeppelin libraries and security best practices
- **Complete Testing**: 30+ comprehensive tests covering all functionality
- **Modern Frontend**: Next.js 14 with TypeScript and Tailwind CSS
- **MetaMask Integration**: Seamless wallet connection using ethers.js v6

## Project Structure

```
escrow_Fragar/
├── sc/                          # Smart Contracts (Foundry)
│   ├── src/
│   │   ├── Escrow.sol          # Main escrow contract
│   │   └── MockToken.sol       # ERC20 test tokens
│   ├── test/
│   │   └── Escrow.t.sol        # Comprehensive tests
│   └── script/
│       └── Deploy.s.sol        # Deployment script
│
├── web/                         # Frontend (Next.js 14)
│   ├── app/
│   │   ├── page.tsx            # Main page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── ConnectButton.tsx   # Wallet connection
│   │   ├── AddToken.tsx        # Add allowed tokens (owner)
│   │   ├── CreateOperation.tsx # Create swap operations
│   │   ├── OperationsList.tsx  # View and manage operations
│   │   └── BalanceDebug.tsx    # Debug panel for balances
│   └── lib/
│       ├── ethereum.tsx        # Ethereum context provider
│       └── contracts.ts        # Contract addresses & ABIs
│
└── deploy.sh                    # Automated deployment script
```

## Technologies Used

### Smart Contracts
- **Solidity 0.8.28**: Modern Solidity version
- **Foundry**: Fast, portable Ethereum development framework
- **OpenZeppelin Contracts v5.5.0**: Industry-standard secure contracts
  - Ownable: Access control
  - ReentrancyGuard: Protection against reentrancy attacks
  - SafeERC20: Safe token transfers

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **Ethers.js v6**: Ethereum library for Web3 interactions
- **Tailwind CSS v3**: Utility-first CSS framework
- **MetaMask**: Browser wallet integration

## Security Features

The Escrow contract implements multiple security mechanisms:

1. **ReentrancyGuard**: Prevents reentrancy attacks
2. **SafeERC20**: Handles non-standard ERC20 tokens safely
3. **Checks-Effects-Interactions Pattern**: Proper state updates before external calls
4. **Input Validation**: Comprehensive validation on all parameters
5. **Access Control**: Owner-only functions using Ownable
6. **No Overflow/Underflow**: Solidity 0.8+ built-in protection

## Installation & Setup

### Prerequisites

- **Node.js** >= 18.x
- **Foundry** (forge, anvil)
- **MetaMask** browser extension
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/Fragar1910/Escrow_Fragar.git
cd Escrow_Fragar
```

### 2. Install Smart Contract Dependencies

```bash
cd sc
forge install
cd ..
```

### 3. Install Frontend Dependencies

```bash
cd web
npm install
cd ..
```

## Quick Start

### 1. Start Local Blockchain

Open a terminal and start Anvil (Foundry's local Ethereum node):

```bash
anvil
```

Keep this terminal running. Anvil will provide you with 10 test accounts with 10,000 ETH each.

### 2. Deploy Contracts

In a new terminal, run the deployment script:

```bash
./deploy.sh
```

This script will:
- Build and deploy the Escrow contract
- Deploy two test ERC20 tokens (Token A and Token B)
- Add both tokens to the escrow's allowed list
- Mint 1000 tokens of each type to 3 test accounts
- Extract ABIs and update the frontend configuration
- Generate `deployment-info.txt` with contract addresses

### 3. Start Frontend

```bash
cd web
npm run dev
```

The application will be available at **http://localhost:3000**

### 4. Configure MetaMask

1. Switch MetaMask to **Localhost 8545** network
2. Import test accounts using their private keys (shown in deploy.sh output):

**Test Accounts:**

```
Account #0 (Owner):
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1:
Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

Account #2:
Address: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Private Key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```

## How to Use

### As Owner (Account #0)

1. **Connect Wallet**: Click "Connect Wallet" and select Account #0
2. **Add Tokens** (if not already added by deploy script):
   - Token A and Token B addresses are in `deployment-info.txt`
   - Paste token address in "Add Token" form
   - Click "Add Token" and confirm in MetaMask

### Creating a Swap Operation

1. **Connect** with any account (Account #0, #1, or #2)
2. In **"Create Swap Operation"** section:
   - Select **Token A** (token you offer)
   - Enter **Amount A** (e.g., 100)
   - Select **Token B** (token you want)
   - Enter **Amount B** (e.g., 50)
3. Click **"Create Operation"**
4. Confirm **two transactions** in MetaMask:
   - Approve Token A to Escrow
   - Create the operation

### Completing a Swap

1. **Switch** to a different account in MetaMask
2. Find the operation in **"Operations"** section
3. Click **"Complete Operation"**
4. Confirm **two transactions**:
   - Approve Token B to Escrow
   - Complete the swap
5. Tokens are exchanged automatically!

### Cancelling an Operation

1. As the operation **creator**, find your active operation
2. Click **"Cancel Operation"**
3. Confirm the transaction
4. Your tokens are returned

## Running Tests

The project includes 30 comprehensive tests:

```bash
cd sc
forge test -vv
```

Test categories:
- Token management (add tokens, validation)
- Operation creation (happy path, reverts, edge cases)
- Operation completion (success, access control, state validation)
- Operation cancellation (permissions, state transitions)
- View functions (getAllowedTokens, getAllOperations, etc.)
- Integration tests (full workflows)
- Security tests (reentrancy protection, fuzz testing)

## Smart Contract Functions

### Owner Functions
- `addToken(address _token)`: Add a token to allowed list

### User Functions
- `createOperation(address _tokenA, address _tokenB, uint256 _amountA, uint256 _amountB)`: Create swap
- `completeOperation(uint256 _operationId)`: Complete a swap
- `cancelOperation(uint256 _operationId)`: Cancel your operation

### View Functions
- `getAllowedTokens()`: Get all allowed tokens
- `getAllOperations()`: Get all operations
- `getOperation(uint256 _operationId)`: Get operation by ID
- `getOperationCount()`: Get total operations count

## Troubleshooting

### Common Issues

#### "MetaMask is not installed"
- Install MetaMask browser extension
- Refresh the page after installation

#### "Failed to connect wallet"
- Make sure MetaMask is unlocked
- Switch to Localhost 8545 network in MetaMask
- Try disconnecting and reconnecting

#### "Transaction failed: insufficient funds"
- Make sure you're using one of the test accounts
- Check that Anvil is running
- Redeploy contracts if needed

#### "Token not allowed" error
- Owner must add tokens using the "Add Token" form
- Check that the token address is correct
- Verify in the "Allowed Tokens" list

#### Contracts not deploying
- Ensure Anvil is running on port 8545
- Check for port conflicts
- Try restarting Anvil and redeploying

#### Frontend not connecting to contracts
- Verify `deployment-info.txt` was generated
- Check that `web/lib/contracts.ts` has correct addresses
- Run `./deploy.sh` again to regenerate configuration

#### Page won't load after connecting wallet
- Clear browser cache
- Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- Check browser console for errors

## Project Highlights

### Smart Contract Security
- Comprehensive input validation
- Protection against common vulnerabilities
- Gas-optimized operations
- Event emissions for all state changes

### Frontend Features
- Auto-reconnect wallet on page refresh
- Real-time balance updates
- Operation auto-refresh every 5 seconds
- User-friendly error messages
- Responsive design

### Development Features
- Automated deployment pipeline
- ABI auto-extraction
- Type-safe contract interactions
- Comprehensive test coverage
- Hot module reloading for frontend

## Possible Improvements

1. **Multi-token swaps**: Support swapping multiple tokens in one operation
2. **Partial fills**: Allow completing operations partially
3. **Expiration dates**: Add time limits to operations
4. **Fee mechanism**: Implement platform fees
5. **Order book**: Display all active operations as an order book
6. **Price discovery**: Show market rates for token pairs
7. **Notifications**: Add toast notifications for transactions
8. **Mobile optimization**: Enhanced mobile UI
9. **L2 deployment**: Deploy to Layer 2 solutions (Arbitrum, Optimism)
10. **Governance**: Add DAO for protocol upgrades

## License

MIT License - See LICENSE file for details

## Author

**Francisco Hipólito García Martínez**
- GitHub: [@Fragar1910](https://github.com/Fragar1910)
- Email: fragar1910@hotmail.com

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Links

- GitHub: https://github.com/Fragar1910/Escrow_Fragar
- Foundry Docs: https://book.getfoundry.sh/
- Next.js Docs: https://nextjs.org/docs
- Ethers.js Docs: https://docs.ethers.org/v6/
