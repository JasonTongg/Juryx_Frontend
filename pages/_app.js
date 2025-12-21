import "../styles/globals.css";
import Layout from "../layout/default";
import { Provider } from "react-redux";
import Store from "../store/store";
import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const monad = {
  id: 10143,
  name: "Monad Testnet",
  iconUrl:
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcThzDdnUvl5j4wpYAQNodxL2IFT-VwGGXaH6srfa3LyXnVpn9nS4nrt-1AmbRUP9Vuvn6M&usqp=CAU",
  iconBackground: "#fff",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "MonadExplorer",
      url: "https://testnet.monadexplorer.com/",
    },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "0e50ad124798913a4af212355f956d06",
  chains: [mainnet, polygon, optimism, arbitrum, base, monad],
  ssr: true,
});

function MyApp({ Component, pageProps }) {
  const queryClient = new QueryClient();
  return (
    <Provider store={Store}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={darkTheme()} coolMode={true}>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </Provider>
  );
}

export default MyApp;
