import modal
import subprocess
import os
import sys
import json
app = modal.App()

base_image = modal.Image.from_registry("javiersuweijie/zk-email-sdk-base:0.0.1", add_python="3.11")
secret = modal.Secret.from_name(
    "google-storage",
    required_keys=["GOOGLE_ACCESS_KEY_ID", "GOOGLE_ACCESS_KEY_SECRET"]
)

path = os.environ.get("CONTRACT_PATH", "")
bucket_name = os.environ.get("BUCKET_NAME", "")

@app.local_entrypoint()
def main():
    env = os.environ.copy()
    log = prove.remote(env)
    # write to contract path
    with open(f"{path}/contract-deploy.json", "w") as f:
        json.dump(log, f)

@app.function(
    timeout=3600,
    image=base_image,
    volumes={
        "/output": modal.CloudBucketMount(
            bucket_name=bucket_name,
            bucket_endpoint_url="https://storage.googleapis.com",
            secret=secret,
            read_only=True
        )
    },
    mounts=[modal.Mount.from_local_dir(path, remote_path="/contract")]
    )
def prove(env):
    slug = env["PROJECT_SLUG"]
    private_key = env["PRIVATE_KEY"]
    rpc_url = env["RPC_URL"]
    chain_id = env["CHAIN_ID"]
    dkim_registry = env["DKIM_REGISTRY"]
    circuit_name = env["CIRCUIT_NAME"]
     
    print(env)

    print(f"Exporting solidity verifier for {slug}/{circuit_name}")
    subprocess.run(["snarkjs", "zkey", "export", "solidityverifier", f"/output/circuit/{slug}/{circuit_name}.zkey", "/contract/src/verifier.sol"], check=True)

    print(f"Deploying contract for {slug}/{circuit_name}")
    subprocess.run(["/deploy-contract.sh", f"/contract", rpc_url, chain_id], check=True, env=env)

    with open(f"/contract/broadcast/Deploy.s.sol/{chain_id}/run-latest.json", "r") as f:
        data = json.load(f)
        return data