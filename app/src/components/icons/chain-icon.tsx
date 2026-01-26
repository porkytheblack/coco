import clsx from 'clsx';
import Image from 'next/image';
import { CustomIcon } from './chain-icons/custom';

// Map icon IDs to PNG files in /public/chain-icons/
const iconPaths: Record<string, string> = {
  ethereum: '/chain-icons/ethereum.png',
  base: '/chain-icons/base.png',
  polygon: '/chain-icons/polygon.png',
  arbitrum: '/chain-icons/arbitrum.png',
  optimism: '/chain-icons/optimism.png',
  avalanche: '/chain-icons/avalanche.png',
  bnb: '/chain-icons/bnb.png',
  hedera: '/chain-icons/hedera.png',
  solana: '/chain-icons/solana.png',
  aptos: '/chain-icons/aptos.png',
};

type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ChainIconProps {
  iconId: string;
  className?: string;
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  sm: 'w-6 h-6',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const sizePx: Record<Size, number> = {
  sm: 24,
  md: 40,
  lg: 56,
  xl: 80,
};

export function ChainIcon({ iconId, className, size = 'md' }: ChainIconProps) {
  const iconPath = iconPaths[iconId];

  // Use PNG image if available, otherwise fall back to custom SVG icon
  if (iconPath) {
    return (
      <Image
        src={iconPath}
        alt={`${iconId} icon`}
        width={sizePx[size]}
        height={sizePx[size]}
        className={clsx(sizeClasses[size], 'rounded-full', className)}
      />
    );
  }

  // Fallback for custom/unknown chains
  return <CustomIcon className={clsx(sizeClasses[size], className)} />;
}
