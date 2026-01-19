"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  useAccount,
  useBalance,
  useWriteContract,
  useReadContract,
  useWaitForTransactionReceipt,
  useDeployContract,
  useSignMessage
} from "wagmi";
import { useSelector } from "react-redux";
import { parseEventLogs, encodeAbiParameters, parseAbiParameters, encodeFunctionData, keccak256, erc20Abi, formatEther } from "viem";
import { IoMdCloseCircleOutline, IoMdAddCircleOutline } from "react-icons/io";
import { encode } from "punycode";
import { createPublicClient, http, toHex } from "viem";
import { sepolia } from "viem/chains";
import { parseUnits, parseEther, getAddress } from "viem";
import { toast } from "react-toastify";
import { FaPlus } from "react-icons/fa";
import { FaWallet } from "react-icons/fa";
import { FaPaperPlane } from "react-icons/fa";
import { FaRegClock } from "react-icons/fa";
import { FaCheckCircle } from "react-icons/fa";
import { FaCheckDouble } from "react-icons/fa6";
import { PiPiggyBankFill } from "react-icons/pi";
import Logo from "../public/assets/Logo.png";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { FaClock } from "react-icons/fa6";
import { FaSignature } from "react-icons/fa";
import { IoCopy } from "react-icons/io5";
import { FaCheck } from "react-icons/fa";
import { FaCode } from "react-icons/fa";
import { FaEthereum, FaImage, FaCoins } from "react-icons/fa6";
import Link from "next/link";

const ERC20_TRANSFER_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
]

const ERC721_TRANSFER_ABI = [
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
];


const ENTRY_POINT_ADDRESS = process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS;

export default function Hero() {
  const { address, isConnected } = useAccount();
  const { abi, factoryByteCode } = useSelector((state) => state.data);
  const { signMessageAsync } = useSignMessage();

  // State for dynamic signers and threshold
  const [signerAddresses, setSignerAddresses] = useState([""]);
  const [threshold, setThreshold] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [deployedAccount, setDeployedAccount] = useState("");
  const [signerFor, setSignerFor] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [isLoadingSign, setIsLoadingSign] = useState(false);
  const [isLoadingExecute, setIsLoadingExecute] = useState(false);

  // --- New State for Execution Section ---
  const [target, setTarget] = useState("");
  const [value, setValue] = useState("");
  const [callData, setCallData] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [value2, setValue2] = React.useState("Transfer");
  const [transferType, setTransferType] = useState("eth");
  const [tokenReceiver, setTokenReceiver] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [approveType, setApproveType] = useState("approve-erc20");
  const [approveSpender, setApproveSpender] = useState("");
  const [approveAmount, setApproveAmount] = useState("");
  const [approveTokenId, setApproveTokenId] = useState("");
  const [tab, setTab] = useState(0);

  const handleChange = (event, newValue) => {
    setValue2(newValue);
  };

  const { writeContractAsync: executeTx } = useWriteContract();
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(),
  });

  // Set the connected wallet as the first signer by default when it connects
  useEffect(() => {
    if (address && signerAddresses[0] === "") {
      const newSigners = [...signerAddresses];
      newSigners[0] = address;
      setSignerAddresses(newSigners);
    }
  }, [address]);

  /* ---------------- Factory Deployment ---------------- */
  const { deployContractAsync: deployFactory, data: deployHash } = useDeployContract();
  const { data: deployReceipt, isSuccess: factoryDeployed } = useWaitForTransactionReceipt({
    hash: deployHash,
  });

  const [executedHistory, setExecutedHistory] = useState({});

  const loadHistory = async (userAddress) => {
    const response = await fetch(`/api/getUserExecutedRequests?address=${userAddress}`);
    const data = await response.json();
    if (data.success) {
      setExecutedHistory(data.history);
    } else {
      toast.error(data.error)
    }
  };

  const factoryAddress = deployReceipt?.contractAddress;

  /* ---------------- Account Creation ---------------- */
  const {
    writeContractAsync: createAccount,
    data: createHash,
    error: createError,
  } = useWriteContract();

  const { data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash });
  const accountCreatedRef = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (factoryDeployed && factoryAddress && address && !accountCreatedRef.current) {
        accountCreatedRef.current = true;

        const validSigners = signerAddresses.filter((s) => s.trim() !== "");

        try {
          await createAccount({
            address: factoryAddress,
            abi: abi.AccountFactoryAbi,
            functionName: "createAccount",
            args: [validSigners, BigInt(threshold), ENTRY_POINT_ADDRESS],
          });
        } catch (error) {
          setIsLoading(false);
          const message =
            error?.shortMessage ||
            error?.message ||
            "Unknown error";

          toast.error(message);
        }
      }
    }

    run();
  }, [factoryDeployed, factoryAddress, address, createAccount, abi, signerAddresses, threshold]);

  useEffect(() => {
    if (createReceipt) {
      setIsLoading(false);
      setUserApi();
      toast.success("Account successfully created...");
    }
  }, [createReceipt]);

  /* ---------------- Handlers ---------------- */
  const handleDeploy = async () => {
    if (!address || !factoryByteCode) return;
    if (deployedAccount || newAccountAddress) {
      toast.error("Account already deployed");
      return;
    }
    setIsLoading(true);
    accountCreatedRef.current = false;

    try {
      toast.info("Creating Account...");
      await deployFactory({
        abi: abi.AccountFactoryAbi,
        bytecode: factoryByteCode,
        args: [],
      });
    } catch (error) {
      const message =
        error?.shortMessage ||
        error?.message ||
        "Unknown error";

      toast.error(message);
      setIsLoading(false);
    }
  };

  const handleRequest = async (accountAddress, type) => {
    if (myRequests.some(item => item.account === (deployedAccount || newAccountAddress))) return;

    fetchUserData(address);

    let payload;

    if (type === "erc20") {
      const calldata2 = await buildErc20TransferCalldata(
        target,
        tokenReceiver,
        tokenAmount
      );

      payload = {
        accountAddress: accountAddress,
        target: target,
        value: "0",
        data: calldata2,
        reason: "Token Transfer",
        note: "Token Transfer Request"
      };
    }
    else if (type === "nft") {
      const calldata3 = await buildErc721TransferCalldata(
        deployedAccount,
        tokenReceiver,
        tokenId
      );

      payload = {
        accountAddress: accountAddress,
        target: target,
        value: "0",
        data: calldata3,
        reason: "NFT Transfer",
        note: "NFT Transfer Request"
      };
    }
    else if (type === "approve-erc20") {
      const calldata4 = await buildErc20ApproveCalldata(
        target,
        approveSpender,
        approveAmount
      );

      payload = {
        accountAddress: accountAddress,
        target: target,
        value: "0",
        data: calldata4,
        reason: "Token Approve",
        note: "Token Approve Request"
      };
    }
    else if (type === "approve-nft") {
      const calldata4 = await buildErc721ApproveTokenCalldata(
        approveSpender,
        approveTokenId
      );

      payload = {
        accountAddress: accountAddress,
        target: target,
        value: "0",
        data: calldata4,
        reason: "NFT Approve",
        note: "NFT Approve Request"
      };
    }
    else {
      payload = {
        accountAddress: accountAddress,
        target: target,
        value: value,
        data: callData,
        reason: callData.length > 0 ? "Custom Transaction" : "ETH Transfer",
        note: callData.length > 0 ? "Custom Transaction Request" : "ETH Transfer Request"
      };
    }

    try {
      await fetch("/api/createRequest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      loadRequests(address);
      loadHistory(address);
    } catch (error) {
      toast.error("Error submitting request");
    } finally {
      toast.success("Transaction request submitted");
      setTarget("");
      setValue("");
      setCallData("");
      setTokenReceiver("");
      setTokenAmount("");
      setTokenId("");
      setApproveSpender("");
      setApproveTokenId("");
      setApproveAmount("");
    }
  };

  const updateSigner = (index, val) => {
    const newSigners = [...signerAddresses];
    newSigners[index] = val;
    setSignerAddresses(newSigners);
  };

  const addSignerField = () => setSignerAddresses([...signerAddresses, ""]);

  const removeSignerField = (index) => {
    if (signerAddresses.length > 1) {
      setSignerAddresses(signerAddresses.filter((_, i) => i !== index));
    }
  };

  /* ---------------- Parse Event & API ---------------- */
  const newAccountAddress = useMemo(() => {
    if (!createReceipt || !abi.AccountFactoryAbi) return null;
    try {
      const logs = parseEventLogs({
        abi: abi.AccountFactoryAbi,
        eventName: "AccountCreated",
        logs: createReceipt.logs,
      });
      return logs[0]?.args?.account ?? null;
    } catch (err) {
      return null;
    }
  }, [createReceipt, abi]);

  async function setUserApi() {
    if (factoryAddress && newAccountAddress) {
      const setUser = async () => {
        await fetch("/api/user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: address, factory: factoryAddress, account: newAccountAddress }),
        });
      };

      const addOwner = async () => {
        await fetch("/api/addOwner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account: newAccountAddress, owners: signerAddresses }),
        });
      }
      setUser();
      addOwner();
      fetchUserData(address);
    }
  }

  const loadRequests = async (userAddress) => {
    const response = await fetch(`/api/getUserRequests?address=${userAddress}`);
    const data = await response.json();
    if (data.success) {
      setMyRequests(data.requests);
    }
  };

  const fetchUserData = async (userAddress) => {
    if (!userAddress) return;
    try {
      const response = await fetch(`/api/getUserData?address=${userAddress}`);
      const result = await response.json();

      if (result.success) {
        setDeployedAccount(result.deployedAccounts);
        setSignerFor(result.ownerOf);
      }
    } catch (error) {
      toast.error("Fetch User error");
    }
  };

  useEffect(() => {
    fetchUserData(address);
    loadRequests(address);
    loadHistory(address);
  }, [address]);

  const handleSign = async (accountAddress, target, value, data, currentSignatures, threshold) => {
    try {
      setIsLoadingSign(true);
      toast.info("Signing Message...");
      const plainString = "Hello Multisig";
      const messageHash = keccak256(toHex(plainString));

      const signature = await signMessageAsync({
        message: { raw: messageHash }
      });

      toast.success("Message signed successfully!");

      await fetch("/api/addSignature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account: accountAddress,
          owner: address,
          signature: signature
        }),
      });

      if (currentSignatures + 1 >= threshold) {
        await updateStatus(accountAddress, "Ready");
      }
      loadRequests(address);
      loadHistory(address);
      setIsLoadingSign(false);
    } catch (err) {
      const message =
        err?.shortMessage ||
        err?.message ||
        "Unknown error";

      toast.error(message);
      setIsLoadingSign(false);
    }
  };

  const updateStatus = async (accountAddr, status) => {
    try {
      const response = await fetch("/api/updateRequestStatus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountAddress: accountAddr,
          newStatus: status, // e.g., "executed"
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.info(`Status updated to ${status}`);
      }
    } catch (error) {
      toast.error("Failed to update status", error);
    }
  };

  const getHexNonce = async (senderAddress) => {
    try {
      const nonce = await publicClient.readContract({
        address: process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS,
        abi: abi.EntryPointAbi,
        functionName: "getNonce",
        args: [senderAddress, BigInt(0)],
      });
      return toHex(nonce);
    } catch (error) {
      toast.error("Error fetching nonce");
    }
  };

  const handleExecute = async (req) => {
    setIsLoading(true);
    try {
      toast.info("Executing Transaction...");

      const hexNonce = (await getHexNonce(req.account)).toString(16);

      const userOp = {
        sender: getAddress(req.account),
        nonce: hexNonce,
        initCode: "0x",
        callData: encodeFunctionData({
          abi: abi.AccountAbi,
          functionName: "execute",
          args: [
            req.targetAddress,
            toHex(parseEther(req.value)),
            req.data
          ],
        }),
        paymasterAndData: "0x",
        signature: "0x",
      };

      userOp.verificationGasLimit = toHex(1500000n);
      userOp.preVerificationGas = toHex(500000n);
      userOp.callGasLimit = toHex(200000n);
      userOp.maxFeePerGas = "0x0bebc200";
      userOp.maxPriorityFeePerGas = "0x0bebc200";

      const sortedSignatures = [...req.signatures].sort((a, b) =>
        getAddress(a.signerAddress).toLowerCase().localeCompare(getAddress(b.signerAddress).toLowerCase())
      );

      const sigsArray = sortedSignatures?.map(s => s.signature);

      const encodedSignatures = encodeAbiParameters(
        parseAbiParameters('bytes[]'),
        [sigsArray]
      );

      userOp.signature = encodedSignatures;

      handleFinalExecution(userOp, req);

    } catch (err) {
      const message =
        err?.shortMessage ||
        err?.message ||
        "Unknown error";

      toast.error(message);
    } finally {
      setIsLoading(false);

    }
  };

  const { writeContractAsync: writeContractExecute } = useWriteContract();

  const handleFinalExecution = async (userOp, req) => {
    setIsLoading(true);
    setIsLoadingExecute(true);
    try {
      const txHash = await writeContractExecute({
        address: process.env.NEXT_PUBLIC_ENTRYPOINT_ADDRESS,
        abi: abi.EntryPointAbi,
        functionName: "handleOps",
        args: [
          [userOp],
          address
        ],
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash
      });

      if (receipt.status === "success") {
        await updateStatus(req.account, "Executed");

        await Promise.all([
          loadRequests(address),
          loadHistory(address)
        ]);

        toast.success("Transaction Executed Successfully!");
      } else {
        toast.error("Transaction reverted on-chain");
      }
    } catch (err) {
      const message =
        err?.shortMessage ||
        err?.message ||
        "Unknown error";

      toast.error(message);
    } finally {
      setIsLoading(false);
      setIsLoadingExecute(false);
      refetchBalance();
    }
  };

  async function buildErc20TransferCalldata(
    tokenAddress,
    to,
    amount,
  ) {

    const decimals = await publicClient.readContract({
      address: getAddress(tokenAddress),
      abi: ERC20_TRANSFER_ABI,
      functionName: "decimals",
    })

    return encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args: [
        getAddress(to),
        parseUnits(amount, decimals),
      ],
    })
  }

  async function buildErc721TransferCalldata(
    from,
    to,
    tokenId
  ) {
    return encodeFunctionData({
      abi: ERC721_TRANSFER_ABI,
      functionName: "safeTransferFrom",
      args: [
        getAddress(from),
        getAddress(to),
        BigInt(tokenId),
      ],
    });
  }

  async function buildErc20ApproveCalldata(
    tokenAddress,
    spender,
    amount
  ) {
    const decimals = await publicClient.readContract({
      address: getAddress(tokenAddress),
      abi: ERC20_TRANSFER_ABI,
      functionName: "decimals",
    });

    return encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "approve",
      args: [
        getAddress(spender),
        parseUnits(amount, decimals),
      ],
    });
  }

  async function buildErc721ApproveTokenCalldata(
    operator,
    tokenId
  ) {
    return encodeFunctionData({
      abi: ERC20_TRANSFER_ABI,
      functionName: "approve",
      args: [
        getAddress(operator),
        BigInt(tokenId),
      ],
    });
  }

  function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = text;

        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textarea);

        successful ? resolve() : reject(new Error("Copy failed"));
      } catch (err) {
        reject(err);
      }
    });
  }

  const { data: balance } = useBalance({ address: deployedAccount || newAccountAddress });

  /* ---------------- Gas Deposit ---------------- */
  const { writeContractAsync: writeDeposit } = useWriteContract();

  const depositToEntryPoint = async () => {
    const accountToFund = deployedAccount || newAccountAddress;

    if (!accountToFund) {
      toast.error("No Smart Account found to fund");
      return;
    }

    try {
      toast.info("Depositing gas to EntryPoint...");

      const txHash = await writeDeposit({
        address: ENTRY_POINT_ADDRESS,
        abi: abi.EntryPointAbi,
        functionName: "depositTo",
        args: [accountToFund],
        value: parseEther("0.1"), // You can make this dynamic if needed
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      toast.success("Gas deposit successful!");

      // Refresh balance after deposit
      refetchBalance();
    } catch (err) {
      toast.error("Deposit failed");
      toast.error(err?.shortMessage || "Deposit failed");
    }
  };

  const { data: entryPointDeposit, refetch: refetchBalance } = useReadContract({
    address: ENTRY_POINT_ADDRESS,
    abi: abi.EntryPointAbi,
    functionName: "balanceOf",
    args: [deployedAccount || newAccountAddress],
    query: {
      enabled: !!(deployedAccount || newAccountAddress),
    }
  });

  return (
    <div className="w-full grid grid-style" style={{ minHeight: "calc(100vh - 110px)" }}>
      <div className="w-full bg-white hidden lg:flex flex-col items-center border-r-[1px] border-gray-100">
        <div className="border-b-[1px] border-gray-200 w-full p-4 py-[24px]">
          <Image src={Logo} className="w-[180px] mx-auto" />
        </div>
        <div className="flex flex-col items-start justify-center w-full gap-1 p-4">
          <Link className=" w-full flex justify-start py-3 px-5 rounded-[10px] items-center gap-2" style={tab === 0 ? { color: "#5245e5", backgroundColor: "#eef2ff" } : { color: "#737070", backgroundColor: "transparent" }} onClick={() => setTab(0)} href="#wallet"><FaWallet /> My Wallets</Link>
          <Link className=" w-full flex justify-start py-3 px-5 rounded-[10px] items-center gap-2" style={tab === 1 ? { color: "#5245e5", backgroundColor: "#eef2ff" } : { color: "#737070", backgroundColor: "transparent" }} onClick={() => setTab(1)} href="#new"><FaPaperPlane /> New Transaction</Link>
          <Link className=" w-full flex justify-start py-3 px-5 rounded-[10px] items-center gap-2" style={tab === 2 ? { color: "#ea580c", backgroundColor: "#ffedd5" } : { color: "#737070", backgroundColor: "transparent" }} onClick={() => setTab(2)} href="#pending"><FaRegClock /> Pending <div className="bg-[#ffedd5] text-[#ea580c] font-bold w-[25px] h-[25px] flex items-center justify-center rounded-[30px]">{myRequests?.filter(item => item?.status?.toLowerCase() === "pending")?.length}</div></Link>
          <Link className=" w-full flex justify-start py-3 px-5 rounded-[10px] items-center gap-2" style={tab === 3 ? { color: "#16A34A", backgroundColor: "#DCFCE7" } : { color: "#737070", backgroundColor: "transparent" }} onClick={() => setTab(3)} href="#ready"><FaCheckCircle /> Ready to Execute <div className="bg-[#DCFCE7] text-[#16A34A] font-bold w-[25px] h-[25px] flex items-center justify-center rounded-[30px]">{myRequests.filter(item => item.status.toLowerCase() === "ready").length}</div></Link>
          <Link className=" w-full flex justify-start py-3 px-5 rounded-[10px] items-center gap-2" style={tab === 4 ? { color: "#ea0c0c", backgroundColor: "#ffd5d5" } : { color: "#737070", backgroundColor: "transparent" }} onClick={() => setTab(4)} href="#executed"><FaCheckDouble /> Executed </Link>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between py-4 px-12 border-b-[1px] border-gray-100 gap-2">
          <div className="flex flex-col">
            <h2 className="text-xl sm:text-2xl font-bold tracking-wider mb-[5px] sm:block hidden">Multi-Signature Wallet</h2>
            <p className="sm:text-base text-sm text-gray-500 sm:block hidden">Manage your secure multi-sig wallet</p>
            <div className="border-b-[1px] border-gray-200 w-full p-4 py-[24px] sm:hidden block">
              <Image src={Logo} className="w-[180px] mx-auto" />
            </div>
          </div>
          <div>
            <ConnectButton />
          </div>
        </div>
        <div className="bg-[#f7f7f7] flex p-2 sm:p-8 flex-col gap-4 ">
          {(deployedAccount || newAccountAddress) && <div id="wallet" className="shadow-md break-all bg-[rgba(255,255,255,1)] border-[1px] rounded-[1000px] flex items-center justify-start gap-3 w-fit overflow-hidden pr-5">
            <div className="bg-gradient-to-br from-[#9134EA] to-[#305EEB] text-white py-2 pl-5 pr-4 border-r-[1px]">
              <FaWallet />
            </div>
            <p className="text-xs sm:text-base">{deployedAccount || newAccountAddress}</p>
            <IoCopy className="text-[#305EEB] cursor-pointer" onClick={() => {
              copyTextToClipboard(deployedAccount || newAccountAddress)
              toast.success("Copied to Clipboard..")
            }} />
          </div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="shadow-md flex flex-col bg-gradient-to-br from-[#9134EA] to-[#305EEB] p-5 rounded-[20px]">
              <div className="flex items-center justify-between w-full">
                <div className="bg-[rgba(255,255,255,0.2)] h-[50px] w-[50px] rounded-2xl flex items-center justify-center">
                  <PiPiggyBankFill className="text-white text-3xl" />
                </div>
                <p className="bg-[rgba(255,255,255,0.2)] text-white py-1 px-5 rounded-[10px] w-fit font-bold">
                  Active
                </p>
              </div>
              <p className="text-[rgba(255,255,255,0.7)] mt-[1rem]">Wallet Balance</p>
              <h2 className="text-[rgba(255,255,255,1)] font-bold text-3xl my-[0.2rem] break-all">{balance?.formatted || 0} ETH</h2>
            </div>
            <div className="shadow-md flex flex-col bg-gradient-to-br from-[#9134EA] to-[#305EEB] p-5 rounded-[20px]">
              <div className="flex items-center justify-between w-full">
                <div className="bg-[rgba(255,255,255,0.2)] h-[50px] w-[50px] rounded-2xl flex items-center justify-center">
                  <PiPiggyBankFill className="text-white text-3xl" />
                </div>
                <p className="bg-[rgba(255,255,255,0.2)] text-white py-1 px-5 rounded-[10px] w-fit font-bold">
                  Active
                </p>
              </div>
              <p className="text-[rgba(255,255,255,0.7)] mt-[1rem]">Wallet Gas Balance</p>
              <h2 className="text-[rgba(255,255,255,1)] font-bold text-3xl my-[0.2rem] break-all">{formatEther(entryPointDeposit || "0")} ETH</h2>
              <button
                className="mt-2 bg-white text-[#305EEB] font-bold py-1 px-4 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                onClick={depositToEntryPoint}
                disabled={!isConnected || (!deployedAccount && !newAccountAddress)}
              >
                Deposit 0.1 ETH
              </button>
            </div>
            <div className="shadow-md flex flex-col bg-white p-5 rounded-[20px] border-[1px] border-gray-200">
              <div className="flex items-center justify-between w-full">
                <div className="bg-[#ffedd5] h-[50px] w-[50px] rounded-2xl flex items-center justify-center">
                  <FaClock className="text-[#ea580c] text-3xl" />
                </div>
                <p className="bg-[rgba(255,255,255,0.2)] text-white py-1 px-5 rounded-[10px] w-fit font-bold">
                  Active
                </p>
              </div>
              <p className="text-[rgba(0,0,0,0.7)] mt-[1rem]">Pending Transaction</p>
              <h2 className="text-[rgba(0,0,0,1)] font-bold text-3xl my-[0.2rem]">{myRequests?.filter(item => item?.status?.toLowerCase() === "pending")?.length} Transactions</h2>
              <p className="text-red-400">Required Signature</p>
            </div>
            <div className="shadow-md flex flex-col bg-white p-5 rounded-[20px] border-[1px] border-gray-200">
              <div className="flex items-center justify-between w-full">
                <div className="bg-[#DCFCE7] h-[50px] w-[50px] rounded-2xl flex items-center justify-center">
                  <FaSignature className="text-[#16A34A] text-3xl" />
                </div>
                <p className="bg-[rgba(255,255,255,0.2)] text-white py-1 px-5 rounded-[10px] w-fit font-bold">
                  Active
                </p>
              </div>
              <p className="text-[rgba(0,0,0,0.7)] mt-[1rem]">Wallet as Signer</p>
              <h2 className="text-[rgba(0,0,0,1)] font-bold text-3xl my-[0.2rem]">{signerFor.length} Signers</h2>
              <p className="text-[rgba(0,0,0,0.7)]">Connected wallet signer roles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="flex flex-col gap-4 bg-white p-6 rounded-xl shadow-lg w-full border border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">Create Multi-Sig Account</h2>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Signer Addresses</label>
                {signerAddresses?.map((signer, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={signer}
                      onChange={(e) => updateSigner(index, e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    {signerAddresses.length > 1 && (
                      <button onClick={() => removeSignerField(index)} className="text-[#355BEB] ">
                        <IoMdCloseCircleOutline size={24} />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={addSignerField}
                  className="flex items-center gap-1 text-sm text-[#355BEB] font-medium hover:underline"
                >
                  <IoMdAddCircleOutline size={18} /> Add Signer
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Required Threshold</label>
                <input
                  type="number"
                  min="1"
                  max={signerAddresses.length}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                />
              </div>

              <button
                className="w-fit px-[30px] bg-[#355BEB] text-white font-bold py-3 rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={handleDeploy}
                disabled={!isConnected || isLoading || !signerAddresses[0]}
              >
                {isLoading ? "Processing..." : <span className="flex items-center justify-center gap-2"><FaPaperPlane /> Create Account</span>}
              </button>

            </div>

            <div className="flex flex-col gap-4 bg-white p-6 rounded-xl shadow-lg w-full border border-gray-100" id="new">
              <h2 className="text-xl font-bold text-gray-800">Create New Transaction</h2>
              <div className="w-full flex items-center justify-start border-b-[1px]">
                <button
                  className="pb-[10px] px-[20px] flex items-center justify-center gap-2"
                  style={
                    value2 === "Transfer"
                      ? { borderBottom: "2px solid #355BEB", color: "#355BEB" }
                      : undefined
                  }
                  onClick={() => setValue2("Transfer")}
                >
                  <FaPaperPlane />
                  Transfer
                </button>

                <button
                  className="pb-[10px] px-[20px] flex items-center justify-center gap-2"
                  style={
                    value2 === "Approve"
                      ? { borderBottom: "2px solid #355BEB", color: "#355BEB" }
                      : undefined
                  }
                  onClick={() => setValue2("Approve")}
                >
                  <FaCheck />
                  Approve
                </button>

                <button
                  className="pb-[10px] px-[20px] flex items-center justify-center gap-2"
                  style={
                    value2 === "Custom"
                      ? { borderBottom: "2px solid #355BEB", color: "#355BEB" }
                      : undefined
                  }
                  onClick={() => setValue2("Custom")}
                >
                  <FaCode className="text-lg" />
                  Custom
                </button>
              </div>


              {value2 === "Transfer" && <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Transaction Type</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button style={transferType === "eth" ? { borderColor: "#355BEB", backgroundColor: "#FAF5FF", color: "#355BEB" } : { borderColor: "#d1d5db", backgroundColor: "rgba(0, 0, 0, 0.01) " }} className="border-[2px] py-2 px-4 text-center rounded-xl flex items-center justify-center gap-2 font-bold" onClick={() => {
                      setTransferType("eth");
                    }}><FaEthereum /> ETH</button>
                    <button style={transferType === "erc20" ? { borderColor: "#355BEB", backgroundColor: "#FAF5FF", color: "#355BEB" } : { borderColor: "#d1d5db", backgroundColor: "rgba(0, 0, 0, 0.01) " }} className="border-[2px] py-2 px-4 text-center rounded-xl flex items-center justify-center gap-2 font-bold" onClick={() => {
                      setTransferType("erc20");
                      setValue("0");
                      setCallData("");
                    }}><FaCoins /> Token</button>
                    <button style={transferType === "nft" ? { borderColor: "#355BEB", backgroundColor: "#FAF5FF", color: "#355BEB" } : { borderColor: "#d1d5db", backgroundColor: "rgba(0, 0, 0, 0.01) " }} className="border-[2px] py-2 px-4 text-center rounded-xl flex items-center justify-center gap-2 font-bold" onClick={() => {
                      setTransferType("nft");
                      setValue("0");
                      setCallData("");
                    }}><FaImage /> NFT</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 !gap-x-5 !gap-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">{transferType === "eth" ? "Receiver Address" : transferType === "erc20" ? "Token Address" : "NFT Address"}</label>
                    <input
                      type="text"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0x..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Amount (ETH)</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => {
                        setValue(e.target.value);
                      }}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0"
                      disabled={transferType === "erc20" || transferType === "nft"}
                    />
                  </div>

                  {(transferType === "erc20" || transferType === "nft") && <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Receiver Address</label>
                    <input
                      type="text"
                      value={tokenReceiver}
                      onChange={(e) => setTokenReceiver(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0x..."
                    />
                  </div>}

                  {(transferType === "erc20") && <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Amount (ETH)</label>
                    <input
                      type="number"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0x..."
                    />
                  </div>}

                  {(transferType === "nft") && <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Token ID</label>
                    <input
                      type="number"
                      value={tokenId}
                      onChange={(e) => setTokenId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0x..."
                    />
                  </div>}
                </div>

                <button
                  className="w-fit px-[30px] bg-[#355BEB] text-white font-bold py-3 rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={() => handleRequest(deployedAccount || newAccountAddress, transferType)}
                  disabled={myRequests.some(item => item.account === (deployedAccount || newAccountAddress))}
                >
                  <FaPaperPlane /> Create Transaction
                </button>
              </div>}
              {value2 === "Approve" && <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 uppercase">Transaction Type</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button style={approveType === "approve-erc20" ? { borderColor: "#355BEB", backgroundColor: "#FAF5FF", color: "#355BEB" } : { borderColor: "#d1d5db", backgroundColor: "rgba(0, 0, 0, 0.01) " }} className="border-[2px] py-2 px-4 text-center rounded-xl flex items-center justify-center gap-2 font-bold" onClick={() => {
                      setApproveType("approve-erc20");
                      setValue("0");
                      setCallData("");
                    }}><FaCoins /> Token</button>
                    <button style={approveType === "approve-nft" ? { borderColor: "#355BEB", backgroundColor: "#FAF5FF", color: "#355BEB" } : { borderColor: "#d1d5db", backgroundColor: "rgba(0, 0, 0, 0.01) " }} className="border-[2px] py-2 px-4 text-center rounded-xl flex items-center justify-center gap-2 font-bold" onClick={() => {
                      setApproveType("approve-nft");
                      setValue("0");
                      setCallData("");
                    }}><FaImage /> NFT</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 !gap-x-5 !gap-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Token Address</label>
                    <input
                      type="text"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0x..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Spender Address</label>
                    <input
                      type="text"
                      value={approveSpender}
                      onChange={(e) => setApproveSpender(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0"
                    />
                  </div>

                  {approveType === "approve-erc20" && <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Amount (ETH)</label>
                    <input
                      type="number"
                      value={approveAmount}
                      onChange={(e) => setApproveAmount(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0"
                    />
                  </div>}

                  {approveType === "approve-nft" && <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Token ID</label>
                    <input
                      type="number"
                      value={approveTokenId}
                      onChange={(e) => setApproveTokenId(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0"
                    />
                  </div>}
                </div>

                <button
                  className="w-fit px-[30px] bg-[#355BEB] text-white font-bold py-3 rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={() => handleRequest(deployedAccount || newAccountAddress, approveType)}
                  disabled={myRequests.some(item => item.account === (deployedAccount || newAccountAddress))}
                >
                  <FaPaperPlane /> Create Transaction
                </button>
              </div>}
              {value2 === "Custom" && <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 !gap-x-5 !gap-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Target Address</label>
                    <input
                      type="text"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0x..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-600 uppercase">Value (ETH)</label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm outline-none"
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Data (Hex)</label>
                    <textarea
                      value={callData}
                      onChange={(e) => setCallData(e.target.value)}
                      className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm font-mono h-20 outline-none"
                      placeholder="0x..."
                    />
                  </div>
                </div>

                <button
                  className="w-fit px-[30px] bg-[#355BEB] text-white font-bold py-3 rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  onClick={() => handleRequest(deployedAccount || newAccountAddress)}
                  disabled={myRequests.some(item => item.account === (deployedAccount || newAccountAddress))}
                >
                  <FaPaperPlane /> Create Transaction
                </button>
              </div>}
            </div>
          </div>

          <div className="flex flex-col p-4 bg-white shadow-md border-[1px] rounded-[15px]">
            <h2 className="text-xl font-bold">Wallet as Signer</h2>
            <p className="text-[rgba(0,0,0,0.5)] mt-[0.4rem] mb-[1rem]">Connected wallet signer roles</p>
            {signerFor?.map((acc, i) => (
              <div className=" flex items-center justify-between gap-4 rounded-[15px] border-[1px] py-3 px-4 w-full bg-[rgba(169,183,232,0.3)]">
                <div className="flex items-center justify-start gap-4 ">
                  <div className="bg-gradient-to-br from-[#9134EA] to-[#305EEB] text-white min-w-[35px] min-h-[35px] flex items-center justify-center rounded-[10px]">
                    <FaWallet></FaWallet>
                  </div>
                  <p className="break-all sm:text-base text-xs">{acc}</p>
                </div>
                <div className="text-white py-1 px-3 rounded-[15px] bg-[#355BEB]">
                  Active
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <div className="w-full bg-white p-4 rounded-xl shadow-lg border border-gray-100 " id="pending">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold  uppercase tracking-wider flex items-center justify-center text-base gap-2">
                  <FaClock className="text-orange-600" /> Pending
                </h3>
                <span className="bg-orange-100 text-orange-600 text-[12px] font-bold px-2 py-0.5 rounded-full text-lg">
                  {myRequests?.filter(item => item?.status?.toLowerCase() === "pending")?.length}
                </span>
              </div>

              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                {myRequests?.filter(item => item?.status?.toLowerCase() === "pending")?.map((req, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border transition-colors border-[#FED7AA] bg-[#FFF7ED]"
                  >
                    <div>
                      <p className="bg-[#FFEDD5] text-[#C2410C] w-fit px-2 py-1 rounded-[5px] text-[12px] font-bold uppercase">{req?.reason}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-1 mt-2">
                      <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-[#fadebe]">
                        <p className="text-[11px] text-gray-400 font-bold">Smart Account</p>
                        <p className="text-[12px] font-mono break-all">{req?.account}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-1">
                      <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-[#fadebe]">
                        <p className="text-[11px] text-gray-400 font-bold">Target</p>
                        <p className="text-[12px] font-mono break-all">{req?.targetAddress}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-1">
                      <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-[#fadebe]">
                        <p className="text-[11px] text-gray-400 font-bold">Value</p>
                        <p className="text-[12px] font-mono">{req?.value}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-2 ">
                      <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-[#fadebe]">
                        <p className="text-[11px] text-gray-400 font-bold">Calldata</p>
                        <p className="text-[12px] font-mono">{req?.data}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[11px] text-orange-600 font-semibold mt-1">
                          Required: {req?.currentSignatures}/{req?.threshold} Signatures
                        </p>
                      </div>

                      <button
                        className="bg-orange-600 hover:bg-orange-700 text-white text-[12px] font-bold py-1.5 px-3 rounded shadow-sm transition-all disabled:opacity-50"
                        onClick={() => {
                          handleSign(req.account, req.targetAddress, req.value, req.data, req.currentSignatures, req.threshold);
                        }}
                        disabled={req.signatures.some(
                          (item) => item.signerAddress.toLowerCase() === address?.toLowerCase()
                        )}
                      >
                        {isLoadingSign ? "Signing..." : req.signatures.some(
                          (item) => item.signerAddress.toLowerCase() === address?.toLowerCase()
                        ) ? "Your Already Sign" : "Sign & Approve"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full bg-white p-4 rounded-xl shadow-lg border border-gray-100" id="ready">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-500 uppercase tracking-wider flex items-center justify-start gap-2">
                  <FaCheckCircle className="text-green-600" /> Ready
                </h3>
                <span className="bg-green-200 text-green-600 text-[12px] font-bold px-2 py-0.5 rounded-full text-lg">
                  {myRequests.filter(item => item.status.toLowerCase() === "ready").length}
                </span>
              </div>

              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                {myRequests.filter(item => item.status.toLowerCase() === "ready")?.map((req, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border transition-colors border-[#BBF7D0] bg-[#F0FDF4]"
                  >
                    <div>
                      <p className="bg-[#DCFCE7] text-green-600 w-fit px-2 py-1 rounded-[5px] text-[12px] font-bold uppercase">{req?.reason}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-1 mt-2">
                      <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-[#c4f5d5]">
                        <p className="text-[11px] text-gray-400 font-bold">Smart Account</p>
                        <p className="text-[12px] font-mono break-all">{req?.account}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-1">
                      <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-[#c4f5d5]">
                        <p className="text-[11px] text-gray-400 font-bold">Target</p>
                        <p className="text-[12px] font-mono break-all">{req?.targetAddress}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-1">
                      <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-[#c4f5d5]">
                        <p className="text-[11px] text-gray-400 font-bold">Value</p>
                        <p className="text-[12px] font-mono">{req?.value}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mb-2 ">
                      <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-[#c4f5d5]">
                        <p className="text-[11px] text-gray-400 font-bold">Calldata</p>
                        <p className="text-[12px] font-mono">{req?.data}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[11px] text-green-600 font-semibold mt-1">
                          Required: {req?.currentSignatures}/{req?.threshold} Signatures
                        </p>
                      </div>

                      <button
                        className="bg-green-600 hover:bg-green-700 text-white text-[12px] font-bold py-1.5 px-3 rounded shadow-sm transition-all"
                        onClick={() => {
                          handleExecute(req)
                        }}
                      >
                        {isLoadingExecute ? "Executing..." : "Execute"}
                      </button>
                    </div>
                  </div>
                ))}

              </div>
            </div>

            <div className="w-full bg-white p-4 rounded-xl shadow-lg border border-gray-100" id="executed">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-500 uppercase tracking-wider flex items-center justify-start gap-2">
                  <FaCheckCircle className="text-blue-600" /> Executed
                </h3>
              </div>

              <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                {Object.entries(executedHistory)?.map(([account, transactions]) => {
                  const txArray = Array.isArray(transactions) ? transactions : [];

                  return txArray?.map((tx, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                    >
                      <div className="grid grid-cols-1 gap-2 mb-1 mt-2">
                        <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-blue-100">
                          <p className="text-[11px] text-gray-400 font-bold">Smart Account</p>
                          <p className="text-[12px] font-mono break-all">{account}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 mb-1">
                        <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-blue-100">
                          <p className="text-[11px] text-gray-400 font-bold">Target</p>
                          <p className="text-[12px] font-mono break-all">{tx?.targetAddress}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 mb-1">
                        <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-blue-100">
                          <p className="text-[11px] text-gray-400 font-bold">Value</p>
                          <p className="text-[12px] font-mono">{tx?.value}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 mb-2 ">
                        <div className="bg-[rgba(255,255,255,.3)] p-2 rounded border border-blue-100">
                          <p className="text-[11px] text-gray-400 font-bold">Calldata</p>
                          <p className="text-[12px] font-mono">{tx?.data}</p>
                        </div>
                      </div>
                    </div>
                  ))
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}