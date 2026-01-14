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
import { sepolia } from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { http } from "wagmi";

const local = {
  id: 31337,
  name: "Local Network",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
  testnet: true,
};

const config = getDefaultConfig({
  appName: "My RainbowKit App",
  projectId: "0e50ad124798913a4af212355f956d06",
  chains: [sepolia],
  ssr: true,
  transports: {
    [sepolia.id]: http("https://eth-sepolia.g.alchemy.com/v2/C1DgpjpXG7XuKZnovfftQ"),
  },
});

const customTheme = {
  blurs: {
    modalOverlay: "6px",
  },
  //737070
  colors: {
    accentColor: "#5245e5",
    accentColorForeground: "#FFFFFF",
    actionButtonBorder: "#dadada",
    actionButtonBorderMobile: "#dadada",
    actionButtonSecondaryBackground: "#f5f5f5",
    closeButton: "#5e6a5e",
    closeButtonBackground: "#ffffff",
    connectButtonBackground: "#5245e5",
    connectButtonBackgroundError: "#5245e5",
    connectButtonInnerBackground: "#5245e5",
    connectButtonText: "#FFFFFF",
    connectButtonTextError: "#FFFFFF",
    connectionIndicator: "#26a17b",
    downloadBottomCardBackground: "#f5f5f5",
    downloadTopCardBackground: "#ffffff",
    error: "#5245e5",
    generalBorder: "#dadada",
    generalBorderDim: "#adad9b",
    menuItemBackground: "#f5f5f5",
    modalBackdrop: "rgba(0, 0, 0, 0.75)",
    modalBackground: "#ffffff",
    modalBorder: "#dadada",
    modalText: "#0e100e",
    modalTextDim: "#5e6a5e",
    modalTextSecondary: "#adad9b",
    profileAction: "#f5f5f5",
    profileActionHover: "#5245e5",
    profileForeground: "#ffffff",
    selectedOptionBorder: "#5245e5",
    standby: "#5245e5",
  },
  fonts: {
    body: "",
  },
  radii: {
    actionButton: "4px",
    connectButton: "10px",
    menuButton: "4px",
    modal: "6px",
    modalMobile: "6px",
  },
  shadows: {
    connectButton: "",
    dialog: "0px 10px 20px rgba(0, 0, 0, 0.3)",
    profileDetailsAction: "0px 2px 5px rgba(0, 0, 0, 0.2)",
    selectedOption: "0px 0px 6px rgba(255, 0, 122, 0.6)",
    selectedWallet: "0px 0px 10px rgba(255, 0, 122, 0.8)",
    walletLogo: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
};

function MyApp({ Component, pageProps }) {
  const queryClient = new QueryClient();
  return (
    <Provider store={Store}>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={customTheme}>
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
