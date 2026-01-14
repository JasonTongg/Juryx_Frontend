import Image from "next/image";
import React from "react";
import Logo from "../public/assets/Logo.png";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  return (
    <nav className="flex w-full z-[99] p-4 items-center justify-between gap-4 padding-section bg-white px-4 sm:px-6 lg:px-8 border-b-[#ececec] border-[4px]">
      <Image src={Logo} className="w-[180px]" />
      <ConnectButton showBalance={false} />
    </nav>
  );
}
