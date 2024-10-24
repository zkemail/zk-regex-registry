// import initWasm, { extractSubstr, extractSubstrIdxes } from "@zk-email/relayer-utils";
// import fs from "fs";

import { extractMatches, extractMatchesWasm } from "@/lib/regex"

// (async () => {
//     const code = fs.readFileSync("node_modules/@zk-email/relayer-utils/relayer_utils_bg.wasm");
//     await initWasm({module_or_path: code});
//     const email = "subject:Congratulations mr x\r\n";
//     const matches = extractSubstr(email, {
//         parts: [
//             {
//                 "is_public": false,
//                 "regex_def": "(\r\n|^)subject:"
//             },
//             {
//                 "is_public": true,
//                 "regex_def": "Congratulations"
//             },
//             {
//                 "is_public": false,
//                 "regex_def": "[^\r]+\r\n"
//             }
//         ]
//     }, false)
//     console.log(matches)
// })()

const matches = extractMatchesWasm("\r\nsubject:Congratulations mr x\r\n", "body", [{
    name: "subject",
    location: "header",
    parts: [
                    {
                        "is_public": false,
                        "regex_def": "(\r\n|^)subject:"
                    },
                    {
                        "is_public": true,
                        "regex_def": "Congratulations"
                    },
                    {
                        "is_public": false,
                        "regex_def": "[^\r]+\r\n"
                    }
                ],
}, {name: "body", location: "body", parts: [
    {
        "is_public": true,
        "regex_def": "body"
    }
]}]).then((matches) => {
    console.log(matches)
})