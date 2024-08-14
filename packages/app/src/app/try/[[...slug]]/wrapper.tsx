'use client'
import dynamic from 'next/dynamic'
import { ZkRegexProvider } from '@zk-email/zk-regex-sdk';
import { PageContent, ContentProps } from './content';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/contract';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const queryClient = new QueryClient()

export default dynamic(() => Promise.resolve(TryPage), { ssr: false })

function TryPage(props: ContentProps) {
  return (
    <ZkRegexProvider clientId={GOOGLE_CLIENT_ID} zkRegexRegistryUrl=''>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <PageContent {...props} />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ZkRegexProvider>

  );
};