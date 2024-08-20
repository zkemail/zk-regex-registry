'use client';
import { useContext } from 'react'

import ZkEmailSDKContext from "../contexts/ZkEmailSDK";

const useZkEmailSDK = () => {
  return { ...useContext(ZkEmailSDKContext) }
}

export default useZkEmailSDK