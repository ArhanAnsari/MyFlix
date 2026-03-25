import {
  Account,
  Client,
  Databases,
  Functions,
  Storage,
  Users,
} from "node-appwrite";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
const apiKey = process.env.APPWRITE_API_KEY;
const allowSelfSigned =
  process.env.APPWRITE_SELF_SIGNED === "1" ||
  process.env.APPWRITE_SELF_SIGNED === "true";

function assertEnv() {
  if (!endpoint || !projectId) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  }
}

function createBaseClient() {
  const client = new Client().setEndpoint(endpoint!).setProject(projectId!);

  if (allowSelfSigned) {
    client.setSelfSigned(true);
  }

  return client;
}

export function createPublicClient() {
  assertEnv();

  return createBaseClient();
}

export function createSessionClient(sessionSecret: string) {
  assertEnv();

  const client = createBaseClient();
  client.setSession(sessionSecret);

  return client;
}

export function createAdminClient() {
  assertEnv();

  if (!apiKey) {
    throw new Error("Missing APPWRITE_API_KEY");
  }

  return createBaseClient().setKey(apiKey);
}

export function getPublicAccount() {
  return new Account(createPublicClient());
}

export function getSessionAccount(sessionSecret: string) {
  console.log('[APPWRITE] getSessionAccount called with sessionSecret length:', sessionSecret?.length);
  
  const client = createSessionClient(sessionSecret);
  console.log('[APPWRITE] Created session client');
  
  return new Account(client);
}

export function getAdminDatabases() {
  return new Databases(createAdminClient());
}

export function getAdminStorage() {
  return new Storage(createAdminClient());
}

export function getAdminFunctions() {
  return new Functions(createAdminClient());
}

export function getAdminUsers() {
  return new Users(createAdminClient());
}
