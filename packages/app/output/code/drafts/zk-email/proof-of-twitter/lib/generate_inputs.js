const { generateEmailVerifierInputs, packBytesIntoNBytes } = require("@zk-email/helpers");

export async function generateCircuitInputs(rawEmail, inputs) {
    const circuitInputs = await generateEmailVerifierInputs(rawEmail, {
        ignoreBodyHashCheck: false,
        maxBodyLength: 4032,
        maxHeadersLength: 1024,
        shaPrecomputeSelector: ">Not my account<",
    });

    const emailBodyString = circuitInputs.emailBody ? Buffer.from(circuitInputs.emailBody.map(Number)).toString('ascii') : null;
    const emailHeaderString = circuitInputs.emailHeader ? Buffer.from(circuitInputs.emailHeader.map(Number)).toString('ascii') : null;
    let regexInputs = {};
    
    {
    
        const match = emailBodyString.match(new RegExp("email was meant for @"))
    
        if (match) {
            regexInputs = {
                ...regexInputs,
                handleRegexIdx: match.index + match[0].length
            }
        } else {
            throw new Error(`Did not find a match for handle in the email sample`)
        }
    }
    

    const packedInputs = {};

    

    return {
        ...circuitInputs,
        ...regexInputs,
        ...packedInputs
    }
}