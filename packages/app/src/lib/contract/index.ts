import { foundry, mainnet, sepolia } from 'wagmi/chains'
import {
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet
} from '@rainbow-me/rainbowkit/wallets';
import { toHex } from 'viem';
import { Entry } from '@prisma/client';

export const config = getDefaultConfig({
  appName: 'ZK Email SDK Regsitry',
  projectId: '7a5727ef2bfa0be0186ec17111b106b0',
  chains: [sepolia, foundry],
  wallets: [{groupName: 'default', wallets: [metaMaskWallet, rabbyWallet, rainbowWallet]}],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

// {"pi_a":["18823600982900455799755347420572790037829184701205983728877120600994927770367","18205063945252002465231427776883664448173277590109420540084235150695604909468","1"],"pi_b":[["9881962342551356594522442298889408314198015639690995283579149196741106695747","17594243070187730299197901207795542411273378917047827149202792774329078313842"],["3491606102605535074464193608486121614942046492318034783050070249017220125583","10623161201835216789714173915507719140704835227778281981938195960112033454144"],["1","0"]],"pi_c":["16219701023440494414323838569329468941392591647242247646808664878891469365695","10422467417159283176071657279619056381824715201734892971596530361777745572435","1"],"protocol":"groth16","curve":"bn128"}	
// ["486878144103242212975355639451178202062333697994160184234596740703313240994","2261886304000819244244078416786424894114265136","0","0","2658540564146416396497054955123500246525307603180602221906","0","0"]

type Proof = {
  proof: {
    pi_a: string[2]
    pi_b: string[2][2]
    pi_c: string[2]
  };
  public: string[]
}

export const circuitOutputToArgs = (output: Proof) => {
  return [
    [toHex(BigInt(output.proof.pi_a[0])), toHex(BigInt(output.proof.pi_a[1]))],
    [[toHex(BigInt(output.proof.pi_b[0][1])), toHex(BigInt(output.proof.pi_b[0][0]))], [toHex(BigInt(output.proof.pi_b[1][1])), toHex(BigInt(output.proof.pi_b[1][0]))]],
    [toHex(BigInt(output.proof.pi_c[0])), toHex(BigInt(output.proof.pi_c[1]))],
    output.public.map(x => toHex(BigInt(x)))
  ]
}

function bytesToString(bytes:Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function packedNBytesToString(packedBytes: bigint[], n = 31) {
  const chars = [];
  for (let i = 0; i < packedBytes.length; i++) {
      for (let k = BigInt(0); k < n; k++) {
          chars.push(Number((packedBytes[i] >> (k * BigInt(8))) % BigInt(256)));
      }
  }
  return bytesToString(Uint8Array.from(chars));
}

export const parseOutput = (entry: Entry, output: string[]) => {
  let i = 1;
  let result = {}
  if (!entry.parameters) {
    return result;
  }
  for (const value of (entry.parameters as any).values || []) {
    const packLength = Math.floor(value.maxLength / 31) + (value.maxLength % 31 ? 1 : 0);
    const data = output.slice(i, i+packLength);
    const unpackedValue = packedNBytesToString(data.map(BigInt)).replaceAll('\u0000', '');
    i += packLength;
    result = {
      ...result,
      [value.name]: unpackedValue
    }
  }
  for (const value of (entry.parameters as any).externalInputs || []) {
    const packLength = Math.floor(value.maxLength / 31) + (value.maxLength % 31 ? 1 : 0);
    const data = output.slice(i, i+packLength);
    const unpackedValue = packedNBytesToString(data.map(BigInt)).replaceAll('\u0000', '');
    i += packLength;
    result = {
      ...result,
      [value.name]: unpackedValue
    }
  }
  return result;
}