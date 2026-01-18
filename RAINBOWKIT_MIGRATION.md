# Migración a RainbowKit + Wagmi

## Cambios Realizados

### 1. Dependencias Instaladas ✅
```bash
npm install @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query
```

### 2. Archivos Creados ✅

- `lib/wagmi.ts` - Configuración de Wagmi con chain de Anvil
- `lib/providers.tsx` - Providers de RainbowKit y Wagmi
- `hooks/useEscrowContract.ts` - Hook para interactuar con el contrato Escrow
- `hooks/useTokenContract.ts` - Hook para interactuar con tokens ERC20
- `hooks/useAutoRefresh.ts` - Hook que refresca automáticamente al cambiar cuenta

### 3. Archivos Modificados ✅

- `app/layout.tsx` - Añadido `<Providers>`
- `components/ConnectButton.tsx` - Usa RainbowKit ConnectButton

## Cambios Pendientes (HACER MANUALMENTE)

### 1. Actualizar `app/page.tsx`

Reemplazar el import y uso de EthereumProvider:

```typescript
// ANTES
import { EthereumProvider, useEthereum } from '../lib/ethereum';

function MainContent() {
  const { isConnected } = useEthereum();
  // ...
}

export default function Home() {
  return (
    <EthereumProvider>
      <MainContent />
    </EthereumProvider>
  );
}
```

```typescript
// DESPUÉS
import { useAccount } from 'wagmi';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* ... resto del código sin cambios ... */}
    </div>
  );
}
```

### 2. Actualizar `components/AddToken.tsx`

```typescript
// AÑADIR IMPORTS
import { useAccount } from 'wagmi';
import { useEscrowContract } from '../hooks/useEscrowContract';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

// REEMPLAZAR
const { signer, account } = useEthereum();

// POR
const { address } = useAccount();
const { getContract, getReadContract } = useEscrowContract();

// REEMPLAZAR loadAllowedTokens
const loadAllowedTokens = async () => {
  try {
    const contract = await getReadContract();
    if (!contract) return;

    const tokens = await contract.getAllowedTokens();
    // ... resto igual
  } catch (error) {
    console.error('Failed to load allowed tokens:', error);
  }
};

// AÑADIR auto-refresh
useAutoRefresh(loadAllowedTokens);

// EN handleAddToken REEMPLAZAR
const contract = await getContract();
if (!contract) throw new Error('Contract not available');

const tx = await contract.addToken(tokenAddress);
await tx.wait();
```

### 3. Actualizar `components/CreateOperation.tsx`

```typescript
// AÑADIR IMPORTS
import { useAccount } from 'wagmi';
import { useEscrowContract } from '../hooks/useEscrowContract';
import { useTokenContract } from '../hooks/useTokenContract';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

// REEMPLAZAR
const { signer, account } = useEthereum();

// POR
const { address } = useAccount();
const { getContract: getEscrowContract } = useEscrowContract();

// EN handleCreateOperation
const tokenAContract = await useTokenContract(tokenA).getContract();
if (!tokenAContract) throw new Error('Token contract not available');

const escrowContract = await getEscrowContract();
if (!escrowContract) throw new Error('Escrow contract not available');

// Approve
const approveTx = await tokenAContract.approve(ESCROW_ADDRESS, amountAWei);
await approveTx.wait();

// Create
const createTx = await escrowContract.createOperation(tokenA, tokenB, amountAWei, amountBWei);
await createTx.wait();
```

### 4. Actualizar `components/OperationsList.tsx`

```typescript
// AÑADIR IMPORTS
import { useAccount } from 'wagmi';
import { useEscrowContract } from '../hooks/useEscrowContract';
import { useTokenContract } from '../hooks/useTokenContract';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

// REEMPLAZAR
const { signer, account } = useEthereum();

// POR
const { address } = useAccount();
const { getContract, getReadContract } = useEscrowContract();

// EN loadOperations
const contract = await getReadContract();
if (!contract) return;

const ops = await contract.getAllOperations();
setOperations(ops);

// AÑADIR auto-refresh
useAutoRefresh(loadOperations);

// EN handleCompleteOperation
const tokenBContract = await useTokenContract(tokenB).getContract();
if (!tokenBContract) throw new Error('Token not available');

const escrowContract = await getContract();
if (!escrowContract) throw new Error('Escrow not available');

// Approve
const approveTx = await tokenBContract.approve(ESCROW_ADDRESS, amountB);
await approveTx.wait();

// Complete
const completeTx = await escrowContract.completeOperation(opId);
await completeTx.wait();
```

### 5. Actualizar `components/BalanceDebug.tsx`

```typescript
// AÑADIR IMPORTS
import { useAccount, usePublicClient } from 'wagmi';
import { BrowserProvider } from 'ethers';
import { useEscrowContract } from '../hooks/useEscrowContract';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

// REEMPLAZAR
const { provider, signer } = useEthereum();

// POR
const { address } = useAccount();
const publicClient = usePublicClient();
const { getReadContract } = useEscrowContract();

// EN loadBalances
if (!publicClient) return;

const provider = new BrowserProvider(publicClient as any);

// Get ETH balance
const ethBalance = await provider.getBalance(acc.address);

// AÑADIR auto-refresh
useAutoRefresh(loadBalances);
```

## Beneficios de RainbowKit

1. ✅ **Auto-refresh automático**: Al cambiar de cuenta en MetaMask, la UI se actualiza automáticamente
2. ✅ **Mejor UX**: Botón de conexión con avatar y dropdown
3. ✅ **Chain switching**: Detecta y permite cambiar a Anvil Local fácilmente
4. ✅ **Sincronización**: La cuenta mostrada siempre coincide con la que firma
5. ✅ **Hooks modernos**: Usa wagmi hooks que son más estables

## Configuración de MetaMask para Anvil

**IMPORTANTE**: Añadir red Anvil Local manualmente en MetaMask:

- **Network Name**: Anvil Local
- **RPC URL**: http://127.0.0.1:8545
- **Chain ID**: 31337
- **Currency Symbol**: ETH

## Testing

1. Iniciar Anvil:
```bash
anvil
```

2. Desplegar contratos:
```bash
./deploy.sh
```

3. Iniciar frontend:
```bash
cd web
npm run dev
```

4. Conectar MetaMask a Anvil Local (Chain ID: 31337)
5. Importar una cuenta de Anvil usando la private key
6. Probar cambiar entre cuentas - la UI debe actualizarse automáticamente

## Solución al Problema de Cuentas Diferentes

El problema de que "cambie una cuenta de Anvil y al firmar sale otro número" se soluciona porque:

1. RainbowKit sincroniza automáticamente con MetaMask
2. Los hooks de wagmi (`useAccount`) siempre devuelven la cuenta activa actual
3. Al cambiar cuenta en MetaMask, `useAccount` se actualiza automáticamente
4. Todos los componentes que usan `useAutoRefresh` se refrescan con los datos correctos

## Rollback (si algo falla)

Si necesitas volver atrás:

```bash
git checkout HEAD -- app/page.tsx components/ lib/ethereum.tsx
npm uninstall @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
```

## Archivos a Eliminar Después de Migración

- `lib/ethereum.tsx` (reemplazado por wagmi)
