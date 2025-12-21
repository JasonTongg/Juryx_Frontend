import React from "react";
import { motion } from "framer-motion";

export default function Tokenomics() {
  return (
    <div
      id="token"
      className="bg-purple-400 w-full min-h-screen text-6xl flex items-center justify-center"
    >
      <motion.div
        initial={{ transform: "translateX(-100px)", opacity: 0 }}
        whileInView={{ transform: "translateX(0px)", opacity: 1 }}
        exit={{ transform: "translateX(-100px)", opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        Tokenomics
      </motion.div>
    </div>
  );
}
