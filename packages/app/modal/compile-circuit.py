import modal
import subprocess
import os
import re
import math
app = modal.App()

base_image = (
    modal.Image.from_registry("javiersuweijie/zk-email-sdk-base:0.0.1", add_python="3.11")
    #install curl
    .run_commands(
        "apt-get update && apt-get install -y curl"
    )
    .run_commands(
        "curl -o /powersOfTau28_hez_final_24.ptau https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_24.ptau"
    )
    .run_commands(
        "curl -o /powersOfTau28_hez_final_22.ptau https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_22.ptau"
    )
)
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
    retries=3,
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
    
    result = subprocess.run(["circom", circuitPath, "--r1cs", "--wasm", "-o", f"/temp_output/{slug}", "-l", "/project/node_modules"], capture_output=True, text=True)
    print(result.stdout)
    print(result.stderr)
    if result.returncode != 0:
        raise Exception("non zero return code, error compiling circuit")

    # find the number of non-linear constraints to determine the power of tau
    non_linear_constraints_match = re.search(r'non-linear constraints: (\d+)', result.stdout)
    if non_linear_constraints_match:
        non_linear_constraints = int(non_linear_constraints_match.group(1))
        print(f"Number of non-linear constraints: {non_linear_constraints}")
    else:
        print("Could not find non-linear constraints in the output")
    power = max(math.ceil(math.log(non_linear_constraints, 2)), 22)

    # check if the power of tau exists
    if not os.path.exists(f"/powersOfTau28_hez_final_{power}.ptau"):
        print(f"Tau of power {power} not found, downloading...")
        subprocess.run(f"curl -o /powersOfTau28_hez_final_{power}.ptau https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_{power}.ptau", check=True, shell=True)

    # generate the zkey
    subprocess.run(f"NODE_OPTIONS='--max-old-space-size=32768' snarkjs zkey new /temp_output/{slug}/{circuitName}.r1cs /powersOfTau28_hez_final_{power}.ptau /temp_output/{slug}/{circuitName}.zkey -v", check=True, shell=True)

    # check if the zkey was created
    if not os.path.exists(f"/temp_output/{slug}/{circuitName}.zkey") or os.path.getsize(f"/temp_output/{slug}/{circuitName}.zkey") == 0:
        raise Exception(f"zkey {circuitName} was not created")
    subprocess.run([f"cp -R /temp_output/* /output/circuit/"], check=True, shell=True)