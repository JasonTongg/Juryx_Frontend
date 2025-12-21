import React from "react";
import { motion } from "framer-motion";
import {
  ConnectButton,
  useConnectModal,
  useAccountModal,
  useChainModal,
} from "@rainbow-me/rainbowkit";
import { WalletButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance } from "wagmi";

export default function Hero() {
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { openChainModal } = useChainModal();
  const { address, isConnected } = useAccount();
  const { data: balance, isLoading } = useBalance({
    address,
  });

  console.log(balance);

  return (
    <div className="bg-green-400 w-full min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ transform: "translateX(-100px)", opacity: 0 }}
        whileInView={{ transform: "translateX(0px)", opacity: 1 }}
        exit={{ transform: "translateX(-100px)", opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-5"
      >
        {!isConnected ? (
          <div>
            <WalletButton wallet="rainbow" />
            <WalletButton wallet="metamask" />
            <WalletButton wallet="coinbase" />
            <WalletButton wallet="walletconnect" />
          </div>
        ) : (
          <div>
            {address && <p>Address: {address}</p>}
            {balance && (
              <p>
                {isLoading
                  ? "Loading..."
                  : `${balance?.formatted} ${balance?.symbol}`}
              </p>
            )}
          </div>
        )}
        <ConnectButton />

        {openConnectModal && (
          <button onClick={openConnectModal} type="button">
            Open Connect Modal
          </button>
        )}
        {openAccountModal && (
          <button onClick={openAccountModal} type="button">
            Open Account Modal
          </button>
        )}
        {openChainModal && (
          <button onClick={openChainModal} type="button">
            Open Chain Modal
          </button>
        )}
      </motion.div>
    </div>
  );
}
