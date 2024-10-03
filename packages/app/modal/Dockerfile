# Build circom
FROM rust:1.80-bullseye AS circom-builder
RUN git clone https://github.com/iden3/circom.git && \
    cd circom && \
    cargo build --release

RUN curl -s -L https://github.com/foundry-rs/foundry/releases/download/nightly-471e4ac317858b3419faaee58ade30c0671021e0/foundry_nightly_linux_amd64.tar.gz | tar -zxvf - -C /

# Main image
FROM node:bullseye-slim

# Copy circom from circom-builder
COPY --from=circom-builder /circom/target/release/circom /usr/local/bin/circom
RUN chmod +x /usr/local/bin/circom

COPY --from=circom-builder /forge /usr/local/bin/forge
RUN chmod +x /usr/local/bin/forge

# Install snarkjs
RUN npm install -g snarkjs

# Copy ptau file
COPY powersOfTau28_hez_final_23.ptau /powersOfTau28_hez_final_23.ptau

RUN  apt-get update \
  && apt-get install -y git \
  && rm -rf /var/lib/apt/lists/*

COPY build-contract.sh /build-contract.sh
RUN chmod +x /build-contract.sh

COPY deploy-contract.sh /deploy-contract.sh
RUN chmod +x /deploy-contract.sh