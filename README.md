# Token Distributor

A simple token distribution script for Statemine.

Accepts an array of objects like these into `tokens.js`:

```js
  {
    owner: "CafbcqS9YucKCVFtbkTDzQbRHwRFVB2Uaa2ZSPYjQgHMsep",
    tokens: 15102.481121898596,
  },
```

Will then process each owner and check if the owner has a balance on Statemine. If not, it will attempt to top up their account with the existential deposit (only if there's enough funds in the seeder account to top all the recipients up - never partial). After that, it will go through all the token balances, check if the seeder has equal or more tokens than needed to distribute, and then distribute the tokens in a batch.

## Usage

1. Modify `tokens.js` with your own recipients and balances
2. Rename `.env.js.example` to `.env.js` and put in the signer account's seed phrase
3. Test on a local chain by keeping `CHAIN` in `.env.js` as `local`
4. When ready to deploy live, switch the `CHAIN` value to `live`
