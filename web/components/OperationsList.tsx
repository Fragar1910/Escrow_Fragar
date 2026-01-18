'use client';

import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import { useEthereum } from '../lib/ethereum';
import { ESCROW_ADDRESS, EscrowABI, ERC20ABI } from '../lib/contracts';
import {useAccount, usePublicClient} from 'wagmi';
import {useEscrowContract} from '../hooks/useEscrowContract';
import {useTokenContract} from '../hooks/useTokenContract';
import {useAutoRefresh} from '../hooks/useAutoRefresh';

interface Operation {
  id: bigint;
  creator: string;
  tokenA: string;
  tokenB: string;
  amountA: bigint;
  amountB: bigint;
  status: number;
  completer: string;
}

export default function OperationsList() {
  const { address } = useAccount();
  const { getContract, getReadContract } = useEscrowContract();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadOperations = async () => {
    try {
      const contract = await getReadContract();
      if (!contract) return;

      const ops = await contract.getAllOperations();
      setOperations(ops || []);
    } catch (error) {
      console.error('Failed to load operations:', error);
      setOperations([]);
    }
  };

  useAutoRefresh(loadOperations);

  const handleCompleteOperation = async (opId: bigint, tokenB: string, amountB: bigint) => {
    setActionLoading(Number(opId));
    setMessage(null);

    try {
      const { getContract: getTokenContract } = useTokenContract(tokenB);
      const tokenBContract = await getTokenContract();
      if (!tokenBContract) throw new Error('Token contract not available');

      const escrowContract = await getContract();
      if (!escrowContract) throw new Error('Escrow contract not available');

      // Step 1: Approve Token B
      const approveTx = await tokenBContract.approve(ESCROW_ADDRESS, amountB);
      await approveTx.wait();

      // Step 2: Complete operation
      const completeTx = await escrowContract.completeOperation(opId);
      await completeTx.wait();

      setMessage({ type: 'success', text: 'Operation completed successfully!' });
      await loadOperations();

      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Failed to complete operation:', error);
      setMessage({
        type: 'error',
        text: error.reason || error.message || 'Failed to complete operation',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelOperation = async (opId: bigint) => {
    setActionLoading(Number(opId));
    setMessage(null);

    try {
      const escrowContract = await getContract();
      if (!escrowContract) throw new Error('Escrow contract not available');

      const tx = await escrowContract.cancelOperation(opId);
      await tx.wait();

      setMessage({ type: 'success', text: 'Operation cancelled successfully!' });
      await loadOperations();

      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Failed to cancel operation:', error);
      setMessage({
        type: 'error',
        text: error.reason || error.message || 'Failed to cancel operation',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0:
        return { label: 'Active', color: 'bg-green-100 text-green-800' };
      case 1:
        return { label: 'Completed', color: 'bg-blue-100 text-blue-800' };
      case 2:
        return { label: 'Cancelled', color: 'bg-gray-100 text-gray-800' };
      default:
        return { label: 'Unknown', color: 'bg-red-100 text-red-800' };
    }
  };

  if (!address) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Operations</h2>
        <p className="text-gray-500">Please connect your wallet first</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Operations</h2>
        <button
          onClick={loadOperations}
          className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
        >
          Refresh
        </button>
      </div>

      {operations.length === 0 ? (
        <p className="text-gray-500">No operations yet</p>
      ) : (
        <div className="space-y-4">
          {operations.map((op, index) => {
            const status = getStatusLabel(op.status);
            const isCreator = address && op.creator.toLowerCase() === address.toLowerCase();
            const isActive = op.status === 0;
            const isLoading = actionLoading === Number(op.id);

            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Operation #{op.id.toString()}</span>
                    <p className="text-xs text-gray-500 mt-1">
                      Creator: {formatAddress(op.creator)}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 mb-1">Offering</p>
                    <OperationToken tokenAddress={op.tokenA} amount={op.amountA} />
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 mb-1">Requesting</p>
                    <OperationToken tokenAddress={op.tokenB} amount={op.amountB} />
                  </div>
                </div>

                {isActive && (
                  <div className="flex gap-2">
                    {isCreator ? (
                      <button
                        onClick={() => handleCancelOperation(op.id)}
                        disabled={isLoading}
                        className={`flex-1 py-2 rounded transition ${
                          isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        {isLoading ? 'Cancelling...' : 'Cancel Operation'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCompleteOperation(op.id, op.tokenB, op.amountB)}
                        disabled={isLoading}
                        className={`flex-1 py-2 rounded transition ${
                          isLoading
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {isLoading ? 'Completing...' : 'Complete Operation'}
                      </button>
                    )}
                  </div>
                )}

                {isLoading && (
                  <p className="text-xs text-gray-600 text-center mt-2">
                    Please confirm transaction(s) in MetaMask
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {message && (
        <div
          className={`mt-4 p-3 rounded ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

// Helper component to display token info
function OperationToken({ tokenAddress, amount }: { tokenAddress: string; amount: bigint }) {
  const publicClient = usePublicClient();
  const [symbol, setSymbol] = useState('...');

  useEffect(() => {
    const loadSymbol = async () => {
      if (!publicClient) return;

      try {
        const provider = new BrowserProvider(publicClient as any);
        const token = new ethers.Contract(tokenAddress, ERC20ABI, provider);
        const sym = await token.symbol();
        setSymbol(sym);
      } catch (error) {
        console.error('Failed to load token symbol:', error);
        setSymbol('Unknown');
      }
    };

    loadSymbol();
  }, [tokenAddress, publicClient]);

  return (
    <p className="font-medium">
      {ethers.formatEther(amount)} {symbol}
    </p>
  );
}
