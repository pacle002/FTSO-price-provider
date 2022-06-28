/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import BN from "bn.js";
import { ContractOptions } from "web3-eth-contract";
import { EventLog } from "web3-core";
import { EventEmitter } from "events";
import {
  Callback,
  PayableTransactionObject,
  NonPayableTransactionObject,
  BlockType,
  ContractEventLog,
  BaseContract,
} from "./types";

interface EventOptions {
  filter?: object;
  fromBlock?: BlockType;
  topics?: string[];
}

export interface GasConsumer2 extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): GasConsumer2;
  clone(): GasConsumer2;
  methods: {
    array(arg0: number | string | BN): NonPayableTransactionObject<string>;

    clean(n: number | string | BN): NonPayableTransactionObject<void>;

    length(): NonPayableTransactionObject<string>;

    maxLen(): NonPayableTransactionObject<string>;

    push(n: number | string | BN): NonPayableTransactionObject<void>;
  };
  events: {
    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };
}