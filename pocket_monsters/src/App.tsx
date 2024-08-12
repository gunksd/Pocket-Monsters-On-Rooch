
import { LoadingButton } from "@mui/lab";
import { Button, Chip, Divider, Stack, Typography } from "@mui/material";
import { Args, Transaction } from "@roochnetwork/rooch-sdk";
import {
  UseSignAndExecuteTransaction,
  useConnectWallet,
  useCreateSessionKey,
  useCurrentAddress,
  useCurrentSession,
  useRemoveSession,
  useRoochClientQuery,
  useWalletStore,
  useWallets,
} from "@roochnetwork/rooch-sdk-kit";
import { useState } from "react";
import "./App.css";
import { shortAddress } from "./utils";

// Publish address of the counter contract
const counterAddress = "0xc884e7019d1f68755ea944efbae61f2292b25c4257ef90bbea61ec1ac4b45e36";

function App() {
  const wallets = useWallets();
  const currentAddress = useCurrentAddress();
  const sessionKey = useCurrentSession();
  const connectionStatus = useWalletStore((state) => state.connectionStatus);
  const setWalletDisconnected = useWalletStore(
    (state) => state.setWalletDisconnected
  );
  const { mutateAsync: connectWallet } = useConnectWallet();

  const { mutateAsync: createSessionKey } = useCreateSessionKey();
  const { mutateAsync: removeSessionKey } = useRemoveSession();
  const { mutateAsync: signAndExecuteTransaction } =
    UseSignAndExecuteTransaction();
  const { data, refetch } = useRoochClientQuery("executeViewFunction", {
    target: `${counterAddress}::bitcoin_monsters::Monster`,
  });
  const [sessionLoading, setSessionLoading] = useState(false);
  const [txnLoading, setTxnLoading] = useState(false);
  const handlerCreateSessionKey = async () => {
    if (sessionLoading) {
      return;
    }
    setSessionLoading(true);

    const defaultScopes = [`${counterAddress}::*::*`];
    createSessionKey(
      {
        appName: "rooch_monster",
        appUrl: "http://localhost:5173",
        maxInactiveInterval: 1000,
        scopes: defaultScopes,
      },
      {
        onSuccess: (result) => {
          console.log("session key", result);
        },
        onError: (why) => {
          console.log(why);
        },
      }
    ).finally(() => setSessionLoading(false));
  };

  return (
    <Stack
      className="font-sans min-w-[1024px]"
      direction="column"
      sx={{
        minHeight: "calc(100vh - 4rem)",
      }}
    >
      <Stack justifyContent="space-between" className="w-full">
        <img src="./rooch_black_combine.svg" width="120px" alt="" />
        <Stack spacing={1} justifyItems="flex-end">
          <Chip
            label="Rooch Testnet"
            variant="filled"
            className="font-semibold !bg-slate-950 !text-slate-50 min-h-10"
          />
          <Button
            variant="outlined"
            onClick={async () => {
              if (connectionStatus === "connected") {
                setWalletDisconnected();
                return;
              }
              await connectWallet({ wallet: wallets[0] });
            }}
          >
            {connectionStatus === "connected"
              ? shortAddress(currentAddress?.genRoochAddress().toStr(), 8, 6)
              : "Connect Wallet"}
          </Button>
        </Stack>
      </Stack>
      <Typography className="text-4xl font-semibold mt-6 text-left w-full mb-4">
        ROOCH Monster | <span className="text-2xl">Pokemon</span>
      </Typography>
      <Divider className="w-full" />
      <Stack
        direction="column"
        className="mt-4 font-medium font-serif w-full text-left"
        spacing={2}
        alignItems="flex-start"
      >
        <Typography className="text-xl">
          Rooch Address:{" "}
          <span className="underline tracking-wide underline-offset-8 ml-2">
            {currentAddress?.genRoochAddress().toStr()}
          </span>
        </Typography>
        <Typography className="text-xl">
          Hex Address:
          <span className="underline tracking-wide underline-offset-8 ml-2">
            {currentAddress?.genRoochAddress().toHexAddress()}
          </span>
        </Typography>
        <Typography className="text-xl">
          Bitcoin Address:
          <span className="underline tracking-wide underline-offset-8 ml-2">
            {currentAddress?.toStr()}
          </span>
        </Typography>
      </Stack>
      <Divider className="w-full !mt-12" />
      <Stack
        className="mt-4 w-full font-medium "
        direction="column"
        alignItems="flex-start"
      >
        <Typography className="text-3xl font-bold">Session Key</Typography>
        {/* <Typography className="mt-4">
          Status: Session Key not created
        </Typography> */}
        <Stack
          className="mt-4 text-left"
          spacing={2}
          direction="column"
          alignItems="flex-start"
        >
          <Typography className="text-xl">
            Session Rooch address:{" "}
            <span className="underline tracking-wide underline-offset-8 ml-2">
              {sessionKey?.getRoochAddress().toStr()}
            </span>
          </Typography>
          <Typography className="text-xl">
            Key scheme:{" "}
            <span className="underline tracking-wide underline-offset-8 ml-2">
              {sessionKey?.getKeyScheme()}
            </span>
          </Typography>
          <Typography className="text-xl">
            Create time:{" "}
            <span className="underline tracking-wide underline-offset-8 ml-2">
              {sessionKey?.getCreateTime()}
            </span>
          </Typography>
        </Stack>
        {!sessionKey ? (
          <LoadingButton
            loading={sessionLoading}
            variant="contained"
            className="!mt-4"
            disabled={connectionStatus !== "connected"}
            onClick={() => {
              handlerCreateSessionKey();
            }}
          >
            {connectionStatus !== "connected"
              ? "Please connect wallet first"
              : "Create"}
          </LoadingButton>
        ) : (
          <Button
            variant="contained"
            className="!mt-4"
            onClick={() => {
              removeSessionKey({ authKey: sessionKey.getAuthKey() });
            }}
          >
            Clear Session
          </Button>
        )}
      </Stack>
      <Divider className="w-full !mt-12" />
      <Stack
        className="mt-4 w-full font-medium "
        direction="column"
        alignItems="flex-start"
      >
        <Typography className="text-3xl font-bold">
          dApp integration
          <span className="text-base font-normal ml-4">({counterAddress})</span>
        </Typography>
        <Stack
          className="mt-4"
          spacing={2}
          direction="column"
          alignItems="flex-start"
        >
          <Typography className="text-xl">
          <LoadingButton
            loading={txnLoading}
            variant="contained"
            fullWidth
            disabled={!sessionKey}
            onClick={async () => {
              try {
                setTxnLoading(true);
                const txn = new Transaction();
                txn.callFunction({
                  address: counterAddress,
                  module: "monsters",
                  function: "get_monster_permanent_state",
                  args: [Args.u256(ObjectID)],
                }),
                    await signAndExecuteTransaction({ transaction: txn });
                    await refetch();
                  } catch (error) {
                    console.error(String(error));
                  } finally {
                    setTxnLoading(false);
                  }
                }}
          >
            {sessionKey
              ? "monster data"
              : "Please create Session Key first"}
          </LoadingButton>
            Monster data:
            <div className="ml-2">
              
              {data?.return_values?.[0] && (
                <>
                  <Typography>Variety: </Typography>
                  <Typography>Level: </Typography>
                  <Typography>Experience: </Typography>
                  <Typography>Health: </Typography>
                  <Typography>
                    Last Training Time:{" "}
                  .toLocaleString()
                  </Typography>
                  <Typography>Wins: </Typography>
                  <Typography>Losses: </Typography>
                  <Typography>Achievement: </Typography>
                </>
              )}
              {!data?.return_values?.[0] && (
                <Typography>No monster data available.</Typography>
              )}
            </div>
          </Typography>

          <LoadingButton
            loading={txnLoading}
            variant="contained"
            fullWidth
            disabled={!sessionKey}
            onClick={async () => {
              try {
                setTxnLoading(true);
                const txn = new Transaction();
                txn.callFunction({
                  address: counterAddress,
                  module: "monsters",
                  function: "mint_monster",
                  args: [],
                }),
                    await signAndExecuteTransaction({ transaction: txn });
                    await refetch();
                  } catch (error) {
                    console.error(String(error));
                  } finally {
                    setTxnLoading(false);
                  }
                }}
          >
            {sessionKey
              ? "Mint monster"
              : "Please create Session Key first"}
          </LoadingButton>

            {/* Train Monster Button */}
    <LoadingButton
      loading={txnLoading}
      variant="contained"
      fullWidth
      disabled={!sessionKey}
      onClick={async () => {
        try {
          setTxnLoading(true);
          const txn = new Transaction();
          txn.callFunction({
            address: counterAddress,
            module: "monsters",
            function: "train_monster",
            args: [],
          });
          const result = await signAndExecuteTransaction({ transaction: txn });

          // Assuming the result contains the return data
          const mintedMonsterData = result as unknown as string;
          console.log("Minted Monster Data:", mintedMonsterData);
          await signAndExecuteTransaction({ transaction: txn });
          await refetch();
        } catch (error) {
          console.error(String(error));
        } finally {
          setTxnLoading(false);
        }
      }}
    >
      {sessionKey ? "Train monster" : "Please create Session Key first"}
    </LoadingButton>

    {/* Harvest Monster Button */}
    <LoadingButton
      loading={txnLoading}
      variant="contained"
      fullWidth
      disabled={!sessionKey}
      onClick={async () => {
        try {
          setTxnLoading(true);
          const txn = new Transaction();
          txn.callFunction({
            address: counterAddress,
            module: "monsters",
            function: "harvest_monster",
            args: [],
          });
          await signAndExecuteTransaction({ transaction: txn });
          await refetch();
        } catch (error) {
          console.error(String(error));
        } finally {
          setTxnLoading(false);
        }
      }}
    >
      {sessionKey ? "Harvest monster" : "Please create Session Key first"}
    </LoadingButton>
        </Stack>
      </Stack>
    </Stack>
  );
}

export default App;
