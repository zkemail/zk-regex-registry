import modal
import subprocess
import os
import sys
app = modal.App("create-proof-gpu")

base_image = modal.Image.from_registry("javiersuweijie/prover-gpu:0.0.1-alpha.0")
secret = modal.Secret.from_name(
    "google-storage",
    required_keys=["GOOGLE_ACCESS_KEY_ID", "GOOGLE_ACCESS_KEY_SECRET"]
)

path =  os.environ.get("PROOF_PATH", "")
bucket_name = os.environ.get("BUCKET_NAME", "")

@app.local_entrypoint()
def main():
    slug = os.environ["PROJECT_SLUG"]
    circuitName = os.environ["CIRCUIT_NAME"]
    with open(f"{path}/input.json", "r") as f:
        prove2 = modal.Function.lookup("create-proof-gpu", "prove")
        proof, public = prove2.remote(slug, circuitName, f.read())
        # write return to file
        with open(f"{path}/proof.json", "w") as f:
            f.write(proof)
        with open(f"{path}/public.json", "w") as f:
            f.write(public)

@app.function(
    timeout=3600,
    image=base_image,
    keep_warm=1,
    container_idle_timeout=300,
    gpu="H100",
    volumes={
        "/output": modal.CloudBucketMount(
            bucket_name=bucket_name,
            bucket_endpoint_url="https://storage.googleapis.com",
            secret=secret,
            read_only=True
        )
    },
    )
def prove(slug: str, circuitName: str, input):
    with open(f"input.json", "w") as f:
        f.write(input)

    subprocess.run(["node", f"/output/circuit/{slug}/{circuitName}_js/generate_witness.js", f"/output/circuit/{slug}/{circuitName}_js/{circuitName}.wasm", f"input.json", f"output.wtns"], check=True)
    subprocess.run(["/rapidsnark/package/bin/prover_cuda", f"/output/circuit/{slug}/{circuitName}.zkey", f"output.wtns", f"proof.json", f"public.json"], check=True)

    # read from proof.json and public.json and return them
    with open(f"proof.json", "r") as f:
        proof = f.read()
    with open(f"public.json", "r") as f:
        public = f.read()
    return proof, public