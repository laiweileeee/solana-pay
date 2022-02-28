import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import React, { useEffect, useState } from 'react';
import {
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  VStack,
} from '@chakra-ui/react';
import { actions } from '@metaplex/js';
import BigNumber from 'bignumber.js';
import { createQR, encodeURL, findTransactionSignature } from '@solana/pay';
import { CheckIcon } from '@chakra-ui/icons';

export function Pay() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [referenceState, setReferenceState] = useState(new Keypair().publicKey);
  const [paid, setPaid] = useState(false);
  const [currIntervalId, setCurrIntervalId] = useState(0);
  const [balance, setBalance] = useState(0);

  const generatePaymentQR = async () => {
    try {
      console.log('2. 🛍 Simulate a customer checkout \n');
      const recipient = new PublicKey(
        'DtvHv5rGRAdEN4WpGtqdSNvSv1W8FXp4ZG39KaHqwmkh'
      );
      const amount = new BigNumber(0.01);
      const reference = referenceState;
      const label = 'Jungle Cats store';
      const message = 'Jungle Cats store - your order - #001234';
      const memo = 'JC#4098';

      /**
       * Create a payment request link
       *
       * Solana Pay uses a standard URL scheme across wallets for native SOL and SPL Token payments.
       * Several parameters are encoded within the link representing an intent to collect payment from a customer.
       */
      console.log('3. 💰 Create a payment request link \n');
      const url = encodeURL({
        recipient,
        amount,
        reference,
        label,
        message,
        memo,
      });

      // encode URL in QR code
      const qrCode = createQR(url);

      // get a handle of the element
      const element = document.getElementById('qr-code');

      // append QR code to the element
      qrCode.append(element);

      // Update payment status
      setPaid(false);
    } catch (error) {
      console.log(error);
    }
  };

  const confirmTransaction = async reference => {
    try {
      /**
       * Wait for payment to be confirmed
       *
       * When a customer approves the payment request in their wallet, this transaction exists on-chain.
       * You can use any references encoded into the payment link to find the exact transaction on-chain.
       * Important to note that we can only find the transaction when it's **confirmed**
       */
      console.log('Attempting to confirm transaction.. ');
      const signatureInfo = await findTransactionSignature(
        connection,
        reference,
        undefined,
        'confirmed'
      );

      // Update payment status
      setPaid(true);
      console.log('Transaction confirmation found..!!');
      return signatureInfo;
    } catch (error) {
      console.log(error);
    }
  };

  const mintToPayer = async () => {
    const maxSupply = 1;
    const uri =
      'https://gateway.pinata.cloud/ipfs/QmShg9WJh6jDCeLpxjbvPjKb26wox23AgKZD7RWN3UvT4d';
    try {
      // finds transaction confirmation
      const tx = await confirmTransaction(referenceState);

      //fetch merchant information
      let newBalance = await connection.getBalance(
        new PublicKey('DtvHv5rGRAdEN4WpGtqdSNvSv1W8FXp4ZG39KaHqwmkh')
      );
      setBalance(newBalance);
      console.log(newBalance);

      console.log('tx: ', tx);
      console.log('Entering if clause,');

      // Execute if transaction confirmation exists
      if (tx) {
        console.log('if clause entered,');

        // generate wallet
        const newKeypair = Keypair.generate();

        //airdrop sols to new wallet
        let airdropSignature = await connection.requestAirdrop(
          newKeypair.publicKey,
          2 * LAMPORTS_PER_SOL
        );

        // confirm airdrop transaction
        const airdropConfirmedTxInfo = await connection.confirmTransaction(
          airdropSignature
        );
        console.log('confirmedTx: ', airdropConfirmedTxInfo);

        // approve mint transaction

        // send nft to the connected wallet's address

        // create send Sol transaction
        let solTransaction = new Transaction();
        solTransaction.add(
          SystemProgram.transfer({
            fromPubkey: newKeypair.publicKey,
            toPubkey: wallet.publicKey,
            lamports: LAMPORTS_PER_SOL,
          })
        );

        // send and confirm sol transaction
        // await sendAndConfirmTransaction(connection, transaction, [newKeypair]);

        console.log('sent sol to payer');

        // mint NFT to current wallet
        await actions.mintNFT({ connection, wallet, uri, maxSupply });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const togglePaymentStatus = () => {
    setPaid(!paid);
  };

  useEffect(async () => {
    // stop interval when it already exists and when payment is received
    if (currIntervalId && paid) {
      clearInterval(currIntervalId);
      console.log('interval stopped..!');
      return;
    }

    const intervalId = setInterval(() => {
      mintToPayer();
    }, 3000);
    setCurrIntervalId(intervalId);
  }, [paid]);

  return (
    <>
      <VStack width="full" spacing={8} borderRadius={10} borderWidth={2} p={10}>
        <FormControl
          display="flex"
          flexDirection="column"
          justifyContent="center"
          alignItems="center"
          id="greetings"
        >
          <FormLabel>Pay with Solana Pay</FormLabel>
          <FormLabel fontSize="md" fontWeight="bold">
            {' '}
            Merchant Balance: {balance / LAMPORTS_PER_SOL} SOL{' '}
          </FormLabel>
          <div>
            {!paid && <div id="qr-code"></div>}
            {paid && (
              <div
                style={{
                  padding: 200,
                }}
              >
                Payment Received <CheckIcon />
              </div>
            )}
          </div>
        </FormControl>
        <HStack>
          <Button isDisabled={paid} bgColor="black" onClick={generatePaymentQR}>
            {paid ? 'Paid' : 'Pay with SOL'}
          </Button>
          {/*<Button onClick={mintToPayer}>Mint</Button>*/}
          {/*<Button onClick={togglePaymentStatus}>*/}
          {/*  Toggle Payment Status*/}
          {/*</Button>{' '}*/}
          {/*{paid && <div> true </div>}*/}
        </HStack>
      </VStack>
    </>
  );
}
