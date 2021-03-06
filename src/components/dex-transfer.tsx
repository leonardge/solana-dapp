import React, { useState } from "react"
import {
  Button,
  Card,
  CardContent,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from "@material-ui/core"
import { makeStyles } from "@material-ui/core/styles"
import { Market } from '@project-serum/serum';
import { Connection, PublicKey } from "@solana/web3.js"
import { useSolana } from "../context/solana"
// @ts-ignore
import bs58 from "bs58"

const useStyles = makeStyles((theme) => ({
  root: {},
  section: {
    paddingRight: "5px",
    paddingLeft: "5px",
  },
  form: {
    marginTop: "10px"
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120
  },
  selectEmpty: {
    marginTop: theme.spacing(2)
  }
}))

export const TOKEN_PROGRAM_ID = new PublicKey("TokenSVp5gheXUvJ6jGWGeCsgPKgnE3YgdGKRVCMY9o")

type SideType = "buy" | "sell"
type OrderType = "limit" | "ioc" | "postOnly"

export const DexTransfer: React.FC = () => {
  const { accounts, connection, signTransaction } = useSolana()
  const classes = useStyles()

  const [payers, setPayers] = useState<string[]>()

  const [owner, setOwner] = useState("")
  const [payer, setPayer] = useState("")
  const [side, setSide] = useState<SideType>("buy")
  const [orderType, setOrderType] = useState<OrderType>("limit")
  const [size, setSize] = useState<number>(0)
  const [price, setPrice] = useState<number>(0)

  const handleOwnerChange = (event: any) => {
    setOwner(event.target.value)
  }

  const getOwnedAccounts = (accountKey: string, conn: Connection) => {
    const publicKey = new PublicKey(accountKey)
    conn.getTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    }).then(resp => {
      const k = resp.value.map(v => {
        return v.pubkey.toBase58()
      })
      setPayers(k)
    }).catch(err => {
      console.log("Unable to retrieve owner account")
    })
  }


  const handlePlaceOrder = () => {
    if ((owner == undefined) || (payer == undefined)) {
      return
    }
    const ownerKey = new PublicKey(owner)
    const payerKey = new PublicKey(payer)

    placeOrder(ownerKey, payerKey).then(resp => {
      console.log("Response: ", resp)
    }).catch(err => {
      console.log("Err: ", err)
    })
  }

  const placeOrder = async(ownerKey: PublicKey, payerKey: PublicKey) => {
    if (!connection) {
      return
    }

    let marketAddress = new PublicKey("9jghpuDjUjKe6s1sX6kukuNcWAcHFD4cRzApF7UQTCuW");
    let market = await Market.load(connection, marketAddress);
    const { transaction, signers } = await market.makePlaceOrderTransaction<PublicKey>(connection, {
      owner: ownerKey,
      payer: payerKey,
      side,
      price,
      size,
      orderType
    })

    console.log("Transaction: ", transaction)
    connection.getRecentBlockhash("max").then(rep => {
      transaction.recentBlockhash = rep.blockhash
      console.log("Waiting for authorization")
      signTransaction(bs58.encode(transaction.serializeMessage()), ownerKey.toBase58()).then(data => {
        console.log("Waiting for signature")
        transaction.addSignature(ownerKey, bs58.decode(data.result.signature))
        console.log("Sending Transaction")
        connection.sendRawTransaction(transaction.serialize()).then(signature => {
          console.log(signature)
          console.log("Waiting confirmation")
          connection.confirmTransaction(signature, 1).then((status: any) => {
            if (status.err) {
              console.log(`Raw transaction ${signature} failed (${JSON.stringify(status)})`)
              return
            }
            console.log("Confirmation received")
            console.log("" + status.context.slot)
          }).catch(err => {
            console.log("Err: ", err)
          })
        }).catch(err => {
          console.log("Err: ", err)
        })
      }).catch(err => {
        console.log("Err: ", err)
      })
    })
  }

  if (!accounts) {
    return null
  }

  return (
    <Card>
      <CardContent>
        <Grid container>
          <Grid item xs={6} className={classes.section}>
            <h3>Place and order</h3>
            <Grid item xs={12} className={classes.form}>
              <FormControl className={classes.formControl} fullWidth={true}>
                <InputLabel>Owner</InputLabel>
                <Select
                  value={owner}
                  onChange={handleOwnerChange}
                >
                  {accounts.map(account => {
                    return (<MenuItem key={`from-${account}`} value={account}>{account}</MenuItem>)
                  })}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} className={classes.form}>
              <TextField
                variant="outlined"
                fullWidth
                margin="normal"
                label="Payer"
                value={payer}
                onChange={(e) => setPayer(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} className={classes.form}>
              <FormControl className={classes.formControl} fullWidth={true}>
                <InputLabel>Side</InputLabel>
                <Select
                  value={side}
                  onChange={(e) => setSide(e.target.value as SideType)}
                >
                  <MenuItem key={`size-buy`} value={'buy'}>buy</MenuItem>
                  <MenuItem key={`size-sell`} value={'sell'}>sell</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} className={classes.form}>
              <TextField
                variant="outlined"
                fullWidth
                margin="normal"
                label="price"
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} className={classes.form}>
              <TextField
                variant="outlined"
                fullWidth
                margin="normal"
                label="size"
                value={size}
                onChange={(e) => setSize(parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} className={classes.form}>
              <FormControl className={classes.formControl} fullWidth={true}>
                <InputLabel>Order Type</InputLabel>
                <Select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as OrderType)}
                >
                  <MenuItem key={`order-type-limit`} value={'limit'}>limit</MenuItem>
                  <MenuItem key={`order-type-ioc`} value={'ioc'}>ioc</MenuItem>
                  <MenuItem key={`order-type-postOnly`} value={'postOnly'}>postOnly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} className={classes.form}>
              <Button variant="contained"  color="primary" onClick={handlePlaceOrder}>
                Place Order
              </Button>
            </Grid>
          </Grid>
          <Grid item xs={6} className={classes.section}>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}