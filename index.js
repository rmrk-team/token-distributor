import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { snapshot } from "./tokens.js";
import { PHRASE, CHAIN } from "./.env.js";
import { sleep, floatToBigInt } from "./util.js";

// Construct
const wsProvider = new WsProvider(
  CHAIN != "live"
    ? "ws://127.0.0.1:9944"
    : "wss://kusama-statemine-rpc.paritytech.net"
);
console.log("Will connect to " + CHAIN);

const api = await ApiPromise.create({ provider: wsProvider });
const keyring = new Keyring({ type: "sr25519" });
const signerAccount = keyring.addFromUri(PHRASE);
let amountKusama = CHAIN == "local" ? 150000000000000 : 5333333;

const start = async function start() {
  // ----------------------------- SANITY CHECK -----------------------
  console.log("Conducting sanity check");
  // Check the total sum in the snapshot in float and BigInt
  let totalFloat = 0;
  let totalBigint = BigInt(0);
  for (let entry of snapshot) {
    totalFloat += entry.tokens;
    totalBigint += floatToBigInt(entry.tokens);
  }
  console.log(
    `Total in snapshot is ${totalFloat} and as BigInt it's ${totalBigint}`
  );
  // Check if balance is OK, cancel if not
  const signerTokenBalance = await api.query.assets.account(
    8,
    signerAccount.address
  );
  if (BigInt(signerTokenBalance.toJSON().balance) < totalBigint) {
    console.error(
      `Signer has fewer tokens (${BigInt(
        signerTokenBalance.toJSON().balance
      ).toString()} than it's supposed to distribute (${totalBigint}).`
    );
    process.exit(1);
  }

  console.log("Proceeding in 10 seconds...");
  await sleep(10000);

  // ----------------------------- TOP-UP -----------------------
  const batchOfKusamaTxs = [];
  let counterKusama = 0;
  let counterKusamaNoTopup = 0;
  let sum = 0;
  let balance;
  for (let entry of snapshot) {
    balance = await api.query.system.account(entry.owner);
    if (balance.data.toJSON().free) {
      counterKusamaNoTopup++;
      continue;
    }
    batchOfKusamaTxs.push(api.tx.balances.transfer(entry.owner, amountKusama));
    sum += amountKusama;
    counterKusama++;
    if (counterKusama % 100 == 0) {
      console.log(`Topping up account #${counterKusama}`);
    }
  }
  console.log(
    `${counterKusamaNoTopup} accounts did not need a top-up. ${counterKusama} accounts needed a top up, totaling ${sum}.`
  );
  if (counterKusama > 0) {
    let signerBalance = await api.query.system.account(signerAccount.address);
    if (signerBalance.data.toJSON().free < amountKusama * (counterKusama + 1)) {
      console.error(
        `Signer account has less balance (${
          signerBalance.data.toJSON().free
        }) than required (${amountKusama * (counterKusama + 1)}). Stopping`
      );
      process.exit(1);
    }

    console.log("Proceeding to send in 10 seconds...");
    await sleep(10000);
    await api.tx.utility.batchAll(batchOfKusamaTxs).signAndSend(signerAccount);
  } else {
    console.log("No top-ups needed, moving on to asset transfers.");
  }

  // ----------------------------- SEND TOKENS -----------------------
  const batchOfTxs = [];
  let counter = 0;
  let total = BigInt(0);
  for (let entry of snapshot) {
    let tokenAmount = floatToBigInt(entry.tokens);
    batchOfTxs.push(api.tx.assets.transfer(8, entry.owner, tokenAmount));
    total += tokenAmount;
    counter++;
  }
  console.log(`Prepared batch of ${batchOfTxs.length} transactions`);

  console.log(`Total to send is ${total}`);

  console.log("Proceeding to send in 10 seconds...");
  await sleep(10000);
  await api.tx.utility
    .batchAll(batchOfTxs)
    .signAndSend(signerAccount, (result) => {
      console.log(`Current status is ${result.status}`);

      if (result.status.isInBlock) {
        console.log(
          `Transaction included at blockHash ${result.status.asInBlock}`
        );
      } else if (result.status.isFinalized) {
        console.log(
          `Transaction finalized at blockHash ${result.status.asFinalized}`
        );
        process.exit(0);
      }
    });
};

start();
