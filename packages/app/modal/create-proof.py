import modal
import subprocess
import os
import sys
app = modal.App()

base_image = modal.Image.from_registry("node:bullseye-slim", add_python="3.11").run_commands(["npm install -g snarkjs"])
secret = modal.Secret.from_name(
    "r2-secret",
    required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
)
path =  os.environ["PROOF_PATH"]

@app.local_entrypoint()
def main():
    slug = os.environ["PROJECT_SLUG"]
    circuitName = os.environ["CIRCUIT_NAME"]
    proof, public = prove.remote(slug, circuitName)
    # write return to file
    with open(f"{path}/proof.json", "w") as f:
        f.write(proof)
    with open(f"{path}/public.json", "w") as f:
        f.write(public)

@app.function(
    timeout=3600,
    image=base_image,
    volumes={
        "/output": modal.CloudBucketMount(
            bucket_name="zkemail-sdk-dev",
            bucket_endpoint_url="https://4d4b50e9f5680d7b604782701f84b71c.r2.cloudflarestorage.com",
            secret=secret,
            read_only=True
        )
    },
    mounts=[modal.Mount.from_local_dir(path, remote_path="/proof")]
    )
def prove(slug: str, circuitName: str):
    subprocess.run(["node", f"/output/circuit/{slug}/{circuitName}_js/generate_witness.js", f"/output/circuit/{slug}/{circuitName}_js/{circuitName}.wasm", f"/proof/input.json", f"/proof/output.wtns"], check=True)
    subprocess.run(["snarkjs", "groth16", "prove", f"/output/circuit/{slug}/{circuitName}.zkey", "/proof/output.wtns", "/proof/proof.json", "/proof/public.json"], check=True)

    # read from proof.json and public.json and return them
    with open(f"/proof/proof.json", "r") as f:
        proof = f.read()
    with open(f"/proof/public.json", "r") as f:
        public = f.read()
    return proof, public