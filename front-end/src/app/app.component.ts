import { Component } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { ethers } from "ethers"

import LotteryJson from "../assets/Lottery.json"
import ballotJson from "../assets/LotteryTokenClassic.json"

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

    etherBalance: number | undefined

    constructor(private http: HttpClient) {
        /* Connection to metamask (Currently the only option)*/
        if (typeof window.ethereum !== "undefined") {
            try {
                let accounts: ethers.providers.JsonRpcSigner[]

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
                    this.walletAddress = ans
                    /* Get Balances */
                    web3Prov.getBalance(ans).then((balBG) => {
                        this.etherBalance = parseFloat(
                            ethers.utils.formatEther(balBG)
                        )
                    })
                })
            } catch (error) {
                console.log(error)
            }
        } else {
            console.log("Error connecting to metamask !!!")
        }

        /* Contracts */
        this.http
            .get<any>("http://localhost:3000/lottery-address")
            .subscribe((ans) => {
                this.LOTTERY_ADDRESS = ans.result
            })

        this.http
            .get<any>("http://localhost:3000/peyment-token-address")
            .subscribe((ans) => {
                this.PAYMENT_TOKEN_ADDRESS = ans.result
            })
    }
}
