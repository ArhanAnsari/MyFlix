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

function assertEnv() {
  if (!endpoint || !projectId) {
    throw new Error("Missing NEXT_PUBLIC_APPWRITE_ENDPOINT or NEXT_PUBLIC_APPWRITE_PROJECT_ID");
  }
}

export function createPublicClient() {
  assertEnv();

  return new Client().setEndpoint(endpoint!).setProject(projectId!);
}

export function createSessionClient(sessionSecret: string) {
  assertEnv();

  const client = new Client().setEndpoint(endpoint!).setProject(projectId!);
  client.setSession(sessionSecret);

  return client;
}

export function createAdminClient() {
  assertEnv();

  if (!apiKey) {
    throw new Error("Missing APPWRITE_API_KEY");
  }

  return new Client().setEndpoint(endpoint!).setProject(projectId!).setKey(apiKey);
}

export function getPublicAccount() {
  return new Account(createPublicClient());
}

export function getSessionAccount(sessionSecret: string) {
  return new Account(createSessionClient(sessionSecret));
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
