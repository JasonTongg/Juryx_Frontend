const AccountFactoryAbi = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "account",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "address[]",
                "name": "owners",
                "type": "address[]"
            },
            {
                "indexed": false,
                "internalType": "uint256",
                "name": "threshold",
                "type": "uint256"
            }
        ],
        "name": "AccountCreated",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "address[]",
                "name": "_owners",
                "type": "address[]"
            },
            {
                "internalType": "uint256",
                "name": "_threshold",
                "type": "uint256"
            },
            {
                "internalType": "address",
                "name": "_entryPoint",
                "type": "address"
            }
        ],
        "name": "createAccount",
        "outputs": [
            {
                "internalType": "address",
                "name": "",
                "type": "address"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

export default AccountFactoryAbi;