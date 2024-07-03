'use client'
import dynamic from 'next/dynamic'
import { ZkRegexProvider } from 'zk-regex-sdk';
import {PageContent, ContentProps} from './content';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

// const ZkRegexProvider = dynamic(() => import("zk-regex-sdk").then((mod) => mod.ZkRegexProvider), {
//   ssr: false,
// });

export default dynamic(() => Promise.resolve(TryPage), {ssr: false})

function TryPage(props: ContentProps) {
  return (
    <ZkRegexProvider clientId={GOOGLE_CLIENT_ID} zkRegexRegistryUrl=''>
        <PageContent {...props}/>
    </ZkRegexProvider>

  );
};