interface Env {
    SECRET_TOKEN: string
}

export let ENV: Env;

(() => {
    if (!process.env.SECRET_TOKEN) {
        throw new Error('envar SECRET_TOKEN is required');
    }
    ENV = {
        SECRET_TOKEN: process.env.SECRET_TOKEN
    }
})()