'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Modal } from '@/components/ui';
import type { WalletWithBalance, Chain, TokenBalance } from '@/types';
import { sendTransaction } from '@/lib/wallet/transfer';
import { trackWalletSend } from '@/stores/action-tracking-store';

// Zod schema for send funds form
const sendFundsSchema = z.object({
  recipient: z.string().min(1, 'Recipient address is required'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Please enter a valid amount greater than 0',
    }),
});

type SendFundsInput = z.infer<typeof sendFundsSchema>;

interface SendModalProps {
  isOpen: boolean;
  wallet: WalletWithBalance;
  chain: Chain;
  token?: TokenBalance | null;
  onClose: () => void;
  onSuccess: (txHash: string) => void;
}

export function SendModal({
  isOpen,
  wallet,
  chain,
  token,
  onClose,
  onSuccess,
}: SendModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError: setFormError,
  } = useForm<SendFundsInput>({
    resolver: zodResolver(sendFundsSchema),
    defaultValues: {
      recipient: '',
      amount: '',
    },
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({ recipient: '', amount: '' });
    }
  }, [isOpen, reset]);

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

  const currencySymbol = token ? token.symbol : chain.nativeCurrency;

  const onSubmit = async (data: SendFundsInput) => {
    try {
      const txHash = await sendTransaction({
        walletId: wallet.id,
        recipient: data.recipient.trim(),
        amount: data.amount.trim(),
        chain,
        token: token || undefined,
      });

      // Track successful wallet send for AI context
      trackWalletSend({
        walletName: wallet.name,
        recipient: data.recipient.trim(),
        amount: data.amount.trim(),
        symbol: currencySymbol || 'ETH',
        success: true,
        txHash,
        chainId: chain.id,
        walletId: wallet.id,
      });

      onSuccess(txHash);
      handleClose();
    } catch (err) {
      const errorMessage = (err as Error).message;

      // Track failed wallet send for AI context
      trackWalletSend({
        walletName: wallet.name,
        recipient: data.recipient.trim(),
        amount: data.amount.trim(),
        symbol: currencySymbol || 'ETH',
        success: false,
        error: errorMessage,
        chainId: chain.id,
        walletId: wallet.id,
      });

      setFormError('root', { message: errorMessage });
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const formatBalance = (balance: string, decimals: number, symbol: string) => {
    const value = Number(balance) / Math.pow(10, decimals);
    return `${value.toFixed(4)} ${symbol}`;
  };

  const title = token ? `Send ${token.symbol}` : 'Send Funds';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
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
          {token ? (
            <p className="text-xs text-coco-text-tertiary mt-1">
              Token Balance: {formatBalance(token.balance, token.decimals, token.symbol)}
            </p>
          ) : (
            <p className="text-xs text-coco-text-tertiary mt-1">
              Balance: {formatBalance(wallet.balance.native, wallet.balance.nativeDecimals, wallet.balance.nativeSymbol)}
            </p>
          )}
        </div>

        {/* Token info badge */}
        {token && (
          <div className="flex items-center gap-2 bg-coco-accent/10 border border-coco-accent/20 rounded-lg p-2.5">
            {token.logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={token.logoUrl}
                alt={token.symbol}
                className="w-5 h-5 rounded-full"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-coco-bg-tertiary flex items-center justify-center">
                <span className="text-[10px] font-bold text-coco-text-secondary">
                  {token.symbol.slice(0, 2)}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-coco-accent">{token.name}</span>
            <span className="text-xs text-coco-text-tertiary">({token.symbol})</span>
          </div>
        )}

        <Input
          label="Recipient Address"
          placeholder={getAddressPlaceholder()}
          {...register('recipient')}
          error={errors.recipient?.message}
        />

        <Input
          label={`Amount (${currencySymbol})`}
          placeholder="0.0"
          {...register('amount')}
          type="text"
          error={errors.amount?.message}
        />

        <p className="text-xs text-coco-text-tertiary">
          Network: {chain.name}
        </p>

        {errors.root && <p className="text-sm text-coco-error">{errors.root.message}</p>}
      </div>
    </Modal>
  );
}
