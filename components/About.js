import React from "react";
import { motion } from "framer-motion";

export default function About({ address }) {
  return (
    <div
      id="about"
      className="bg-red-400 w-full min-h-screen text-6xl flex items-center justify-center"
    >
      <motion.div
        initial={{ transform: "translateX(-100px)", opacity: 0 }}
        whileInView={{ transform: "translateX(0px)", opacity: 1 }}
        exit={{ transform: "translateX(-100px)", opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="break-all max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        About, {address}
      </motion.div>
    </div>
  );
}
