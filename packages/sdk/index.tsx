'use client';
import GoogleAuthProvider from "./src/providers/GoogleAuthProvider";
import GoogleAuthContext from "./src/contexts/GoogleAuth";
import ZkRegexContext from "./src/contexts/ZkRegex";
import useGoogleAuth from "./src/hooks/useGoogleAuth";
import { fetchEmailList, fetchEmailsRaw, fetchProfile } from "./src/hooks/useGmailClient";
import { ReactNode, useState } from "react";
import { GoogleOAuthProvider } from '@react-oauth/google';
// import React from "react";
import useZkRegex from './src/hooks/useZkRegex';

interface ProvidersProps {
    children: ReactNode;
    clientId: string;
    zkRegexRegistryUrl: string;
  }

function ZkRegexProvider({children, clientId, zkRegexRegistryUrl}: ProvidersProps) {

  const [inputWorkers, setInputWorkers] = useState<Record<string, Worker>>({});

  const contextValues = {
    zkRegexRegistryUrl,
    customInputGenWorkerSrc: {},
    inputWorkers,
    createInputWorker: function (name: string): void {
      const w = new Worker(`${zkRegexRegistryUrl}/api/script/${name}/circuit_input`)
      setInputWorkers({...inputWorkers, [name]: w});
    },
    deleteInputWorker: function (_name: string): void {
      throw new Error("Function not implemented.");
    },
    generateInputFromEmail: function (name: string, email: string): Promise<any> {
      const worker = inputWorkers[name];
      // TODO: handle failure
      return new Promise((resolve) => {
        worker.onmessage = (event) => {
          resolve(event.data);
        }
        worker.postMessage(email);
      });
    },
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
    generateProofRemotely: async function (_name: string, _input: any): Promise<any> {
      throw new Error("Function not implemented.");
    }
  } 


  return (
    <ZkRegexContext.Provider value={contextValues}>
      <GoogleOAuthProvider clientId={clientId}>
        <GoogleAuthProvider>
          {children}
        </GoogleAuthProvider>
      </GoogleOAuthProvider>
    </ZkRegexContext.Provider>
  );
}

export { ZkRegexProvider, GoogleAuthContext, useGoogleAuth, fetchEmailList, fetchEmailsRaw, fetchProfile, useZkRegex }