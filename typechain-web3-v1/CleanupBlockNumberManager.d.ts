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

export type CleanupBlockNumberSet = ContractEventLog<{
  theContract: string;
  blockNumber: string;
  success: boolean;
  0: string;
  1: string;
  2: boolean;
}>;
export type GovernanceProposed = ContractEventLog<{
  proposedGovernance: string;
  0: string;
}>;
export type GovernanceUpdated = ContractEventLog<{
  oldGovernance: string;
  newGoveranance: string;
  0: string;
  1: string;
}>;
export type RegistrationUpdated = ContractEventLog<{
  theContract: string;
  add: boolean;
  0: string;
  1: boolean;
}>;

export interface CleanupBlockNumberManager extends BaseContract {
  constructor(
    jsonInterface: any[],
    address?: string,
    options?: ContractOptions
  ): CleanupBlockNumberManager;
  clone(): CleanupBlockNumberManager;
  methods: {
    claimGovernance(): NonPayableTransactionObject<void>;

    getAddressUpdater(): NonPayableTransactionObject<string>;

    governance(): NonPayableTransactionObject<string>;

    initialise(_governance: string): NonPayableTransactionObject<void>;

    proposeGovernance(_governance: string): NonPayableTransactionObject<void>;

    proposedGovernance(): NonPayableTransactionObject<string>;

    registerToken(_cleanableToken: string): NonPayableTransactionObject<void>;

    registeredTokens(
      arg0: number | string | BN
    ): NonPayableTransactionObject<string>;

    setCleanUpBlockNumber(
      _blockNumber: number | string | BN
    ): NonPayableTransactionObject<void>;

    transferGovernance(_governance: string): NonPayableTransactionObject<void>;

    triggerContract(): NonPayableTransactionObject<string>;

    triggerContractName(): NonPayableTransactionObject<string>;

    unregisterToken(_cleanableToken: string): NonPayableTransactionObject<void>;

    updateContractAddresses(
      _contractNameHashes: (string | number[])[],
      _contractAddresses: string[]
    ): NonPayableTransactionObject<void>;
  };
  events: {
    CleanupBlockNumberSet(cb?: Callback<CleanupBlockNumberSet>): EventEmitter;
    CleanupBlockNumberSet(
      options?: EventOptions,
      cb?: Callback<CleanupBlockNumberSet>
    ): EventEmitter;

    GovernanceProposed(cb?: Callback<GovernanceProposed>): EventEmitter;
    GovernanceProposed(
      options?: EventOptions,
      cb?: Callback<GovernanceProposed>
    ): EventEmitter;

    GovernanceUpdated(cb?: Callback<GovernanceUpdated>): EventEmitter;
    GovernanceUpdated(
      options?: EventOptions,
      cb?: Callback<GovernanceUpdated>
    ): EventEmitter;

    RegistrationUpdated(cb?: Callback<RegistrationUpdated>): EventEmitter;
    RegistrationUpdated(
      options?: EventOptions,
      cb?: Callback<RegistrationUpdated>
    ): EventEmitter;

    allEvents(options?: EventOptions, cb?: Callback<EventLog>): EventEmitter;
  };

  once(
    event: "CleanupBlockNumberSet",
    cb: Callback<CleanupBlockNumberSet>
  ): void;
  once(
    event: "CleanupBlockNumberSet",
    options: EventOptions,
    cb: Callback<CleanupBlockNumberSet>
  ): void;

  once(event: "GovernanceProposed", cb: Callback<GovernanceProposed>): void;
  once(
    event: "GovernanceProposed",
    options: EventOptions,
    cb: Callback<GovernanceProposed>
  ): void;

  once(event: "GovernanceUpdated", cb: Callback<GovernanceUpdated>): void;
  once(
    event: "GovernanceUpdated",
    options: EventOptions,
    cb: Callback<GovernanceUpdated>
  ): void;

  once(event: "RegistrationUpdated", cb: Callback<RegistrationUpdated>): void;
  once(
    event: "RegistrationUpdated",
    options: EventOptions,
    cb: Callback<RegistrationUpdated>
  ): void;
}