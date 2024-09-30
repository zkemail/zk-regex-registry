import modal
import subprocess
import os
app = modal.App()

# dockerfile_image = modal.Image.from_dockerfile(
#     "Dockerfile", 
#     context_mount=modal.Mount.from_local_dir(
#         local_path=".",
#         remote_path=".",
#     ),)

base_image = modal.Image.from_registry("javiersuweijie/zk-email-sdk-base:0.0.1-alpha.2", add_python="3.11")
secret = modal.Secret.from_name(
    "r2-secret",
    required_keys=["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
)
path = os.environ.get("PROJECT_PATH", "")

@app.local_entrypoint()
def main():
    slug = os.environ["PROJECT_SLUG"]
    compile_circuit.remote(slug)

@app.function(
    timeout=3600,
    image=base_image,
    volumes={
        "/output": modal.CloudBucketMount(
            bucket_name="zkemail-sdk-dev",
            bucket_endpoint_url="https://4d4b50e9f5680d7b604782701f84b71c.r2.cloudflarestorage.com",
            secret=secret,
            read_only=False
        )
    },
    mounts=[modal.Mount.from_local_dir(path, remote_path="/project")]
    )
def compile_circuit(slug: str):
    subprocess.run(["yarn", "install"], check=True, cwd="/project")
    ls_result = subprocess.run(["ls /project/circuit/*.circom"], capture_output=True, text=True, check=True, shell=True)
    circuitPath = ls_result.stdout.strip()
    circuitName = circuitPath.split("/")[-1].split(".")[0]
    subprocess.run(["mkdir", "-p", f"/temp_output/{slug}"], check=True)
    subprocess.run(["circom", circuitPath, "--r1cs", "--wasm", "-o", f"/temp_output/{slug}", "-l", "/project/node_modules"], check=True)
    subprocess.run(f"NODE_OPTIONS='--max-old-space-size=16000' snarkjs zkey new /temp_output/{slug}/{circuitName}.r1cs /powersOfTau28_hez_final_23.ptau /temp_output/{slug}/{circuitName}.zkey -v", check=True, shell=True)
    subprocess.run([f"cp -R /temp_output/* /output/circuit/"], check=True, shell=True)