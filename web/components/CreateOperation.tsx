'use client';

import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import { ESCROW_ADDRESS, ERC20ABI } from '../lib/contracts';
import {useAccount, usePublicClient} from 'wagmi';
import {useEscrowContract} from '../hooks/useEscrowContract';
import {useTokenContract} from '../hooks/useTokenContract';

export default function CreateOperation() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { getContract, getReadContract } = useEscrowContract();

  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [allowedTokens, setAllowedTokens] = useState<{ address: string; symbol: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadTokens = async () => {
      if (!publicClient) return;

      try {
        const contract = await getReadContract();
        if (!contract) return;

        const tokens = await contract.getAllowedTokens();

        if (tokens.length === 0) {
          setAllowedTokens([]);
          return;
        }

        const provider = new BrowserProvider(publicClient as any);

        const tokensWithSymbol = await Promise.all(
          tokens.map(async (tokenAddr: string) => {
            try {
              const token = new ethers.Contract(tokenAddr, ERC20ABI, provider);
              const symbol = await token.symbol();
              return { address: tokenAddr, symbol };
            } catch (error) {
              console.error('Failed to load token:', error);
              return { address: tokenAddr, symbol: 'Unknown' };
            }
          })
        );

        setAllowedTokens(tokensWithSymbol);
      } catch (error) {
        console.error('Failed to load tokens:', error);
        setAllowedTokens([]);
      }
    };

    loadTokens();
  }, [address, publicClient]);

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      setMessage({ type: 'error', text: 'Please connect your wallet first' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Get token contract
      const { getContract: getTokenContract } = useTokenContract(tokenA);
      const tokenAContract = await getTokenContract();
      if (!tokenAContract) throw new Error('Token contract not available');

      const escrowContract = await getContract();
      if (!escrowContract) throw new Error('Escrow contract not available');

      // Convert amounts to Wei
      const amountAWei = ethers.parseEther(amountA);
      const amountBWei = ethers.parseEther(amountB);

      // Step 1: Approve Token A
      const approveTx = await tokenAContract.approve(ESCROW_ADDRESS, amountAWei);
      await approveTx.wait();

      // Step 2: Create operation
      const createTx = await escrowContract.createOperation(tokenA, tokenB, amountAWei, amountBWei);
      await createTx.wait();

      setMessage({ type: 'success', text: 'Operation created successfully!' });
      setTokenA('');
      setTokenB('');
      setAmountA('');
      setAmountB('');

      // Reload page after success
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      console.error('Failed to create operation:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Failed to create operation'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Create Swap Operation</h2>

      {allowedTokens.length === 0 ? (
        <p className="text-gray-500">No tokens available. Please add tokens first.</p>
      ) : (
        <form onSubmit={handleCreateOperation} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token A (You offer)
            </label>
            <select
              value={tokenA}
              onChange={(e) => setTokenA(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select token...</option>
              {allowedTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount A
            </label>
            <input
              type="number"
              step="0.000000000000000001"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token B (You request)
            </label>
            <select
              value={tokenB}
              onChange={(e) => setTokenB(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select token...</option>
              {allowedTokens
                .filter((token) => token.address !== tokenA)
                .map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount B
            </label>
            <input
              type="number"
              step="0.000000000000000001"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              placeholder="0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !tokenA || !tokenB || !amountA || !amountB}
            className={`w-full py-2 rounded-lg transition ${
              loading || !tokenA || !tokenB || !amountA || !amountB
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {loading ? 'Creating Operation...' : 'Create Operation'}
          </button>

          {loading && (
            <p className="text-sm text-gray-600 text-center">
              Please confirm both transactions in MetaMask
            </p>
          )}
        </form>
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
