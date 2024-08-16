export function mapPrefixRegex(parameters: any): any {
    const mappedValues = parameters.values.map((v: { parts: { is_public: boolean, regex_def: string }[] }) => {
        const prefixRegex = getPrefixRegex(v.parts)
        return {
            ...v,
            prefixRegex
        }
    })
    return {
        ...parameters,
        values: mappedValues
    }
}

export function getPrefixRegex(parts: { is_public: boolean, regex_def: string }[]): string {
    let prefixRegex = "";
    for (let part of parts) {
        if (!part.is_public) prefixRegex = prefixRegex + part.regex_def;
        else break;
    }
    if (!prefixRegex) throw new Error('Part has to have start with a regex that is_public = false in order to find it later')
    return JSON.stringify(prefixRegex)
}

export function calculateSignalLength(values: {maxLength: number}[], externalInputs: {maxLength: number}[] = []) {
    const valuesLength = values.reduce((acc, value) => acc + Math.floor(value.maxLength / 31) + (value.maxLength % 31 ? 1 : 0), 1);
    const inputsLength = externalInputs.reduce((acc, value) => acc + Math.floor(value.maxLength / 31) + (value.maxLength % 31 ? 1 : 0), 0);
    return valuesLength + inputsLength;
}