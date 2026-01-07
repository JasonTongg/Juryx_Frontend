import React from "react";
import { motion } from "framer-motion";
import { useAccount, useBalance } from "wagmi";

export default function Hero() {
  const { address, isConnected } = useAccount();
  const { data: balance, isLoading } = useBalance({
    address,
  });

  return (
    <div className="bg-green-400 w-full min-h-screen flex items-center justify-center">
      <motion.div
        initial={{ transform: "translateX(-100px)", opacity: 0 }}
        whileInView={{ transform: "translateX(0px)", opacity: 1 }}
        exit={{ transform: "translateX(-100px)", opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-5"
      >
        {isConnected && (
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
      </motion.div>
    </div>
  );
}
