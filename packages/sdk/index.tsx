'use client';
import GoogleAuthProvider from "./src/providers/GoogleAuthProvider";
import GoogleAuthContext from "./src/contexts/GoogleAuth";
import ZKEmailSDKContext, { ProofStatus } from "./src/contexts/ZkEmailSDK";
import useGoogleAuth from "./src/hooks/useGoogleAuth";
import { fetchEmailList, fetchEmailsRaw, fetchProfile } from "./src/hooks/useGmailClient";
import { ReactNode, useState, useEffect } from "react";
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
  const [inputWorkersPromises, setInputWorkersPromises] = useState<Record<string, Promise<Worker>>>({});
  const [proofStatus, setProofStatus] = useState<Record<string, ProofStatus>>({});

  function createInputWorker(name: string): void {
      const workerPromise = fetch(`${zkEmailSDKRegistryUrl}/api/script/circuit_input/${name}`, {headers: {
        'Accept': 'text/javascript'
      }}).then(async r => {
        const js = await r.text();
        const w = new Worker(`data:text/javascript;base64,${encode(js)}`)
        setInputWorkers({...inputWorkers, [name]: w});
        return w;
      })
      setInputWorkersPromises({...inputWorkersPromises, [name]: workerPromise});
  }

  useEffect(() => {
    if (Object.keys(proofStatus).length > 0) {
      console.log("saving proofs", proofStatus);
      const proofs = localStorage.getItem("proofs");
      const parsedProofs = proofs ? JSON.parse(proofs) as Record<string, ProofStatus> : {};
      const newProofs = {...parsedProofs, ...proofStatus};
      localStorage.setItem("proofs", JSON.stringify(newProofs));
    }
  }, [proofStatus]);

  function loadProofsFromStorage(name: string): void {
    const proofs = localStorage.getItem("proofs");
    if (proofs) {
      const parsedProofs = JSON.parse(proofs) as Record<string, ProofStatus>;
      // filter out proofs that don't belong to the current slug
      const filteredProofs = Object.entries(parsedProofs)
        .filter(([_, proof]) => proof.slug === name)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}) as Record<string, ProofStatus>;
      console.log(filteredProofs);
      setProofStatus(filteredProofs);
      for (const id of Object.keys(filteredProofs)) {
        const proof = filteredProofs[id];
        if (!["COMPLETED", "ERROR"].includes(proof.status)) {
          poolForProofStatus(name, proof.pollUrl)
        }
      }
    }
  }

  function deleteProofFromStorage(id: string) {
    const proofs = localStorage.getItem("proofs");
    if (proofs) {
      const parsedProofs = JSON.parse(proofs) as Record<string, ProofStatus>;
      delete parsedProofs[id];
      localStorage.setItem("proofs", JSON.stringify(parsedProofs));
    }
    setProofStatus((prev) => {
      const newProofStatus = {...prev};
      delete newProofStatus[id];
      return newProofStatus;
    });
  }

  function saveProofStatus(name: string, data: ProofStatus) {
    setProofStatus((prev) => ({...prev, [data.id]:{...data, slug: name}}));
  }

  async function generateInputFromEmail(name: string, email: string, externalInputs: Record<string, string>) {
      let worker = inputWorkers[name];
      // If worker has not been loaded, wait for it to load
      if (!worker) {
        worker = await inputWorkersPromises[name];
      }
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
    
    if (data.pollUrl) {
      poolForProofStatus(name, data.pollUrl)
    }
    return data;
  }

  async function poolForProofStatus(name: string, url: string) {
    const res = await fetch(zkEmailSDKRegistryUrl + url);
    const data = await res.json();
    saveProofStatus(name, data);
    if (data.status !== 'COMPLETED') {
      setTimeout(() => poolForProofStatus(name, url), 5000);
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
    loadProofsFromStorage,
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
    deleteProofFromStorage,
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