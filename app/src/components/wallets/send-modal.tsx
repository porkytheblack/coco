'use client';

import { useState } from 'react';
import { Button, Input, Modal } from '@/components/ui';
import type { WalletWithBalance, Chain } from '@/types';
import { sendTransaction } from '@/lib/wallet/transfer';

interface SendModalProps {
  isOpen: boolean;
  wallet: WalletWithBalance;
  chain: Chain;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
}

export function SendModal({
  isOpen,
  wallet,
  chain,
  onClose,
  onSuccess,
}: SendModalProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAddressPlaceholder = () => {
    switch (chain.ecosystem) {
      case 'solana':
        return 'Recipient public key (e.g., 7xKXt...)';
      case 'aptos':
        return 'Recipient address (0x...)';
      default:
        return 'Recipient address (0x...)';
    }
  };

  const handleSubmit = async () => {
    if (!recipient.trim()) {
      setError('Recipient address is required');
      return;
    }

    if (!amount.trim() || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const txHash = await sendTransaction({
        walletId: wallet.id,
        recipient: recipient.trim(),
        amount: amount.trim(),
        chain,
      });

      onSuccess(txHash);
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setRecipient('');
    setAmount('');
    setError(null);
    onClose();
  };

  const formatBalance = (balance: string, decimals: number, symbol: string) => {
    const value = Number(balance) / Math.pow(10, decimals);
    return `${value.toFixed(4)} ${symbol}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Send Funds"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isLoading}>
            Send
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* From wallet info */}
        <div className="bg-coco-bg-secondary rounded-lg p-3">
          <p className="text-xs text-coco-text-tertiary mb-1">From</p>
          <p className="text-sm font-medium text-coco-text-primary">{wallet.name}</p>
          <p className="text-xs text-coco-text-secondary font-mono">
            {wallet.address.slice(0, 10)}...{wallet.address.slice(-8)}
          </p>
          <p className="text-xs text-coco-text-tertiary mt-1">
            Balance: {formatBalance(wallet.balance.native, wallet.balance.nativeDecimals, wallet.balance.nativeSymbol)}
          </p>
        </div>

        <Input
          label="Recipient Address"
          placeholder={getAddressPlaceholder()}
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />

        <Input
          label={`Amount (${chain.nativeCurrency})`}
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="text"
        />

        <p className="text-xs text-coco-text-tertiary">
          Network: {chain.name}
        </p>

        {error && <p className="text-sm text-coco-error">{error}</p>}
      </div>
    </Modal>
  );
}
