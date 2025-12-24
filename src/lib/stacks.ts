import { AppConfig, UserSession } from '@stacks/connect';
import { StacksMainnet } from '@stacks/network'; 

export const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });
export const network = new StacksMainnet(); 

export const CONTRACT_ADDRESS = 'SP267C6MQJHPR7297033Z8VSKTJM7M62V375BRHHP';
export const CONTRACT_NAME = 'stxfaucet';