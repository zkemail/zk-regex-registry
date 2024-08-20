'use client';
import GoogleAuthProvider from "./src/providers/GoogleAuthProvider";
import GoogleAuthContext from "./src/contexts/GoogleAuth";
import ZKEmailSDKContext, { ProofStatus } from "./src/contexts/ZkEmailSDK";
import useGoogleAuth from "./src/hooks/useGoogleAuth";
import { fetchEmailList, fetchEmailsRaw, fetchProfile } from "./src/hooks/useGmailClient";
import { ReactNode, useState } from "react";
import { GoogleOAuthProvider } from '@react-oauth/google';
// import React from "react";
import useZkEmailSDK from './src/hooks/useZkEmailSDK';
import { encode } from 'js-base64';

interface ProvidersProps {
  children: ReactNode;
  clientId: string;
  zkEmailSDKRegistryUrl: string;
}

function ZkEmailSDKProvider({children, clientId, zkEmailSDKRegistryUrl}: ProvidersProps) {

  const [inputWorkers, setInputWorkers] = useState<Record<string, Worker>>({});
  const [proofStatus, setProofStatus] = useState<Record<string, ProofStatus>>({});

  function createInputWorker(name: string): void {
      fetch(`${zkEmailSDKRegistryUrl}/api/script/circuit_input/${name}`, {headers: {
        'Accept': 'text/javascript'
      }}).then(async r => {
        const js = await r.text();
        const w = new Worker(`data:text/javascript;base64,${encode(js)}`)
        setInputWorkers({...inputWorkers, [name]: w});
      })
  }

  async function generateInputFromEmail(name: string, email: string, externalInputs: Record<string, string>) {
      const worker = inputWorkers[name];
      return new Promise((resolve, reject) => {
        worker.onmessage = (event: any) => {
          if (event.data.error) {
            reject(event.data.error);
          } else {
            resolve(event.data);
          }
        }

        worker.postMessage({
          rawEmail: email,
          inputs: externalInputs
        });
      });
  }

  async function generateProofRemotely(name: string, input: any) {
    const res = await fetch(`${zkEmailSDKRegistryUrl}/api/proof/${name}`, {
      method: 'POST',
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    setProofStatus((prev) => ({...prev, [data.id]:data}));
    if (data.pollUrl) {
      poolForProofStatus(data.pollUrl)
    }
    return data;
  }

  async function poolForProofStatus(url: string) {
    const res = await fetch(zkEmailSDKRegistryUrl + url);
    const data = await res.json();
    setProofStatus((prev) => ({...prev, [data.id]:data}));
    if (data.status !== 'COMPLETED') {
      setTimeout(() => poolForProofStatus(url), 5000);
    } 
  }

  const contextValues = {
    zkEmailSDKRegistryUrl,
    customInputGenWorkerSrc: {},
    inputWorkers,
    createInputWorker,
    deleteInputWorker: function (name: string): void {
      inputWorkers[name].terminate();
      delete inputWorkers[name];
    },
    generateInputFromEmail,
    customProofGenWorkerSrc: {},
    proofWorkers: {},
    createProofWorker: function (_name: string): void {
      throw new Error("Function not implemented.");
    },
    deleteProofWorker: function (_name: string): void {
      throw new Error("Function not implemented.");
    },
    generateProofLocally: async function (_name: string, _input: any): Promise<any> {
      throw new Error("Function not implemented.");
    },
    proofStatus,
    generateProofRemotely,
  } 


  return (
    <ZKEmailSDKContext.Provider value={contextValues}>
      <GoogleOAuthProvider clientId={clientId}>
        <GoogleAuthProvider>
          {children}
        </GoogleAuthProvider>
      </GoogleOAuthProvider>
    </ZKEmailSDKContext.Provider>
  );
}

export { ZkEmailSDKProvider, GoogleAuthContext, useGoogleAuth, fetchEmailList, fetchEmailsRaw, fetchProfile, useZkEmailSDK }