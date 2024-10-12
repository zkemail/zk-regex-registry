import modal
import subprocess
import os
app = modal.App()

base_image = modal.Image.from_registry("javiersuweijie/zk-email-sdk-base:0.0.1", add_python="3.11")
secret = modal.Secret.from_name(
    "google-storage",
    required_keys=["GOOGLE_ACCESS_KEY_ID", "GOOGLE_ACCESS_KEY_SECRET"]
)
path = os.environ.get("PROJECT_PATH", "")
bucket_name = os.environ.get("BUCKET_NAME", "")

@app.local_entrypoint()
def main():
    slug = os.environ["PROJECT_SLUG"]
    compile_circuit.remote(slug)

@app.function(
    timeout=18000,
    image=base_image,
    volumes={
        "/output": modal.CloudBucketMount(
            bucket_name=bucket_name,
            bucket_endpoint_url="https://storage.googleapis.com",
            secret=secret,
            read_only=False
        )
    },
    mounts=[modal.Mount.from_local_dir(path, remote_path="/project")]
    )
def compile_circuit(slug: str):
    subprocess.run(["yarn", "install"], check=True, cwd="/project")
    ls_result = subprocess.run(["ls /project/circuit/*.circom"], capture_output=True, text=True, check=True, shell=True)
    circuit_files = ls_result.stdout.strip().split('\n')
    if len(circuit_files) > 1:
        circuitPath = next((file for file in circuit_files if file.endswith(f'/{slug}.circom')), circuit_files[0])
    else:
        circuitPath = circuit_files[0]
    circuitName = circuitPath.split("/")[-1].split(".")[0]
    subprocess.run(["mkdir", "-p", f"/temp_output/{slug}"], check=True)
    subprocess.run(["circom", circuitPath, "--r1cs", "--wasm", "-o", f"/temp_output/{slug}", "-l", "/project/node_modules"], check=True)
    subprocess.run(f"NODE_OPTIONS='--max-old-space-size=16000' snarkjs zkey new /temp_output/{slug}/{circuitName}.r1cs /powersOfTau28_hez_final_23.ptau /temp_output/{slug}/{circuitName}.zkey -v", check=True, shell=True)
    subprocess.run([f"cp -R /temp_output/* /output/circuit/"], check=True, shell=True)