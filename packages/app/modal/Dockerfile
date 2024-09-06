# Build circom
FROM rust:1.80-bullseye AS circom-builder
RUN git clone https://github.com/iden3/circom.git && \
    cd circom && \
    cargo build --release


# Main image
FROM node:bullseye-slim

# Copy circom from circom-builder
COPY --from=circom-builder /circom/target/release/circom /usr/local/bin/circom
RUN chmod +x /usr/local/bin/circom

# Install snarkjs
RUN npm install -g snarkjs

# Copy ptau file
COPY powersOfTau28_hez_final_23.ptau /powersOfTau28_hez_final_23.ptau

RUN  apt-get update \
  && apt-get install -y git \
  && rm -rf /var/lib/apt/lists/*