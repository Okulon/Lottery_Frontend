import { Component } from '@angular/core';
import { HttpClient } from "@angular/common/http"
import { ethers } from "ethers"

import LotteryJson from "../assets/Lottery.json"
import ballotJson from "../assets/LotteryTokenClassic.json"


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'front-end';
}
