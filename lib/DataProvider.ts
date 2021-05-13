import * as fs from 'fs';
import Web3 from 'web3';
import { DataProviderConfiguration } from './Configuration';
import { DataProviderData } from './DataProviderData';
import * as impl from './PriceProviderImpl';
import { bigNumberToMillis, getAbi, getContract, getLogger, getProvider, getWeb3, getWeb3Contract, getWeb3Wallet, submitPriceHash, waitFinalize3Factory } from './utils';
import { PriceInfo } from './PriceInfo';
import { BigNumber, ethers } from 'ethers';
import { EpochSettings } from './EpochSettings';

let randomNumber = require("random-number-csprng");
let yargs = require("yargs");

let args = yargs
    .option('config', {
        alias: 'c',
        type: 'string',
        description: 'Path to config json file',
        default: './config.json',
        demand: true
    }).argv;

let conf:DataProviderConfiguration = JSON.parse( fs.readFileSync( args['config'] ).toString() ) as DataProviderConfiguration;

const ABI_PATH = "./data/abi.json";
const abi = getAbi(ABI_PATH);
const provider = getProvider(conf.rpcUrl);
const web3 = getWeb3(conf.rpcUrl) as Web3;
const account = getWeb3Wallet(web3, conf.accountPrivateKey);

const data:DataProviderData[] = conf.priceProviderList.map( (ppc, index) => {
    return {
        index: index,
        pair: ppc.pair,
        decimals: ppc.decimals,
        contract: getContract( provider, ppc.contractAddress, abi ),
        web3contract: getWeb3Contract( web3, ppc.contractAddress, abi ),
        submitOffset: ppc.submitOffset,
        revealOffset: ppc.revealOffset,
        priceProvider: new (impl as any)[ppc.priceProviderClass]( ...ppc.priceProviderParams ),
        label: ppc.priceProviderClass + "(" + ppc.pair + ")" 
    } as DataProviderData;
});

if(data.length == 0) {
    throw Error("No price providers in configuration!");
}

const waitFinalize3 = waitFinalize3Factory(web3);
const logger = getLogger();

let epochSettings:EpochSettings;
let nonce:number|undefined;     // if undefined, we retrieve it from blockchain, otherwise we use it
let index2epochId2priceInfo: Map<number, Map<string, PriceInfo>> = new Map();
data.forEach( (d) => {
    index2epochId2priceInfo.set(d.index, new Map());
});
let epochId2endRevealTime: Map<string, number> = new Map();
let functionsToExecute: any[] = [];

async function getNonce(): Promise<string> {
    if(nonce) {
        nonce++;
    } else {
        nonce = (await web3.eth.getTransactionCount(account.address));
    }
    return nonce + "";   // string returned
}

function resetNonce() {
    nonce = undefined;
}

async function getRandom(minnum:number=0, maxnum:number=10**5) {
    return await randomNumber(minnum, maxnum);
};

function preparePrice(price: number, decimals:number) {
    return Math.floor(price * 10**decimals);
};

async function signAndFinalize3(p:DataProviderData, fnToEncode:any):Promise<boolean> {
    let nonce = await getNonce();
    var tx = {
        from: account.address,
        to: p.web3contract.options.address,
        gas: "400000",
        gasPrice: "225000000000",
        data: fnToEncode.encodeABI(),
        nonce: nonce
    };
    var signedTx = await account.signTransaction(tx);
    try {
        await waitFinalize3(account.address, () => web3.eth.sendSignedTransaction(signedTx.rawTransaction!));
        return true;
    } catch(e) {
        if( e.message.indexOf("Transaction has been reverted by the EVM") < 0 ) {
            logger.error(`${p.label} | Nonce sent: ${ nonce } | signAndFinalize3 error: ${ e.message }`);
        } else {      
            fnToEncode.call({ from: account.address })
                .then((result: any) => { throw Error('unlikely to happen: ' + JSON.stringify(result)) })
                .catch((revertReason: any) => {
                    logger.error(`${p.label} | Nonce sent: ${ nonce } | signAndFinalize3 error: ${ revertReason }`);
                    resetNonce();
                });
        }
        return false;
    }
}
    
async function submitPrice(p:DataProviderData) {
    let epochId = ((await p.web3contract.methods.getCurrentEpochId().call()) as BigNumber).toString();
    let price = await p.priceProvider.getPrice();
    if (price) {
        let preparedPrice = preparePrice(price, p.decimals);
        let random = await getRandom();
        let hash = submitPriceHash(preparedPrice, random);
        logger.info(`${p.label} | Submitting price: ${ (preparedPrice/10**p.decimals).toFixed(p.decimals) } $ for ${ epochId }`);
        index2epochId2priceInfo.get(p.index)!.set(epochId, new PriceInfo(epochId, preparedPrice, random));
    
        var fnToEncode = p.web3contract.methods.submitPrice(hash);
        await signAndFinalize3(p, fnToEncode);
    }
}

async function revealPrice(p:DataProviderData, epochId: BigNumber): Promise<void> {
    const epochIdStr: string = epochId.toString();
    while(epochId2endRevealTime.get(epochIdStr) && new Date().getTime() < epochId2endRevealTime.get(epochIdStr)!) {
        let priceInfo = index2epochId2priceInfo.get(p.index)!.get(epochIdStr);
    
        if(priceInfo) {
            logger.info(`${p.label} | Revealing price for ${ epochIdStr }`);
            priceInfo.moveToNextStatus();
            let startTime = new Date().getTime();
            var fnToEncode = p.web3contract.methods.revealPrice(epochIdStr, priceInfo.priceSubmitted, priceInfo.random);
            let success:boolean = await signAndFinalize3(p, fnToEncode);
            
            if(success) logger.info(`${p.label} | Reveal finished for ${ epochIdStr } in ${ new Date().getTime() - startTime }ms`);
            break;
        } else {
            logger.info(`${p.label} | No price to reveal in ${ epochIdStr } in yet. Trying again in 1s...`);
        }

        await new Promise((resolve: any) => { setTimeout(() => { resolve() }, 1000) });
    }
}

function execute(func: () => any) {
    functionsToExecute.push(func);
}

async function run() {
    while (true) {
        if (functionsToExecute.length > 0) {
            let func: any = functionsToExecute.shift();
            try {
                await func();
            } catch (e) {
                logger.error("TX fail: " + e.message);
            }
        } else {
            await new Promise((resolve: any) => { setTimeout(() => { resolve() }, 500) })
        }
    }
}

run();

async function setupSubmissionAndReveal() {
    let epochId:BigNumber = epochSettings.getCurrentEpochId();
    let epochSubmitTimeEnd:number = epochSettings.getEpochSubmitTimeEnd().toNumber();
    let epochRevealTimeEnd:number = epochSettings.getEpochReveaTimeEnd().toNumber();
    let now = new Date().getTime();
    let diffSubmit = epochSubmitTimeEnd - now;
    let revealPeriod = epochSettings.getRevealPeriod().toNumber();
    let submitPeriod = epochSettings.getSubmitPeriod().toNumber();
    epochId2endRevealTime.set(epochId.toString(), epochRevealTimeEnd);

    logger.info("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    logger.info(`EPOCH DATA: epoch ${ epochId } submit will end in: ${ diffSubmit }ms, reveal in: ${ diffSubmit+revealPeriod }ms, submitPeriod: ${ submitPeriod }ms, revealPeriod: ${ revealPeriod }ms`);
    setTimeout(function() {
        logger.info(`SUBMIT ENDED FOR: ${ epochId }`);
        logger.info("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
    }, epochSubmitTimeEnd - new Date().getTime());
    
    setTimeout(function() {
        logger.info(`REVEAL ENDED FOR: ${ epochId }`);
    }, epochRevealTimeEnd - new Date().getTime());

    
    for(let p of data) {
        p = p as DataProviderData;
        if(diffSubmit > submitPeriod - p.submitOffset) {
            setTimeout(function() {
                execute(async function() { await submitPrice(p); });
            }, diffSubmit - submitPeriod + p.submitOffset);
    
            setTimeout(function() {
                execute(async function() { await revealPrice(p, epochId); });
            }, diffSubmit + p.revealOffset);
        }
    }

    setTimeout(setupSubmissionAndReveal, diffSubmit + 100);
}

// data[0].web3contract.methods.getPriceEpochConfiguration().call().then( (data:any) => {
data[0].contract.getPriceEpochConfiguration().then( (data:any) => {
    epochSettings = new EpochSettings( bigNumberToMillis(data[0]), bigNumberToMillis(data[1]), bigNumberToMillis(data[2]) );
    setupSubmissionAndReveal();
})//.catch((err:any) => logger.error(err));

// EVENTS

for(let p of data) {
    p = p as DataProviderData;
    
    p.contract.on("PriceSubmitted", async (submitter: string, epochId: any) => {
        if(submitter != account.address) return;
        
        let epochIdStr = epochId.toString();
        let priceInfo = index2epochId2priceInfo.get(p.index)!.get(epochIdStr);
        priceInfo?.moveToNextStatus();
        logger.info(`${p.label} | Price submitted in epoch ${ epochIdStr }`);
    });
    
    
    p.contract.on("PriceRevealed", (voter: string, epochId: any, price: number, votePowerFlr: any, votePowerAsset: any) => {
        if(voter != account.address) return;
        
        let epochIdStr = epochId.toString();
        logger.info(`${p.label} | Price revealed in epoch ${ epochIdStr }: ${(price/10**p.decimals).toFixed(p.decimals)}$`);
        
        let priceInfo = index2epochId2priceInfo.get(p.index)!.get(epochIdStr)!;
        if(priceInfo) {
            priceInfo.moveToNextStatus();
            logger.info(`${p.label} | Price that was submitted: ${ (priceInfo.priceSubmitted/10**5).toFixed(5) }$`);
            if (priceInfo.priceSubmitted != (price as number)) {
                logger.error(`${p.label} | Price submitted and price revealed are diffent!`);
            }
        }
    });
    
    p.contract.on("PriceFinalized", (epochId: BigNumber, price: BigNumber, rewardedFtso: boolean, lowRewardPrice: BigNumber, highRewardPrice: BigNumber, finalizationType: number, timestamp: BigNumber) => {
        logger.info(`Price finalized for ${ epochId.toString() }: ${ price.toNumber() }, type: ${finalizationType}, rewarded: ${rewardedFtso}, low: ${lowRewardPrice}, high: ${highRewardPrice}, timestamp: ${timestamp.toString()}`);
    })
}