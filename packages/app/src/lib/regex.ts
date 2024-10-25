import initWasm, { extractSubstr, extractSubstrIdxes } from "@zk-email/relayer-utils";
import fs from "fs";

let wasmLoaded: Promise<boolean>;
const code = fs.readFileSync("node_modules/@zk-email/relayer-utils/relayer_utils_bg.wasm");
wasmLoaded = initWasm({ module_or_path: code }).then(() => {
    return true;
})

export interface Values {
    name: string,
    location: "header" | "body",
    parts: {
        regex_def: string,
        is_public: boolean,
    }[],
}

export function extractMatches(headerString: string, bodyString: string | undefined, values: Values[]) {
    const regexes = values.map((v: any) => {
        let publicGroups: number[] = [];
        let index = 1;
        const regex = v.parts.reduce((acc: any, part: any) => {
            const regexWithoutGroup = part.regex_def.replace("(", "(?:")
            if (part.is_public) {
                publicGroups.push(index);
                index++;
                return acc + "(" + regexWithoutGroup + ")"
            }
            return acc + regexWithoutGroup
        }, "");
        return {
            regex,
            publicGroups,
            name: v.name,
            location: v.location,
        }
    })

    let matches = []

    for (const regex of regexes) {
        if (regex.location == "body" && bodyString) {
            const match = bodyString.match(regex.regex)
            if (match) {
                for (const group of regex.publicGroups) {
                    matches.push({
                        name: regex.name,
                        match: match[group],
                    })
                }
            }
        } else {
            const match = headerString.match(regex.regex)
            if (match) {
                for (const group of regex.publicGroups) {
                    matches.push({
                        name: regex.name,
                        match: match[group],
                    })
                }
            }
        }
    }
    return matches;
}

export async function extractMatchesWasm(headerString: string, bodyString: string | undefined, values: Values[]) {
    await wasmLoaded;
    let matches: {name: string, match: string}[] = [];
    for (const value of values) {
        if (value.location == "body" && bodyString) {
            try {
                let match = extractSubstr(bodyString, value, false)
                if (match.length > 0) {
                    matches = matches.concat(match.map( (m:string) => {
                        return {
                            name: value.name,
                            match: m,
                        }
                    }));
                }
            } catch (e) {
                console.error(e);
            }
        } else {
            try {
                let match = extractSubstr(headerString, value, false)
                if (match.length > 0) {
                    matches = matches.concat(match.map( (m:string) => {
                        return {
                            name: value.name,
                            match: m,
                        }
                    }));
                }
            } catch (e) {
                console.error(e);
            }
        }
    }
    return matches;
}
