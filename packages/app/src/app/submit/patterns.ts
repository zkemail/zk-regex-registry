export const FromAddressPattern = [
    {
        "is_public": false,
        "regex_def": "(\r\n|^)from:"
    },
    {
        "is_public": false,
        "regex_def": "([^\r\n]+<)?"
    },
    {
        "is_public": true,
        "regex_def": "[A-Za-z0-9!#$%&'\\*\\+-/=\\?\\^_`{\\|}~\\.]+@[A-Za-z0-9\\.-]+"
    },
    {
        "is_public": false,
        "regex_def": ">?\r\n"
    }
];

export const ToAddressPattern = [
    {
        "is_public": false,
        "regex_def": "(\r\n|^)to:"
    },
    {
        "is_public": false,
        "regex_def": "([^\r\n]+<)?"
    },
    {
        "is_public": true,
        "regex_def": "[a-zA-Z0-9!#$%&'\\*\\+-/=\\?\\^_`{\\|}~\\.]+@[a-zA-Z0-9_\\.-]+"
    },
    {
        "is_public": false,
        "regex_def": ">?\r\n"
    }
]

export const SubjectPattern = [
    {
        "is_public": false,
        "regex_def": "(\r\n|^)subject:"
    },
    {
        "is_public": true,
        "regex_def": "[^\r\n]+"
    },
    {
        "is_public": false,
        "regex_def": "\r\n"
    }
]

export const TimestampPattern = [
    {
        "is_public": false,
        "regex_def": "(\r\n|^)dkim-signature:"
    },
    {
        "is_public": false,
        "regex_def": "([a-z]+=[^;]+; )+t="
    },
    {
        "is_public": true,
        "regex_def": "[0-9]+"
    },
    {
        "is_public": false,
        "regex_def": ";"
    }
]