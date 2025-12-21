import React, { useEffect } from "react";
import About from "@/components/About";
import Social from "@/components/Social";
import Tokenomics from "@/components/Tokenomics";
import Hero from "@/components/Hero";
import { useSelector } from "react-redux";
import { fetchDexscreener, fetchDextools, fetchUniswap } from "@/store/data";
import Store from "@/store/store";
import HowToBuy from "@/components/HowToBuy";

export default function Index() {
  // Use useSelector to get the relevant state from Redux
  const {
    twitter,
    telegram,
    address,
    dextoolsUrl,
    uniswapUrl,
    dexscreenerUrl,
    pairAddress,
  } = useSelector((state) => state.data);

  const props = {
    address,
    twitter,
    telegram,
    dextoolsUrl,
    uniswapUrl,
    dexscreenerUrl,
    pairAddress,
  };

  return (
    <div className="w-full relative">
      <Hero {...props} />
      <About {...props} />
      <HowToBuy {...props} />
      <Tokenomics {...props} />
      <Social {...props} />
    </div>
  );
}

export async function getServerSideProps() {
  const state = Store.getState();
  const { twitter, telegram, address, pairAddress } = state.data;

  await Store.dispatch(fetchDexscreener(address));
  await Store.dispatch(fetchDextools(pairAddress));
  await Store.dispatch(fetchUniswap(address));

  // After dispatching actions, get the updated state
  const updatedState = Store.getState().data;

  const additionalProps = {
    address,
    twitter,
    telegram,
    dextoolsUrl: updatedState.dextoolsUrl,
    uniswapUrl: updatedState.uniswapUrl,
    dexscreenerUrl: updatedState.dexscreenerUrl,
  };

  return {
    props: {
      message: "Welcome to the SSR website!",
      ...additionalProps,
    },
  };
}
