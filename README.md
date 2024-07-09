## Introduction

ZK Regex Registry is an app that pools together all community created ZK Regex patterns (most for ZK Email use-cases). Project is funded by the [zk-email team](https://github.com/zkemail).

## Examples

**Home Screen**
![home screen](./assets/main-page.png)

**Try out the pattern**
![try page](./assets/try-page.png)

## Features

- Users can upload ZK Regex Patterns using a simple JSON formatted markup (see [example](./assets/proof-of-twitter.json))
- Users can test their ZK Email Regex Patterns directly on the UI (with the option of directly pulling emails privately from their Google accounts)
- App generates the circom circuit and an example project for testing
- App generates the assets required for proving (e.g. r1cs, wasm, zkey, vkey) and provides an API to download them
- Includes a React SDK to embed into your application for proof generation (see [SDK](./packages/sdk))

## Project Structure

```
root
--- packages
------- app (NextJS application for the registry frontend)
------- sdk (React SDK)
--- scripts (Some helper scripts to help with testing)
```


## Getting Started

Copy and rename the environment variables
```bash
cp .env.local.exmaple .env.local
# update the .env.local file
export $(cat .env.local | xargs)
```

```bash
DATABASE_URL=postgres://postgres:password@0.0.0.0:5432/myapp
# Secret token used for admin endpoints
SECRET_TOKEN=zkregexregistry
# Gmail client ID for Oauth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
# Full path to the output dir that will store generated code and circuit
GENERATED_OUTPUT_DIR=
# Path to the ptau file used for circuit generation
PTAU_PATH=
```

Run the database and seed it

```bash
# Using docker compose is the easiest
docker compose up -d db
yarn tsx prisma/seed.ts
```

Second, run the development server:

```bash
cd packages/app
yarn install
yarn dev
```

Third, run the proof worker

```bash
yarn proof-gen
```

Lastly, run the circuit generator

```bash
yarn circuit-gen
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


