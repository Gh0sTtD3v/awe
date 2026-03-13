import React from "react";
import ButtonPill from "../../../../ui/button-pill";
import SpriteIcon from "../../../../ui/sprite";
import { NoResult } from "../../../no-result";

const Wallet = {
  ethereum: {
    title: "Connect Wallet",
    chain: "Ethereum",
    icon: "studio/ethereum",
  },
  matic: {
    title: "Connect Wallet",
    chain: "Polygon",
    icon: "studio/polygon",
  },
  polygon: {
    title: "Connect Wallet",
    chain: "Polygon",
    icon: "studio/polygon",
  },
  arbitrum: {
    title: "Connect Wallet",
    chain: "Arbitrum",
    icon: "studio/arbitrum",
  },
  base: {
    title: "Connect Wallet",
    chain: "Base",
    icon: "studio/base",
  },
  avalanche: {
    title: "Connect Wallet",
    chain: "Avalanche",
    icon: "studio/avalanche",
  },
  zora: {
    title: "Connect Wallet",
    chain: "Zora",
    icon: "studio/zora",
  },
  optimism: {
    title: "Connect Wallet",
    chain: "Optimism",
    icon: "studio/optimism",
  },
};

type WalletChain = keyof typeof Wallet;

interface ConnectWalletProps {
  chain: WalletChain;
  onConnect: () => void;
}

export function ConnectWallet({ chain, onConnect }: ConnectWalletProps) {
  const data = Wallet[chain];

  if (!data) return null;

  return (
    <NoResult layout="fill">
      Connect your {data.chain} wallet to <br /> import your NFTs :
      <ButtonPill
        color="white"
        label={data.title}
        onClick={onConnect}
        className="connect-wallet"
      >
        <SpriteIcon id={data.icon} width={20} height={20} />
      </ButtonPill>
    </NoResult>
  );
}
