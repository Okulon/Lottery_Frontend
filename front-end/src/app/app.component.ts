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

    constructor(private http: HttpClient) {

      /* Connection to metamask (Currently the only option)*/
        if (typeof window.ethereum !== "undefined") {
            try {
                let accounts: ethers.providers.JsonRpcSigner[]
                window.ethereum
                    .request({ method: "eth_requestAccounts" })
                    .then(() => {
                        window.ethereum
                            .request({ method: "eth_accounts" })
                            .then((ans: ethers.providers.JsonRpcSigner[]) => {
                                accounts = ans
                                this.wallet = accounts[0]
                            })
                    })
                const web3Prov = new ethers.providers.Web3Provider(
                    window.ethereum
                )
                this.provider = web3Prov
                console.log(this.provider);
                console.log(this.wallet);
                
                
            } catch (error) {
                console.log(error)
            }
        } else {
            console.log("Error connecting to metamask !!!")
        }
    }
}
