'use client';

//import { EthereumProvider, useEthereum } from '../lib/ethereum';
import { useAccount } from 'wagmi';
import ConnectButton from '../components/ConnectButton';
import AddToken from '../components/AddToken';
import CreateOperation from '../components/CreateOperation';
import OperationsList from '../components/OperationsList';
import BalanceDebug from '../components/BalanceDebug';

function MainContent() {
  //const { isConnected } = useEthereum();
  const { address } = useAccount();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Escrow DApp</h1>
              <p className="text-sm text-gray-600 mt-1">
                Secure ERC20 Token Swaps on Ethereum
              </p>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!address ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to Escrow DApp
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              A decentralized escrow platform for secure token swaps. Create swap
              operations, exchange tokens with other users, and manage your
              transactions all on-chain.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="font-semibold text-blue-900 mb-3">How it works:</h3>
              <ol className="text-left text-blue-800 space-y-2">
                <li>1. Connect your MetaMask wallet</li>
                <li>2. Owner adds allowed tokens to the escrow</li>
                <li>3. Create a swap operation offering Token A for Token B</li>
                <li>4. Another user completes the swap by providing Token B</li>
                <li>5. Both parties receive their tokens automatically!</li>
              </ol>
            </div>
            <div className="mt-8">
              <ConnectButton />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <AddToken />
              <CreateOperation />
            </div>

            {/* Middle Column */}
            <div>
              <OperationsList />
            </div>

            {/* Right Column */}
            <div>
              <BalanceDebug />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-gray-600 text-sm">
            <p className="mb-2">
              Built with Solidity 0.8.28, OpenZeppelin, Foundry, Next.js 14 & Ethers.js v6
            </p>
            <p className="text-xs text-gray-500">
              Secure • Trustless • Decentralized
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  const { isConnected } = useAccount();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <MainContent />
    </div>
  );
}
