## Getting started
This guide will bring you through to submit a new pattern on the registry. You will need to have:
1. An email .eml file that you want to create proofs for
2. Get yourself familiar with the `zk-regex` SDK on how to create a `json` file to generate your circuit
	1. [Link to SDK](https://github.com/zkemail/zk-regex)
	2. [Link to example](https://github.com/zkemail/proof-of-twitter/blob/main/packages/circuits/src/twitter-reset.json) (Proof of Twitter)

## Submitting a pattern

Visit the [submit page](https://registry-dev.zkregex.com/submit) to submit it directly. The following are more explanation on each of the fields
- **Pattern Title, Description**
	- These can be anything
- **Slug**
	- This is the main identifier for your pattern. It must look like the following `<team|user>/<pattern-name>`
- **Tags**
	- This is a comma delimited entry that will help users find your pattern
- **Email Query**
	- This is used by the SDK to find emails directly from the Google inbox. The search query used here would be as if you were searching for an email from your inbox. It should be as specific as possible. (Use `from: example@test.com` if you know who the sender of the email is to help with the search)
- **Circuit Name**
	- This will be used to generate the circuits later on. Essentially, this will affect the file and variable names in the circuit code
- **Skip Body Hash Check**
	- Set this to `true` if the information you want can fully be retrieved from the headers
- **SHA Precompute Selector**
	- Because we want to optimize the number of constraints in the circuit, we can use field to split the email body into two. A hash will be pre-computed for the first half and the second half will be calculated in the circuit itself for verification
	- Make sure the fields you are extracting are in the second half of the split by setting the Selector to a unique string that is before the extracted data
- **Use new ZK Regex SDK for circuit generation**
	- Set this to true to use the new SDK for circuit generation
	- V1 of the SDK uses a javascript implementation that is outdated and uses a different syntax for the fields. You can use the [tool here](https://tool.zkregex.com/) to generate the inputs required to create a pattern
- **Fields to Extract**
	- For each email, you can create a number of fields that you want to be extracted. Each of these will generate a circuit that will be automatically combined in the final circuit.
	- **Field Name**
		- Name of the field and will be used in filename and variables in the code generation
	- **Data Location**
		- Only accepts either `body` or `header`
		- Lets the generator know where to find the field
	- **V2**
		- **Parts** 
			- This is where the json needed by the [zk-regex SDK](https://github.com/zkemail/zk-regex) needs to be set
			- It should look like [this](https://github.com/zkemail/proof-of-twitter/blob/main/packages/circuits/src/twitter-reset.json) 
			- > ```json
			  >	{
			  >		"parts": [
			  >		    {
				>			"is_public": false,
				>			"regex_def": "email was meant for @"
				>		},
				>		{
				>			"is_public": true,
				>			"regex_def": "(a-zA-Z0-9_)+"
				>		}
			  >		]
			  >	}
			  >	```
			- We break down the entire regex into parts and then we can use the `is_public` field to determine if we want to extract the part or not
			- For the twitter example, we want to extract and twitter handle that appears after the `email was meant for @` pattern in the email.
			- The above regex is set as `is_public = false` since we don't actually want to extract it and only want to use it as a means to find the twitter handle.
	- **V1 (Deprecated)**
		- **Regex**
			- Full regex pattern used to extract the values
		- **Prefix Regex**
			- The regex pattern that can match the characters right before the field you are interested in
			- e.g Given a string `email: test@zkemail.com`
				- Regex will be `email: ([a-zA-Z0-9]|@|\.)+`
				- Prefix regex will be `email: ` (with a space at the end)
		- **Reveal States**
			- This field will be provided from the regex tool UI
			- E.g. `[[[22,1],[1,1]]]`
		

## After you submit a pattern

Once a pattern is submitted, it takes around 15 minutes for the circuit and the necessary keys to be created. However, what you can do is to immediately download the example project to test it out locally.

You will see a green tick on the registry home page when the circuit resources have been generated.