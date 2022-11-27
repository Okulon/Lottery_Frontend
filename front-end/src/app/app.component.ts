import { Component } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { ethers } from "ethers"

import LotteryJson from "../assets/Lottery.json"
import PAYMENTTOKENJson from "../assets/LotteryTokenClassic.json"

declare global {
    interface Window {
        ethereum: any
    }
}

export class eventsClass {
    Winner: string
    Prize: string

    constructor(_winner: string, _prize: string) {
        this.Winner = _winner
        this.Prize = _prize
    }
}

const LOTTERY_ADMIN_ROLE = ethers.utils.keccak256(
    ethers.utils.hexlify(ethers.utils.toUtf8Bytes("LOTTERY_ADMIN_ROLE"))
)

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"],
})
export class AppComponent {
    wallet: ethers.providers.JsonRpcSigner | undefined
    walletAddress: string | undefined
    provider: ethers.providers.Web3Provider | undefined

    LOTTERY_ADDRESS: string | undefined
    PAYMENT_TOKEN_ADDRESS: string | undefined
    paymentToken: ethers.Contract | undefined
    lottery: ethers.Contract | undefined

    etherBalance: number | undefined
    tokenBalance: number | undefined

    lotteryOpen: boolean | undefined
    prizePool: number | undefined
    ownerPool: number | undefined
    prizeToWithdraw: number | undefined
    isAdmin: boolean | undefined

    timeLeft: number | undefined

    constructor(private http: HttpClient) {
        /* Connection to metamask (Currently the only option)*/
        if (typeof window.ethereum !== "undefined") {
            try {
                window.ethereum
                    .request({ method: "eth_requestAccounts" })
                    .then(() => {})

                const web3Prov = new ethers.providers.Web3Provider(
                    window.ethereum
                )
                this.provider = web3Prov

                const wal = web3Prov.getSigner()
                this.wallet = wal
                wal.getAddress().then((ans) => {
                    const walAddress = ans
                    this.walletAddress = ans
                    /* Get Balances */
                    web3Prov.getBalance(ans).then((balBG) => {
                        this.etherBalance = parseFloat(
                            ethers.utils.formatEther(balBG)
                        )
                    })
                    this.http
                        .get<any>("http://localhost:3000/peyment-token-address")
                        .subscribe((ans) => {
                            this.PAYMENT_TOKEN_ADDRESS = ans.result
                            this.paymentToken = new ethers.Contract(
                                ans.result,
                                PAYMENTTOKENJson.abi,
                                wal
                            )
                            this.paymentToken["balanceOf"](walAddress).then(
                                (ans: ethers.BigNumber) => {
                                    this.tokenBalance = parseFloat(
                                        ethers.utils.formatEther(ans)
                                    )
                                }
                            )
                        })
                    /* Contracts */
                    this.http
                        .get<any>("http://localhost:3000/lottery-address")
                        .subscribe((ans) => {
                            this.LOTTERY_ADDRESS = ans.result
                            this.lottery = new ethers.Contract(
                                ans.result,
                                LotteryJson.abi,
                                wal
                            )
                            this.lottery["getBetsOpen"]().then(
                                (ans: boolean) => {
                                    this.lotteryOpen = ans
                                    this.startTimer()
                                }
                            )
                            this.lottery["getPrizePool"]().then(
                                (ans: ethers.BigNumber) => {
                                    this.prizePool = parseFloat(
                                        ethers.utils.formatEther(ans)
                                    )
                                }
                            )
                            this.lottery["getOwnerPool"]().then(
                                (ans: ethers.BigNumber) => {
                                    this.ownerPool = parseFloat(
                                        ethers.utils.formatEther(ans)
                                    )
                                }
                            )
                            this.lottery["getPrize"](walAddress).then(
                                (ans: ethers.BigNumber) => {
                                    this.prizeToWithdraw = parseFloat(
                                        ethers.utils.formatEther(ans)
                                    )
                                }
                            )
                            this.lottery["hasRole"](
                                LOTTERY_ADMIN_ROLE,
                                walAddress
                            ).then((ans: boolean) => {
                                this.isAdmin = ans
                            })
                        })
                })
            } catch (error) {
                console.log(error)
            }
        } else {
            console.log("Error connecting to metamask !!!")
        }
    }

    buyToken(amount: string) {
        console.log(`Trying to buy ${amount} of tokens`)
        const tokenAmount = ethers.BigNumber.from(
            ethers.utils.parseEther(amount)
        )
        this.lottery!["getPurchaseRatio"]().then((ans: ethers.BigNumber) => {
            this.lottery!["purchaseTokens"]({
                value: tokenAmount.div(ans),
            }).then((txResponse: ethers.providers.TransactionResponse) => {
                this.listenForTransactionToMine(txResponse, this.provider!)
            })
        })
    }

    approveToken(amount: string) {
        console.log(`Trying to approve ${amount} of tokens`)
        const tokenAmount = ethers.BigNumber.from(
            ethers.utils.parseEther(amount)
        )
        this.paymentToken!["approve"](this.lottery?.address, tokenAmount).then(
            (txResponse: ethers.providers.TransactionResponse) => {
                this.listenForTransactionToMine(txResponse, this.provider!)
            }
        )
    }

    sellToken(amount: string) {
        console.log(`Trying to sell ${amount} of tokens`)
        const tokenAmount = ethers.BigNumber.from(
            ethers.utils.parseEther(amount)
        )
        this.lottery!["returnTokens"](tokenAmount).then(
            (txResponse: ethers.providers.TransactionResponse) => {
                this.listenForTransactionToMine(txResponse, this.provider!)
            }
        )
    }

    openBets(closingTimestamp: string) {
        console.log(`Trying to open the lottery ...`)
        this.provider!.getBlock("latest").then((currentBlock) => {
            const currentTimestamp = currentBlock.timestamp
            const duration = Number(closingTimestamp)
            this.lottery!["openBets"](currentTimestamp + duration).then(
                (txResponse: ethers.providers.TransactionResponse) => {
                    this.listenForTransactionToMine(txResponse, this.provider!)
                }
            )
        })
    }

    betApprove(amount: string) {
        this.approveToken((Number(amount) * 1.2).toString())
    }

    bet(amount: string) {
        console.log(`Trying to bet ${amount} times ...`)
        const numberOfBets = Number(amount)
        if (numberOfBets > 1) {
            this.lottery!["betMany"](numberOfBets).then(
                (txResponse: ethers.providers.TransactionResponse) => {
                    this.listenForTransactionToMine(txResponse, this.provider!)
                }
            )
        } else {
            this.lottery!["bet"]().then(
                (txResponse: ethers.providers.TransactionResponse) => {
                    this.listenForTransactionToMine(txResponse, this.provider!)
                }
            )
        }
    }

    withdrawAdmin() {
        this.lottery!["ownerWithdraw"](
            ethers.utils.parseEther(this.ownerPool!.toString())
        ).then((txResponse: ethers.providers.TransactionResponse) => {
            this.listenForTransactionToMine(txResponse, this.provider!)
        })
    }

    withdrawWinner() {
        this.lottery!["prizeWithdraw"](
            ethers.utils.parseEther(this.prizeToWithdraw!.toString())
        ).then((txResponse: ethers.providers.TransactionResponse) => {
            this.listenForTransactionToMine(txResponse, this.provider!)
        })
    }

    syncBalances() {
        this.paymentToken!["balanceOf"](this.walletAddress).then(
            (ans: ethers.BigNumber) => {
                this.tokenBalance = parseFloat(ethers.utils.formatEther(ans))
            }
        )

        this.provider!.getBalance(this.walletAddress!).then((balBG) => {
            this.etherBalance = parseFloat(ethers.utils.formatEther(balBG))
        })

        this.lottery!["getPrizePool"]().then((ans: ethers.BigNumber) => {
            this.prizePool = parseFloat(ethers.utils.formatEther(ans))
        })

        this.lottery!["getOwnerPool"]().then((ans: ethers.BigNumber) => {
            this.ownerPool = parseFloat(ethers.utils.formatEther(ans))
        })

        this.lottery!["getPrize"](this.walletAddress).then(
            (ans: ethers.BigNumber) => {
                this.prizeToWithdraw = parseFloat(ethers.utils.formatEther(ans))
            }
        )
    }

    startTimer() {
        this.provider!.getBlock("latest").then((currentBlock) => {
            const currentTime = currentBlock.timestamp
            this.lottery!["getBetsClosingTime"]().then(
                (closingTimestamp: number) => {
                    const remainingTime = closingTimestamp - currentTime
                    this.timeLeft = remainingTime
                }
            )
        })
        setInterval(() => {
            if (this.timeLeft! > 0) {
                this.timeLeft!--
            }
        }, 1000)
    }

    listenForTransactionToMine(
        transactionResponce: ethers.ContractTransaction,
        provider: ethers.providers.BaseProvider | ethers.providers.Web3Provider
    ): Promise<any> {
        console.log(`Mining ${transactionResponce.hash}`)
        return new Promise<any | void>((resolve, reject) => {
            provider.once(
                transactionResponce.hash,
                (transactionreceipt: ethers.ContractReceipt) => {
                    console.log(
                        `Completed with ${transactionreceipt.confirmations} confirmations`
                    )
                    console.log(transactionreceipt)
                    this.syncBalances()
                    resolve(transactionreceipt)
                }
            )
        })
    }
}
